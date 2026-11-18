import Link from "next/link"
import { privacyDoc, privacyEmail, tooltextDoc, visibleItems } from "@/src/quit/privacyText"

export const metadata = { title: privacyDoc.title }

export default function PrivacyPage() {
  const t = tooltextDoc.privacy
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto max-w-[640px] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <Link href="/quit" className="flex min-h-11 items-center text-sm text-muted-foreground">
          {t.backToTools}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">{privacyDoc.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{privacyDoc.draftLine}</p>
        {privacyDoc.sections.map((s) => (
          <section key={s.id} className="mt-6" aria-labelledby={`p-${s.id}`}>
            <h2 id={`p-${s.id}`} className="text-lg font-semibold">
              {s.heading}
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {visibleItems(s.items, privacyEmail).map((i) => (
                <li key={i.text} className="leading-relaxed">
                  {i.text}
                  {i.isAsk && (
                    <>
                      {" "}
                      <Link href="/quit/coaching" className="underline underline-offset-4">
                        {t.coachingLink}
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  )
}
