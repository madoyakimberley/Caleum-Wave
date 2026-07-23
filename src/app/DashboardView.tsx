"use client";

import { useRef, useState, MouseEvent as ReactMouseEvent } from "react";
import Header from "@/components/Header";
import BottomNavbar from "@/components/BottomNavbar";

export default function PopulatedDashboard() {
  // Horizontal scroll micro-interaction state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDown(false);
  };

  const handleMouseUp = () => {
    setIsDown(false);
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen pb-24 overflow-x-hidden">
      {/* Assuming you might want to update your Header component later to match the avatar/settings layout, 
          but for now, we will render a custom top bar for this view to match your HTML exactly */}
      <header className="w-full top-0 sticky z-50 bg-surface border-b-4 border-outline-variant flex justify-between items-center px-margin-mobile py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary chunky-border flex items-center justify-center overflow-hidden">
            <img
              className="w-full h-full object-cover pixelated"
              alt="Avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZMTDan4QTOrTPIcokFGPYKL0denW530UsfWRv2tEM9623asEGZffbGL-hBgriTTeUM8k3ydfghqRK4N4xNFSs4zR9Ldb8OKD5SkJwtawlLPd29e_-tdk6l-R2U8mOPr4tNxOgW3eaDVbJw2qvf0IOdjje2gSJrrkDgGLRvzuiF0iqy3uFwTsBALiQLmJYyflHng0CCIA6ufYsg68hwPcHDZF3iHNhHkaTG2-u8xFptlrYs7osNE-P"
            />
          </div>
          <h1 className="font-headline-md text-headline-md text-primary tracking-tighter">
            Caelum Wave
          </h1>
        </div>
        <button className="w-10 h-10 flex items-center justify-center active:translate-x-1 active:translate-y-1 transition-transform">
          <span className="material-symbols-outlined text-primary text-3xl">
            settings
          </span>
        </button>
      </header>

      <main className="px-margin-mobile pt-6 space-y-8">
        {/* Search Bar */}
        <section>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-on-surface-variant">
                search
              </span>
            </div>
            <input
              className="w-full h-14 pl-12 pr-4 bg-surface-container-low chunky-border font-label-lg text-label-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-secondary transition-colors retro-shadow"
              placeholder="Search albums, themes..."
              type="text"
            />
          </div>
        </section>

        {/* Recently Played */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-secondary uppercase tracking-widest flex items-center gap-2">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                history
              </span>
              Recently Played
            </h2>
          </div>

          {/* Draggable Horizontal Scroll Container */}
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="flex gap-4 overflow-x-auto pb-4 snap-x -mx-4 px-4 cursor-grab active:cursor-grabbing select-none"
          >
            {/* Album 1 */}
            <div className="flex-shrink-0 w-64 snap-start">
              <div className="chunky-border bg-surface-container-high p-2 retro-shadow group active-press">
                <div className="aspect-square w-full chunky-border overflow-hidden mb-3 pointer-events-none">
                  <img
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                    src="https://lh3.googleusercontent.com/aida/AP1WRLveJm2o2xOqKmE77eVcaHXXcarWGINTrIq8dM3AkEpn0mgB-E9BFr8gmu9MupR5c22FcWhBH13cA1cRvceBMCtbu5BGroiUayY4WZg__veJzUIS3ldAv3bTJJ-bBKKZp5QLuqFu1n1Gd1QYwcwJFi68w0vVYBWa-S8jR-18LT_gj5BvBMdMmDEOMi3-cnp48cjEpb7KqrUeTajXSz-Hj3SaYjixhhSEb7VsDSVN70B2ArfA9RUlk9oF4Ls"
                    alt="Neon Rain"
                  />
                </div>
                <p className="font-label-lg text-label-lg text-primary truncate">
                  Neon Rain
                </p>
                <p className="font-label-sm text-label-sm-mobile text-on-surface-variant">
                  Midnight Pixel Audio
                </p>
              </div>
            </div>

            {/* Album 2 */}
            <div className="flex-shrink-0 w-64 snap-start">
              <div className="chunky-border bg-surface-container-high p-2 retro-shadow group active-press">
                <div className="aspect-square w-full chunky-border overflow-hidden mb-3 pointer-events-none">
                  <img
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                    src="https://lh3.googleusercontent.com/aida/AP1WRLuFHWs8fOs3wThwEGwFnpXdI_dfnAzuQG2dKh3Dzfi6xA83rhR8Wnhnr1q1OC2TZ45iGTP6YkUMEzwFrH6NTFSSm1-2p6FKdT9KAcKTDGGvDaQ24DVRi8jOE-7b4WjxVm8KQwXnitkSXUtdl0q1xxENWypQTw_utp_n0fGa54ULXzXpj2VKhbQy-hMfgQpdRPiHjQx0HsF40qLYasaxp8PZy4aAbc9xNIsNhdxn1uoyFepR0z6dL0flPfg"
                    alt="Digital Sunset"
                  />
                </div>
                <p className="font-label-lg text-label-lg text-primary truncate">
                  Digital Sunset
                </p>
                <p className="font-label-sm text-label-sm-mobile text-on-surface-variant">
                  Midnight Pixel Audio
                </p>
              </div>
            </div>

            {/* Album 3 */}
            <div className="flex-shrink-0 w-64 snap-start">
              <div className="chunky-border bg-surface-container-high p-2 retro-shadow group active-press">
                <div className="aspect-square w-full chunky-border overflow-hidden mb-3 pointer-events-none">
                  <img
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                    src="https://lh3.googleusercontent.com/aida/AP1WRLthReuOMAdKC3PERJFIHjrUYe0DSPYM5IO98Og-_G7Q-TLZzIMamlM3FeZCfqOUqX3zh2zLL-EF9-DZAWz-HQbnhahfqN5cprRdB34SNve2jU9LJhegWOPBdNao0lQmUiw0BwZSFIt7Lksmnq3fSHDwM7Zrr9V8YVOV6YtXJPEJJr-Gtq8TvyGUH09Ge1iKO5xpduHecRZUT8RHh2_OiG-jlnafDBZ1gtTjfGMaWDHR8nCFrsqRJL3gr2A"
                    alt="Underwater Signal"
                  />
                </div>
                <p className="font-label-lg text-label-lg text-primary truncate">
                  Underwater Signal
                </p>
                <p className="font-label-sm text-label-sm-mobile text-on-surface-variant">
                  Midnight Pixel Audio
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Your Collection (Grid) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-secondary uppercase tracking-widest flex items-center gap-2">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                library_music
              </span>
              Your Collection
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Grid Items */}
            {[
              {
                title: "Clockwork Heart",
                img: "AP1WRLuy0KQJgbXGIZ5RFv0LUT7MS0OOStUUXY9DRKalzcq9JL481rkAou63RqSmIjlmbcrKctMwDKk0DyzBKeiYhsDvnWWEHhm87dt5ava9MdQ3nwmbTsvPE6ooCMmwmgrABr8ytbOCxQykXgyNX5DM2jlKHIgEFiLma2axAUR8xMj15izDUauQwQXMJfVd6l1mHa3GgIqj106skXhoMMiVToGeBE8aA-SVMKjXBVUN7nVauOJygyYaeDlT6g",
              },
              {
                title: "Virtual Oasis",
                img: "AP1WRLvm_2x_pGt0U_aW30Q1IsPvAVUyJawBCEO37FDABQM7xlZdafEU1UQTTDrf01rEW_85IvNgrDnkPhz3TQqNytdwce6Pizutdmv2AbRtoQI__QILU7hhNMm7-_2zO6jiWMA0R-C53dOg-1WOFVHxZ6FBSVugzLnsxbYVkWNRWhendcT73JblzvMv03c2hPn5vYj_aNYws5DxkrP0B09-2WMlxNbdwTaiz0YN4v1aqcBbaGfZlp2WVJxgRPw",
              },
              {
                title: "Thunder Peak",
                img: "AP1WRLvLXTtubJHi9T95T4Ds4m6XoZ8Zyx5Xx5IxkhraBnxciHODrY8POEPMByVSYryshnUPTygEz-i-zB0m6FM2_NSm4dxs0U-JTfD2uhvFXAKuA_CRKV4tvqsBbONIxP8QZ62Cu8YPzn2Pgyorl88MqHqWsvsKhsyghKAzMdXDTcAo33HFLdwNwUuBcjCVyTNOQfC2Q5b5t0zqr9ulilUzndFUUIA-gdXwlw10IS5GZRdC2_3EPVp4Gq3eOQ",
              },
              {
                title: "Arcade Echoes",
                img: "AP1WRLvmStRVh_yyKXHew7SOOJ94o1qz6ALt38XJKisXZ-wNsAQ0EHlW3Le0_bgAmGE4wJlAQsFYJwP9JANqFzhLX0fv1VLY8LAMosGpibLbSr2ZXEPGeNSe9P0ivGnTeHTRGOCFzXDim-5hDnEpJ7HeoJ_BVcznvzZwW3AvIEnjwxXHrZAonUCv_zYCGmDmuZGWNv-X3syiKlb2BsVOAPaGUEtzTKM4Uu1_5Vte-A4N-gMmUaYYQPqYjh1ZGG8",
              },
            ].map((album, idx) => (
              <div
                key={idx}
                className="chunky-border bg-surface-container p-2 retro-shadow active-press cursor-pointer"
              >
                <div className="aspect-square chunky-border mb-2 overflow-hidden">
                  <img
                    className="w-full h-full object-cover"
                    src={`https://lh3.googleusercontent.com/aida/${album.img}`}
                    alt={album.title}
                  />
                </div>
                <p className="font-label-lg text-label-lg text-on-surface truncate">
                  {album.title}
                </p>
                <p className="font-label-sm text-label-sm-mobile text-on-surface-variant">
                  Midnight Pixel
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Renders your existing bottom nav component */}
      <BottomNavbar />
    </div>
  );
}
