import Image from "next/image";

export default function Header() {
  return (
    <header className="flex items-center px-margin-mobile h-16 w-full bg-background border-b-4 border-surface-variant z-40 fixed top-0 left-0">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bevel-raised flex items-center justify-center bg-surface-container overflow-hidden relative">
          <Image
            src="/images/avatar.jpg"
            alt="Avatar"
            fill
            className="object-cover"
          />
        </div>
        <h1 className="font-headline-md text-headline-md text-primary tracking-tighter">
          Caelum Wave- No More Ads
        </h1>
      </div>
    </header>
  );
}
