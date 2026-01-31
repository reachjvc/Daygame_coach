// Main service exports
export {
  handleUpdateSandboxSettings,
  handleResetSandboxSettings,
  handleUpdateDifficulty,
  getSubscriptionDetails,
  handleCancelSubscription,
  handleReactivateSubscription,
  createBillingPortalSession,
  getSettingsPageData,
  createSettingsError,
  isSettingsError,
  type SettingsServiceError,
  type SettingsErrorCode,
} from "./settingsService"

// Server actions (for use in pages)
export {
  updateSandboxSettings,
  resetSandboxSettings,
  updateDifficulty,
  cancelSubscription,
  reactivateSubscription,
  openBillingPortal,
} from "./actions"

// Types
export type {
  SettingsPageProps,
  UserInfo,
  ProfileInfo,
  SubscriptionInfo,
  UserStats,
  UpdateSandboxSettingsRequest,
  UpdateDifficultyRequest,
  DifficultyLevel,
  DifficultyOption,
} from "./types"

// Config
export { DIFFICULTY_OPTIONS, LEVEL_TITLES, VALID_DIFFICULTIES } from "./types"
export { SETTINGS_CONFIG } from "./config"

// Components
export { SettingsPage } from "./components/SettingsPage"
