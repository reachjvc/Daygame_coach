import { redirect } from "next/navigation"
import { ROUTES } from "@/src/shared/routes"
import { createServerSupabaseClient, getProfile } from "@/src/db/server"
import { DatingAnswers } from "@/src/hometab/components/DatingAnswers"
import { getSettingsPageData, SettingsPage } from "@/src/settings"
import { getTrainingSettings } from "@/src/db/workoutRepo"
import {
  updateSandboxSettings,
  resetSandboxSettings,
  updateDifficulty,
  updateVoiceLanguage,
  updateTimezone,
  cancelSubscription,
  reactivateSubscription,
  openBillingPortal,
  updateTrainingSettings,
} from "@/src/settings/actions"

export default async function SettingsPageWrapper() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(ROUTES.settings)}`)
  }

  const [training, profileRow] = await Promise.all([getTrainingSettings(user.id), getProfile(user.id).catch(() => null)])
  const { profile, subscription, stats } = await getSettingsPageData(
    user.id,
    user.email || "",
    user.created_at || new Date().toISOString()
  )

  return (
    <SettingsPage
      user={{
        id: user.id,
        email: user.email || "",
      }}
      profile={profile}
      subscription={subscription}
      stats={stats}
      onUpdateSandboxSettings={updateSandboxSettings}
      onResetSandboxSettings={resetSandboxSettings}
      onUpdateDifficulty={updateDifficulty}
      onUpdateVoiceLanguage={updateVoiceLanguage}
      onUpdateTimezone={updateTimezone}
      training={training}
      onUpdateTraining={updateTrainingSettings}
      onCancelSubscription={cancelSubscription}
      onReactivateSubscription={reactivateSubscription}
      onOpenBillingPortal={openBillingPortal}
      datingAnswers={<DatingAnswers profile={profileRow} />}
    />
  )
}
