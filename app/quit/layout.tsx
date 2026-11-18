import Link from "next/link"
import { frame } from "@/src/quit/menu"

/** Outside `(app)`: no tab bar, no sign-in. */
export default function QuitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex h-12 max-w-[640px] items-center px-4 pt-[env(safe-area-inset-top)]">
        <Link href="/quit" className="flex min-h-11 items-center text-sm font-semibold">
          {frame.siteName}
        </Link>
      </header>
      <main className="mx-auto max-w-[640px] px-4 pb-[env(safe-area-inset-bottom)]">{children}</main>
    </div>
  )
}
