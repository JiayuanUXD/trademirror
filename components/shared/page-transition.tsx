"use client";

/**
 * Wraps page content with a subtle fade+slide-up animation on each navigation.
 * `key={pathname}` forces React to remount the div, re-triggering the CSS animation.
 */

import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter h-full">
      {children}
    </div>
  );
}
