import Link from "next/link"
import { notFound } from "next/navigation"
import { CoachingCost } from "@/src/quit/components/CoachingCost"
import { addictionFromParam, catchText, coachingLabels, coachingText, priceText, stepsText } from "@/src/quit/coaching"
import { isFlag, previewAllowed, withPreview } from "@/src/quit/menu"
import { canBuy, getOffer } from "@/src/quit/offer"

export const metadata = { title: coachingText.title }

export default async function CoachingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const preview = isFlag(sp.preview)
  if (!previewAllowed(preview)) notFound()
  const addiction = addictionFromParam(sp.a)
  const offer = getOffer()
  const about = catchText(addiction, preview)
  return (
    <div className="pb-8">
      <h1 className="text-2xl font-semibold leading-tight">{coachingText.title}</h1>
      <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{coachingLabels.whatHeading}</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {stepsText().map((s) => (
          <li key={s} className="rounded-lg border border-border bg-card px-4 py-3">
            {s}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-lg font-medium" data-testid="coaching-price">
        {coachingLabels.priceLabel}: {priceText()}
      </p>
      <p className="mt-2">{offer.guaranteeLine}</p>
      {about && <p className="mt-4">{about}</p>}
      <CoachingCost addiction={addiction} />
      {canBuy() ? (
        <div className="mt-6">
          <a
            href={offer.paymentLinkUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="coaching-buy"
            className="flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground"
          >
            {coachingLabels.buy}
            <span className="sr-only"> ({coachingLabels.newTab})</span>
          </a>
          <p className="mt-2 text-sm text-muted-foreground">{coachingLabels.stripeLine}</p>
        </div>
      ) : (
        <p className="mt-6 font-medium text-primary" data-testid="coaching-soon">
          {coachingLabels.soon}
        </p>
      )}
      {offer.donationLine !== null && <p className="mt-4 text-sm text-muted-foreground">{offer.donationLine}</p>}
      <ul className="mt-8 flex flex-col border-t border-border pt-2 text-sm">
        <li>
          <Link href={withPreview(`/quit/${addiction}`, preview)} className="flex min-h-11 items-center">
            {coachingLabels.freeTools}
          </Link>
        </li>
        <li>
          <Link href="/privacy" className="flex min-h-11 items-center">
            {coachingLabels.privacy}
          </Link>
        </li>
      </ul>
    </div>
  )
}
