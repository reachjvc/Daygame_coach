/**
 * Database types for the Lair (customizable dashboard)
 */

// ============================================
// Widget Configuration (stored in layout JSONB)
// ============================================

export interface UserWidgetConfig {
  widgetId: string
  position: number
  collapsed: boolean
}

export interface TabConfig {
  id: string
  name: string
  widgets: UserWidgetConfig[]
}

export interface UserLairLayout {
  tabs: TabConfig[]
  activeTabId: string
}

// ============================================
// Database Row
// ============================================

export interface UserLairConfigRow {
  id: string
  user_id: string
  layout: UserLairLayout
  created_at: string
  updated_at: string
}

// ============================================
// Insert/Update Types
// ============================================

export interface UserLairConfigInsert {
  user_id: string
  layout: UserLairLayout
}

export interface UserLairConfigUpdate {
  layout: UserLairLayout
}
