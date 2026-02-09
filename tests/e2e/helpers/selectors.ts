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
    // Session ended state (zombie prevention)
    sessionEndedBanner: 'session-ended-banner',
    editSessionButton: 'edit-session-button',
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
    dateDisplay: 'report-date-display',
    datePicker: 'report-date-picker',
    // Session import section
    sessionContext: 'session-context-section',
    sessionContextToggle: 'session-context-toggle',
    moodTimeline: 'mood-timeline',
    postSessionMoodPicker: 'post-session-mood-picker',
    postSessionMood: (value: number) => `post-session-mood-${value}`,
    postSessionMoodLabel: 'post-session-mood-label',
    // Field input selectors
    fieldInput: (fieldId: string) => `field-input-${fieldId}`,
    fieldSelect: (fieldId: string) => `field-select-${fieldId}`,
    fieldSelectOption: (fieldId: string, optionIndex: number) => `field-option-${fieldId}-${optionIndex}`,
    fieldSelectOptionByName: (fieldId: string, optionName: string) => `field-option-${fieldId}-${optionName.toLowerCase().replace(/\s+/g, '-')}`,
    fieldMultiselect: (fieldId: string) => `field-multiselect-${fieldId}`,
    fieldScale: (fieldId: string) => `field-scale-${fieldId}`,
    fieldScaleOption: (fieldId: string, value: number) => `field-scale-${fieldId}-${value}`,
    fieldList: (fieldId: string) => `field-list-${fieldId}`,
    fieldListItem: (fieldId: string, index: number) => `field-list-${fieldId}-${index}`,
    fieldTags: (fieldId: string) => `field-tags-${fieldId}`,
    fieldTagsInput: (fieldId: string) => `field-tags-input-${fieldId}`,
    fieldTagsAdd: (fieldId: string) => `field-tags-add-${fieldId}`,
    fieldTag: (fieldId: string, index: number) => `field-tag-${fieldId}-${index}`,
    fieldTagRemove: (fieldId: string, index: number) => `field-tag-remove-${fieldId}-${index}`,
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
    recentAchievementsList: 'recent-achievements-list',
    achievementItem: 'achievement-item',
    achievementsExpandButton: 'achievements-expand-button',
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

  customReportBuilder: {
    modeSelect: 'custom-builder-mode-select',
    modeTemplateOnly: 'mode-template-only',
    modeReport: 'mode-report',
    builderTemplateOnly: 'custom-builder-template-only',
    builderReport: 'custom-builder-report',
    templateNameInput: 'template-name-input',
    fieldOption: (fieldId: string) => `field-option-${fieldId}`,
    selectedField: (fieldId: string) => `selected-field-${fieldId}`,
    filledField: (fieldId: string) => `filled-field-${fieldId}`,
    removeField: (fieldId: string) => `remove-field-${fieldId}`,
    saveButton: 'save-button',
  },
} as const
