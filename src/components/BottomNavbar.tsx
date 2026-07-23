"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNavbar() {
  const pathname = usePathname();

  // Helper function to easily toggle between active and inactive classes
  const getLinkClasses = (path: string) => {
    const baseClasses =
      "flex flex-col items-center justify-center p-1 active:translate-y-1 active:translate-x-1 transition-all border-2";

    if (pathname === path) {
      // Active state classes
      return `${baseClasses} bg-secondary-container text-secondary border-primary`;
    }
    // Inactive state classes
    return `${baseClasses} text-on-surface-variant border-transparent hover:bg-surface-container-highest`;
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-2 bg-surface-container-low border-t-[4px] border-outline-variant z-50">
      {/* Home */}
      <Link href="/" className={getLinkClasses("/")}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="currentColor"
        >
          <path d="M0 0h24v24H0V0z" fill="none" />
          <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
        </svg>
        <span className="font-label-sm text-xs mt-1">Home</span>
      </Link>

      {/* Library */}
      <Link href="/library" className={getLinkClasses("/library")}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="currentColor"
        >
          <path d="M0 0h24v24H0V0z" fill="none" />
          <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5c0 1.38-1.12 2.5-2.5 2.5S10 13.88 10 12.5s1.12-2.5 2.5-2.5c.57 0 1.08.19 1.5.51V5h4v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z" />
        </svg>
        <span className="font-label-sm text-xs mt-1">Library</span>
      </Link>

      {/* Search */}
      <Link href="/search" className={getLinkClasses("/search")}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="currentColor"
        >
          <path d="M0 0h24v24H0V0z" fill="none" />
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <span className="font-label-sm text-xs mt-1">Search</span>
      </Link>
    </nav>
  );
}
