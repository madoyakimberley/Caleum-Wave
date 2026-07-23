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
    Accept: "application/json, text/javascript, */*; q=0.01",
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
