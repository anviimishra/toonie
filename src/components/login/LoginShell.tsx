/**
 * The backdrop for the login screen: the same warm gradient and soft light
 * blobs as the app shell, without the tab bar. The column is phone-width and
 * centred on a laptop, and scrolls (rather than clips) so the on-screen
 * keyboard can never hide the submit button.
 */
export function LoginShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative isolate min-h-dvh overflow-clip bg-linear-to-b from-orange-50 via-amber-50 to-rose-50">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="animate-float absolute -top-24 -left-20 size-72 rounded-full bg-orange-300/40 blur-3xl motion-reduce:animate-none" />
        <div className="animate-float absolute top-1/3 -right-24 size-80 rounded-full bg-rose-300/30 blur-3xl [animation-delay:-3s] motion-reduce:animate-none" />
        <div className="absolute -bottom-24 left-1/4 size-72 rounded-full bg-amber-200/50 blur-3xl" />
      </div>

      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-3 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:border-x sm:border-orange-100/70 sm:bg-white/20 sm:shadow-[0_0_60px_-20px_rgb(120_53_15/0.25)]">
        {children}
      </main>
    </div>
  );
}
