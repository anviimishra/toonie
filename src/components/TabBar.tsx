"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { ComicsIcon, GearIcon, MicIcon } from "@/components/icons";

type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const TABS: Tab[] = [
  { href: "/", label: "Record", Icon: MicIcon },
  { href: "/feed", label: "Feed", Icon: ComicsIcon },
  { href: "/me", label: "Settings", Icon: GearIcon },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Bottom navigation for the phone app. Sits in the layout's flex column rather
 * than being `fixed`, so it can never cover the content above it, and pads
 * itself clear of the iPhone home indicator.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="relative z-10 border-t border-orange-100/80 bg-white/80 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-xl"
    >
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-extrabold tracking-wide transition-colors",
                  "focus-visible:outline-none",
                  active ? "text-orange-600" : "text-stone-400 hover:text-stone-600",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-8 w-14 place-items-center rounded-full transition-all duration-200",
                    active ? "bg-orange-100 shadow-[inset_0_1px_2px_rgb(103_29_154/0.12)]" : "",
                  ].join(" ")}
                >
                  <Icon className="size-[22px]" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
