export const dynamic = "force-static";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Caelum Wave",
    short_name: "CaelumWave",
    description: "Offline Audio & Ambient Music Player",
    start_url: "/",
    display: "standalone", // Hides browser address bar & controls
    background_color: "#090d16",
    theme_color: "#090d16",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
