/**
 * Centralized data-testid selectors for E2E tests
 * All selectors should match the data-testid attributes in production code
 */

export const SELECTORS = {
  auth: {
    emailInput: 'login-email-input',
    passwordInput: 'login-password-input',
    submitButton: 'login-submit-button',
    errorMessage: 'login-error-message',
  },

  header: {
    logoutButton: 'header-logout-button',
    dashboardLink: 'header-dashboard-link',
    settingsLink: 'header-settings-link',
  },

  dashboard: {
    content: 'dashboard-content',
    scenariosLink: 'dashboard-scenarios-link',
    innerGameLink: 'dashboard-inner-game-link',
    trackingLink: 'dashboard-tracking-link',
    qaLink: 'dashboard-qa-link',
  },

  session: {
    startButton: 'start-session-button',
    confirmButton: 'start-session-confirm',
    counter: 'approach-counter',
    goalInput: 'session-goal-input',
    locationInput: 'session-location-input',
    tapButton: 'tap-approach-button',
    endButton: 'end-session-button',
    duration: 'session-duration',
    quickLogModal: 'quick-log-modal',
    quickLogSave: 'quick-log-save',
  },

  settings: {
    profileTab: 'settings-tab-profile',
    sandboxTab: 'settings-tab-sandbox',
    userEmail: 'profile-user-email',
    sandboxToggle: (key: string) => `sandbox-toggle-${key}`,
    resetButton: 'sandbox-reset-button',
  },

  onboarding: {
    progress: 'onboarding-progress',
    nextButton: 'onboarding-next-button',
    backButton: 'onboarding-back-button',
    completeButton: 'onboarding-complete-button',
    ageSlider: 'onboarding-age-slider',
    experienceOption: (id: string) => `onboarding-experience-${id}`,
    goalOption: (id: string) => `onboarding-goal-${id}`,
  },
} as const
