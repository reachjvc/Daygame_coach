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
    quickLogDismiss: 'quick-log-dismiss',
    outcome: (type: string) => `outcome-${type}`,
    mood: (value: number) => `mood-${value}`,
    tag: (name: string) => `tag-${name.toLowerCase().replace(/\s+/g, '-')}`,
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
  fieldReport: {
    templateSelection: 'field-report-template-selection',
    templateCard: (slug: string) => `template-card-${slug}`,
    form: 'field-report-form',
    back: 'field-report-back',
    submit: 'field-report-submit',
    saveDraft: 'field-report-save-draft',
  },

  qa: {
    page: 'qa-page',
    samples: 'qa-samples',
    sample: (index: number) => `qa-sample-${index}`,
    input: 'qa-input',
    submit: 'qa-submit',
    sources: 'qa-sources',
  },

  signup: {
    form: 'signup-form',
    fullNameInput: 'signup-fullname-input',
    emailInput: 'signup-email-input',
    passwordInput: 'signup-password-input',
    repeatPasswordInput: 'signup-repeat-password-input',
    submitButton: 'signup-submit-button',
    errorMessage: 'signup-error-message',
  },

  trackingDashboard: {
    page: 'tracking-dashboard',
    totalApproaches: 'total-approaches',
    totalNumbers: 'total-numbers',
    weekStreak: 'week-streak',
    totalSessions: 'total-sessions',
    newSessionLink: 'new-session-link',
    fieldReportLink: 'field-report-link',
    weeklyReviewLink: 'weekly-review-link',
    quickAddButton: 'quick-add-button',
  },

  innerGame: {
    page: 'inner-game-page',
    welcomeCard: 'inner-game-welcome',
    welcomeStartButton: 'inner-game-welcome-start',
    loading: 'inner-game-loading',
    valuesStep: 'inner-game-values-step',
  },

  weeklyReview: {
    page: 'weekly-review-page',
    loading: 'weekly-review-loading',
    statsCard: 'weekly-stats-card',
    templateCard: (slug: string) => `weekly-template-${slug}`,
    form: 'weekly-review-form',
    submitButton: 'weekly-review-submit',
    saveDraftButton: 'weekly-review-save-draft',
    backButton: 'weekly-review-back',
  },

  scenarios: {
    page: 'scenarios-page',
    hub: 'scenarios-hub',
    previewBadge: 'scenarios-preview-badge',
    recommendedSection: 'scenarios-recommended',
    scenarioCard: (id: string) => `scenario-card-${id}`,
    phaseSection: (id: string) => `phase-section-${id}`,
    signupPrompt: 'scenarios-signup-prompt',
  },

  articles: {
    page: 'articles-page',
    header: 'articles-header',
    contentPillars: 'content-pillars',
    pillarCard: (id: string) => `pillar-card-${id}`,
    articleTypes: 'article-types',
    articleTypeCard: (key: string) => `article-type-${key}`,
  },
} as const
