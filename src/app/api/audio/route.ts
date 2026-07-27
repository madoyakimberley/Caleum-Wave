/*
================================================================================
WORD-FOR-WORD COMMENTED ORIGINAL CODE (PRESERVED)
================================================================================

--- ORIGINAL STREAM API ---

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


--- ORIGINAL DOWNLOAD API ---

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function getBrowserHeaders(referer = "https://www.youtube.com/") {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/json, text/javascript, * /*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: referer,
  };
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

// Tier 1: Piped API Direct Audio Streams
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
  "https://pipedapi.palvelintalo.fi",
  "https://pipedapi.mha.fi",
];

async function fetchPipedDirect(videoId: string): Promise<string | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/streams/${videoId}`, {
        headers: getBrowserHeaders(),
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const audioStreams = data.audioStreams || [];
      if (audioStreams.length > 0) {
        // Grab high-quality m4a or webm stream
        const bestAudio =
          audioStreams.find((s: any) => s.mimeType?.includes("mp4")) ||
          audioStreams[0];
        if (bestAudio?.url) return bestAudio.url;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// Tier 2: Cobalt v10 Cluster
const COBALT_INSTANCES = [
  "https://api.cobalt.tools",
  "https://cobalt.api.kwiatekm.moe",
  "https://co.wuk.sh",
  "https://cobalt-api.m3u8.dev",
];

async function fetchCobalt(youtubeUrl: string): Promise<string | null> {
  for (const instance of COBALT_INSTANCES) {
    try {
      const res = await fetch(`${instance}/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: JSON.stringify({
          url: youtubeUrl,
          downloadMode: "audio",
          audioFormat: "mp3",
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      if (data.url) return data.url;
      if (data.audio) return data.audio;
      if (data.picker && data.picker[0]?.url) return data.picker[0].url;
    } catch {
      continue;
    }
  }
  return null;
}

// Tier 3: Invidious Direct Audio Stream Endpoints
const INVIDIOUS_INSTANCES = [
  "https://inv.privacydev.net",
  "https://invidious.drgns.space",
  "https://vid.priv.au",
  "https://inv.nadeko.net",
];

async function fetchInvidiousDirect(videoId: string): Promise<Response | null> {
  const itags = [140, 251];
  for (const instance of INVIDIOUS_INSTANCES) {
    for (const itag of itags) {
      try {
        const directUrl = `${instance}/latest_version?id=${videoId}&itag=${itag}`;
        const res = await fetch(directUrl, {
          headers: getBrowserHeaders(instance),
          redirect: "follow",
          signal: AbortSignal.timeout(4000),
        });

        const contentType = res.headers.get("content-type") || "";
        const contentLength = parseInt(
          res.headers.get("content-length") || "0",
          10,
        );

        if (
          res.ok &&
          res.body &&
          !contentType.includes("text/html") &&
          !contentType.includes("text/plain") &&
          !contentType.includes("application/json") &&
          (contentLength === 0 || contentLength > 50000)
        ) {
          console.log(
            `[Caelum-Wave] Secured stream from Invidious (${instance}, itag: ${itag})`,
          );
          return res;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

// Tier 4: Y2Mate Scraper Engine
async function fetchY2mate(videoId: string): Promise<string | null> {
  try {
    const analyzeRes = await fetch(
      "https://www.y2mate.com/mates/analyzeV2/ajax",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          ...getBrowserHeaders("https://www.y2mate.com/"),
        },
        body: new URLSearchParams({
          k_query: `https://www.youtube.com/watch?v=${videoId}`,
          k_page: "home",
          hl: "en",
          q_auto: "0",
        }).toString(),
        signal: AbortSignal.timeout(4000),
      },
    );

    if (!analyzeRes.ok) return null;
    const analyzeData = await analyzeRes.json();
    if (analyzeData.status !== "ok" || !analyzeData.links?.mp3) return null;

    const mp3Keys = Object.keys(analyzeData.links.mp3);
    if (mp3Keys.length === 0) return null;
    const k = analyzeData.links.mp3[mp3Keys[0]].k;

    const convertRes = await fetch(
      "https://www.y2mate.com/mates/convertV2/index",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          ...getBrowserHeaders("https://www.y2mate.com/"),
        },
        body: new URLSearchParams({ vid: videoId, k }).toString(),
        signal: AbortSignal.timeout(4000),
      },
    );

    if (!convertRes.ok) return null;
    const convertData = await convertRes.json();
    return convertData.status === "ok" && convertData.dlink
      ? convertData.dlink
      : null;
  } catch {
    return null;
  }
}

// Tier 5: Safe yt-dlp Native Execution
async function streamFromYtDlp(youtubeUrl: string): Promise<Response | null> {
  return new Promise((resolve) => {
    try {
      const proc = spawn("yt-dlp", [
        "-f",
        "ba/ba*",
        "--no-playlist",
        "-o",
        "-",
        youtubeUrl,
      ]);

      let hasErrored = false;

      proc.on("error", (err) => {
        hasErrored = true;
        console.warn(
          "[Caelum-Wave] Native yt-dlp binary execution failed:",
          err.message,
        );
        resolve(null);
      });

      setTimeout(() => {
        if (hasErrored) return;
        console.log(
          "[Caelum-Wave] Streaming directly via native yt-dlp binary!",
        );
        const webStream = nodeToWebStream(proc.stdout);
        resolve(
          new Response(webStream, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Transfer-Encoding": "chunked",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Content-Disposition":
                'attachment; filename="track-download.mp3"',
            },
          }),
        );
      }, 300);
    } catch {
      resolve(null);
    }
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
  console.log(
    `[Caelum-Wave Extractor] Initiating resilient bypass pipeline for ID: ${videoId}`,
  );

  // Step 1: Deploy Piped API
  console.log("[Caelum-Wave] Attempting Piped stream extraction...");
  let activeStreamUrl = await fetchPipedDirect(videoId);

  // Step 2: Deploy Cobalt cluster bypass
  if (!activeStreamUrl) {
    console.log("[Caelum-Wave] Deploying Cobalt cluster bypass...");
    activeStreamUrl = await fetchCobalt(youtubeUrl);
  }

  // Step 3: Deploy Invidious direct stream
  if (!activeStreamUrl) {
    console.log("[Caelum-Wave] Attempting Invidious direct stream...");
    const invidiousRes = await fetchInvidiousDirect(videoId);
    if (invidiousRes && invidiousRes.body) {
      const contentType =
        invidiousRes.headers.get("content-type") || "audio/mp4";
      const ext = contentType.includes("webm") ? "webm" : "m4a";

      return new Response(invidiousRes.body as any, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Disposition": `attachment; filename="track-${videoId}.${ext}"`,
        },
      });
    }
  }

  // Step 4: Deploy Y2Mate scraper
  if (!activeStreamUrl) {
    console.log("[Caelum-Wave] Deploying Y2Mate scraper...");
    activeStreamUrl = await fetchY2mate(videoId);
  }

  // Step 5: Pipe remote proxy URL if obtained
  if (activeStreamUrl) {
    try {
      const streamResponse = await fetch(activeStreamUrl, {
        headers: getBrowserHeaders(),
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });

      const contentType = streamResponse.headers.get("content-type") || "";
      const contentLength = parseInt(
        streamResponse.headers.get("content-length") || "0",
        10,
      );

      if (
        streamResponse.ok &&
        streamResponse.body &&
        !contentType.includes("text/html") &&
        !contentType.includes("text/plain") &&
        !contentType.includes("application/json") &&
        (contentLength === 0 || contentLength > 50000)
      ) {
        const finalContentType = contentType || "audio/mpeg";
        const ext =
          finalContentType.includes("mp4") || finalContentType.includes("m4a")
            ? "m4a"
            : "mp3";

        return new Response(streamResponse.body as any, {
          status: 200,
          headers: {
            "Content-Type": finalContentType,
            "Transfer-Encoding": "chunked",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Content-Disposition": `attachment; filename="track-${videoId}.${ext}"`,
          },
        });
      }
    } catch (err: any) {
      console.warn("[Caelum-Wave] Stream pipe failed:", err?.message);
    }
  }

  // Step 6: Native yt-dlp execution fallback
  console.log(
    "[Caelum-Wave] Web proxies unavailable. Attempting native yt-dlp execution...",
  );
  const ytDlpResponse = await streamFromYtDlp(youtubeUrl);
  if (ytDlpResponse) {
    return ytDlpResponse;
  }

  // Step 7: Global failure catch
  return NextResponse.json(
    {
      error:
        "Media extraction failed across all networks. Ensure yt-dlp is installed locally or try another track.",
    },
    { status: 502 },
  );
}
================================================================================
*/

// ============================================================================
// NEW DYNAMIC STREAM / DOWNLOAD METHOD (FETCHES RENDER YT-DLP BINARY ON VERCEL)
// ============================================================================

import { spawn } from "child_process";
import { existsSync, writeFileSync, chmodSync } from "fs";

const YTDLP_PATH = "/tmp/yt-dlp";
// URL pointing to the raw yt-dlp binary hosted on your Render server
const RENDER_BINARY_URL =
  process.env.RENDER_BINARY_URL || "https://onrender.com";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  // 1. Extract optional "action" parameter from searchParams
  const action = searchParams.get("action");

  if (!id) return new Response("Missing video ID", { status: 400 });

  // 1. Check if the binary already exists in /tmp (warm Lambda optimization)
  if (!existsSync(YTDLP_PATH)) {
    try {
      const binResponse = await fetch(RENDER_BINARY_URL);

      if (!binResponse.ok) {
        return new Response(
          `Failed to fetch binary from Render: ${binResponse.statusText}`,
          { status: 500 },
        );
      }

      // 2. Download and write the binary buffer to /tmp/yt-dlp
      const arrayBuffer = await binResponse.arrayBuffer();
      writeFileSync(YTDLP_PATH, Buffer.from(arrayBuffer));

      // 3. Grant execution permissions (+x)
      chmodSync(YTDLP_PATH, 0o755);
    } catch (err: any) {
      return new Response(`Error setting up yt-dlp binary: ${err.message}`, {
        status: 500,
      });
    }
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${id}`;

  // 4. Spawn the binary directly from absolute path /tmp/yt-dlp
  const proc = spawn(YTDLP_PATH, [
    "-f",
    "ba[ext=m4a]/ba*",
    "--extractor-args",
    "youtube:player_client=android,web",
    "-o",
    "-",
    youtubeUrl,
  ]);

  // 5. Pipe stdout chunks directly to response stream
  const stream = new ReadableStream({
    start(controller) {
      proc.stdout.on("data", (chunk) => controller.enqueue(chunk));
      proc.stdout.on("end", () => controller.close());
      proc.stdout.on("error", (err) => controller.error(err));
    },
    cancel() {
      proc.kill();
    },
  });

  // 2. Define a mutable headers object
  const headers: Record<string, string> = {
    "Content-Type": "audio/webm",
    "Cache-Control": "no-cache",
  };

  // If "action" equals "download", dynamically append Content-Disposition
  if (action === "download") {
    headers["Content-Disposition"] = `attachment; filename="${id}.webm"`;
  }

  // 3 & 4. Fallback to standard headers if not download, and pass cleanly to Response constructor
  return new Response(stream, { headers });
}
