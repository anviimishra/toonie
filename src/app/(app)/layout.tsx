import { TabBar } from "@/components/TabBar";

/**
 * Shell for the phone app: a phone-width column that fills the screen, with
 * the tab bar pinned to the bottom of the flow. Screens outside this group
 * (login, the receiving screen) get no tab bar.
 *
 * On a laptop the column stays phone-width and centred, so what you demo on
 * a big screen is what someone sees on their phone.
 */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative isolate min-h-dvh overflow-clip bg-linear-to-b from-orange-50 via-amber-50 to-rose-50">
      {/* Soft coloured light behind everything, for depth. Decorative only. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float absolute -top-24 -left-20 size-72 rounded-full bg-orange-300/40 blur-3xl motion-reduce:animate-none" />
        <div className="animate-float absolute top-1/3 -right-24 size-80 rounded-full bg-rose-300/30 blur-3xl [animation-delay:-3s] motion-reduce:animate-none" />
        <div className="absolute -bottom-24 left-1/4 size-72 rounded-full bg-amber-200/50 blur-3xl" />
      </div>

      <div className="mx-auto flex h-dvh max-w-md flex-col sm:border-x sm:border-orange-100/70 sm:bg-white/20 sm:shadow-[0_0_60px_-20px_rgb(120_53_15/0.25)]">
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <TabBar />
      </div>
    </div>
  );
}
