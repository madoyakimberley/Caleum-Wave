import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ActivityProvider } from "@/context/ActivityContext";
import { PlayerProvider } from "@/context/PlayerContext";
import MediaPlayer from "@/components/MediaPlayer";
import SWRegister from "@/components/SWRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caelum Wave - Welcome",
  description: "Pixel Palette Collection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Courier+Prime&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-background min-h-screen flex flex-col font-body-md overflow-x-hidden antialiased">
        <SWRegister />
        <ThemeProvider defaultTheme="default" attribute="data-theme">
          <ActivityProvider>
            <PlayerProvider>
              <main className="flex-1 w-full pb-28 sm:pb-32">{children}</main>
              <MediaPlayer />
            </PlayerProvider>
          </ActivityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
