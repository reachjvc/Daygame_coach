// Tracking data exports

export {
  ALL_MILESTONES,
  TIER_INFO,
  getMilestoneInfo,
  getTierColor,
  getTierBg,
  getMilestoneCategories,
  getAllTiers,
  type MilestoneInfo,
  type MilestoneTier,
} from "./milestones"

export {
  SYSTEM_TEMPLATES,
  UI_TEMPLATE_SLUGS,
  TEMPLATE_ORDER,
  TEMPLATE_COLORS,
  TEMPLATE_TAGLINES,
  getSystemTemplateSlugs,
  isSystemTemplate,
  getSystemTemplateInfo,
  systemTemplateToRow,
  getSystemTemplatesAsRows,
  type SystemTemplateSlug,
  type UITemplateSlug,
  type TemplateSlug,
  type SystemTemplateData,
  type UITemplateInfo,
  type TemplateColorConfig,
} from "./templates"

export { KEY_STATS_DATA } from "./keyStats"
export { PRINCIPLES, PRINCIPLE_CATEGORIES } from "./principles"
