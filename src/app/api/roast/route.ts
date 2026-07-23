import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// ==========================================
// DRIZZLED SARCASM FALLBACK RUNS
// ==========================================
const INITIAL_ROAST_FALLBACKS = [
  "Searching for this with full confidence is genuinely a bold cry for help.",
  "Your music taste really took the day off when you typed that query.",
  "Even your headphones are probably sweating in embarrassment right now.",
  "Searching for this in broad daylight takes an incredible amount of courage.",
  "Your ears deserve a formal apology for whatever you're about to play.",
];

const LOAD_MORE_ROAST_FALLBACKS = [
  "Clicking 'Load More' after that search? You really love suffering, don't you?",
  "10 songs of this wasn't enough punishment for your ears today?",
  "Digging deeper into this playlist won't fix your taste, but respect the hustle.",
  "Demanding page two for this search is proof you have zero self-preservation.",
];

const getRandomFallback = (action: string) => {
  const list =
    action === "load_more"
      ? LOAD_MORE_ROAST_FALLBACKS
      : INITIAL_ROAST_FALLBACKS;
  return list[Math.floor(Math.random() * list.length)];
};

export async function POST(req: Request) {
  // 1. Safe JSON parsing BEFORE API processing
  const body = await req.json().catch(() => ({}));
  const { query, action = "initial" } = body || {};

  const fallback = getRandomFallback(action);

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // 2. Fallback if no API key or query provided
    if (!apiKey || !query || typeof query !== "string") {
      return NextResponse.json({ roast: fallback });
    }

    // 3. Initialize Gemini client
    const ai = new GoogleGenAI({ apiKey });

    const prompt =
      action === "load_more"
        ? `Write a single, hilarious 1-sentence roast about someone clicking "Load More" while searching for "${query}". Roast their music choice directly. STRICT REQUIREMENT: Do NOT use gendered words like "guy", "girl", "he", "she", "man", or "woman". Keep it under 25 words.`
        : `Write a single, hilarious 1-sentence roast dissing someone's music taste for searching for "${query}". Roast the artist/song directly. STRICT REQUIREMENT: Do NOT use gendered words like "guy", "girl", "he", "she", "man", or "woman". Keep it under 25 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const aiRoast = response.text?.trim();

    // 4. Return valid JSON payload for the frontend
    return NextResponse.json({ roast: aiRoast || fallback });
  } catch (error: any) {
    console.warn("[Roast API Error]:", error?.message || error);
    return NextResponse.json({ roast: fallback }, { status: 200 });
  }
}
