import Link from "next/link";

/** Route mark: origin dot → path → destination pin, drawn with CSS only. */
function RouteMark() {
  return (
    <span aria-hidden className="flex items-center gap-[3px]">
      <span className="size-1.5 rounded-full ring-[1.5px] ring-primary" />
      <span className="h-[1.5px] w-2.5 rounded-full bg-primary/35" />
      <span className="size-2.5 rounded-full bg-primary" />
    </span>
  );
}

/**
 * Product header only. Passenger vs Operations used to read like two products;
 * the technical trace now lives behind the main experience instead.
 */
export function NavHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <RouteMark />
          <span className="text-[17px] leading-none font-semibold tracking-[-0.02em]">
            Trip<span className="text-primary">Intent</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span className="label-caps text-muted-foreground">Live travel data via Atlas Sandbox</span>
        </div>
      </div>
    </header>
  );
}
