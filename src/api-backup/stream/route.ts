import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

// IN-MEMORY URL CACHE (Stores extracted stream URLs for 2 hours)
const urlCache = new Map<string, { url: string; expiresAt: number }>();

function extractVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|^)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

function nodeToWebStream(nodeStream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) =>
        controller.enqueue(new Uint8Array(chunk)),
      );
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err: Error) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

// 1. FAST DIRECT M4A/AUDIO URL RESOLVER
async function getDirectAudioUrl(youtubeUrl: string): Promise<string | null> {
  try {
    const cmd = `yt-dlp -g -f "140/ba[ext=m4a]/ba" --no-playlist --no-warnings --extractor-args "youtube:player_client=ios,mweb" "${youtubeUrl}"`;
    // Increased timeout to 7000ms so Step 1 completes (~4s) instead of getting killed
    const { stdout } = await execAsync(cmd, { timeout: 7000 });
    const directUrl = stdout.trim().split("\n")[0];
    if (directUrl && directUrl.startsWith("http")) {
      return directUrl;
    }
  } catch {
    // Failover
  }
  return null;
}

// 2. STDIN/STDOUT YT-DLP FALLBACK STREAMER
function streamViaYtDlp(youtubeUrl: string): Response {
  const proc = spawn("yt-dlp", [
    "-f",
    "ba/ba*",
    "--no-playlist",
    "-o",
    "-",
    youtubeUrl,
  ]);

  const webStream = nodeToWebStream(proc.stdout);

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "audio/webm", // Standard container for stdout yt-dlp audio
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("id");

  if (!rawId) {
    return NextResponse.json(
      { error: "Missing 'id' parameter" },
      { status: 400 },
    );
  }

  const videoId = extractVideoId(rawId);
  if (!videoId) {
    return NextResponse.json(
      { error: "Invalid Video ID provided" },
      { status: 400 },
    );
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // STEP 1: Attempt fast URL extraction (Checks cache first)
  let streamUrl: string | null = null;
  const cached = urlCache.get(videoId);

  if (cached && cached.expiresAt > Date.now()) {
    streamUrl = cached.url;
  } else {
    streamUrl = await getDirectAudioUrl(youtubeUrl);
    if (streamUrl) {
      urlCache.set(videoId, {
        url: streamUrl,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000, // 2-hour cache
      });
    }
  }

  if (streamUrl) {
    try {
      const rangeHeader = request.headers.get("range");
      const proxyHeaders: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
      };
      if (rangeHeader) {
        proxyHeaders["Range"] = rangeHeader;
      }

      const audioRes = await fetch(streamUrl, {
        headers: proxyHeaders,
        signal: AbortSignal.timeout(6000),
      });

      const rawContentType = audioRes.headers.get("content-type") || "";

      // Ensure response is actually audio binary, not an HTML error or JSON string
      const isMedia =
        audioRes.ok &&
        !rawContentType.includes("text/html") &&
        !rawContentType.includes("application/json") &&
        !rawContentType.includes("text/plain");

      if (isMedia) {
        const responseHeaders = new Headers();

        // Dynamically detect or fall back to native audio types
        let finalContentType = rawContentType;
        if (!finalContentType || finalContentType.includes("octet-stream")) {
          finalContentType =
            streamUrl.includes(".m4a") || streamUrl.includes("mime=audio%2Fmp4")
              ? "audio/mp4"
              : "audio/webm";
        }

        responseHeaders.set("Content-Type", finalContentType);
        responseHeaders.set("Accept-Ranges", "bytes");
        responseHeaders.set(
          "Cache-Control",
          "no-cache, no-store, must-revalidate",
        );

        if (audioRes.headers.get("content-length")) {
          responseHeaders.set(
            "Content-Length",
            audioRes.headers.get("content-length")!,
          );
        }
        if (audioRes.headers.get("content-range")) {
          responseHeaders.set(
            "Content-Range",
            audioRes.headers.get("content-range")!,
          );
        }

        return new Response(audioRes.body as any, {
          status: audioRes.status,
          headers: responseHeaders,
        });
      }
    } catch {
      // If cached URL expired or direct fetch failed, remove from cache
      urlCache.delete(videoId);
    }
  }

  // STEP 2: Instant native process stream fallback
  try {
    return streamViaYtDlp(youtubeUrl);
  } catch {
    return NextResponse.json(
      { error: "Audio stream currently unavailable." },
      { status: 500 },
    );
  }
}
