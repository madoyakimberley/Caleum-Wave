// src/app/api/search/route.ts
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import yts from "yt-search";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Perform YouTube search
    const searchResult = await yts(query);

    if (!searchResult || !searchResult.videos) {
      return NextResponse.json({ results: [] });
    }

    // 🛡️ THE LOGICAL FILTER SHIELD: Strictly isolate standard video items
    // This removes playlists (PL...), mixes, and channels from your search results
    const pureVideoTracks = searchResult.videos.filter((video: any) => {
      const isSingleTrack = video.type === "video";
      const hasValidId =
        video.videoId &&
        video.videoId.length === 11 &&
        !video.videoId.startsWith("PL");

      return isSingleTrack && hasValidId;
    });

    // Map the top 10 filtered single tracks into the OnlineTrack format expected by Install.tsx
    const results = pureVideoTracks
      .slice(0, 10)
      .map(
        (video: {
          seconds: number;
          videoId: any;
          title: any;
          author: { name: any };
          thumbnail: any;
          image: any;
        }) => {
          // Estimate audio filesize based on duration (~128kbps MP3 calculation)
          const estimatedMB = ((video.seconds * 128) / 8000).toFixed(1);

          return {
            id: video.videoId, // Guaranteed 11-char Video ID
            title: video.title,
            artist: video.author?.name || "UNKNOWN ARTIST",
            thumbnail: video.thumbnail || video.image,
            size: `${estimatedMB} MB`,
            format: "MP3",
          };
        },
      );

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error("YouTube Search Error:", error);
    return NextResponse.json(
      { error: "Failed to query YouTube grid" },
      { status: 500 },
    );
  }
}
