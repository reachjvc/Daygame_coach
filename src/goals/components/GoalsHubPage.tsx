import { GoalsHubContent } from "./GoalsHubContent"
import { GoalsGuide } from "./guide/GoalsGuide"

export function GoalsHubPage() {
  return (
    <>
      <GoalsGuide />
      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
        <GoalsHubContent />
      </main>
    </>
  )
}
