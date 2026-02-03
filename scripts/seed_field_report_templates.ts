/**
 * Seed script for field report templates
 *
 * Run with: npx tsx scripts/seed_field_report_templates.ts
 *
 * This script creates/updates the 4 system templates:
 * 1. Quick Log - 30 seconds, just the essentials
 * 2. Standard - 3 minutes, the sweet spot
 * 3. Deep Dive - 10 minutes, full forensic analysis
 * 4. Phoenix - 5 minutes, blowout recovery
 */

import { createAdminSupabaseClient } from "../src/db/supabase"
import type { TemplateField } from "../src/db/trackingTypes"

// ============================================================================
// Template Definitions (matching FIELD_REPORT_TEMPLATES_DISCUSSION.md)
// ============================================================================

interface TemplateData {
  slug: string
  name: string
  description: string
  icon: string
  estimated_minutes: number
  static_fields: TemplateField[]
  dynamic_fields: TemplateField[]
  active_dynamic_fields: string[]
}

const TEMPLATES: TemplateData[] = [
  // ============================================================================
  // 1. Quick Log - 30 seconds
  // ============================================================================
  {
    slug: "quick-log",
    name: "Quick Log",
    description: "Minimum viable logging. Capture that it happened.",
    icon: "zap",
    estimated_minutes: 1,
    static_fields: [
      {
        id: "mood",
        type: "select",
        label: "How do you feel?",
        options: ["😤", "😐", "😊", "🔥"],
        required: true,
      },
      {
        id: "approaches",
        type: "number",
        label: "Approaches",
        placeholder: "How many?",
        required: true,
        min: 0,
      },
      {
        id: "intention",
        type: "text",
        label: "What was your intention/goal?",
        placeholder: "What were you trying to do? (optional)",
      },
      {
        id: "quick_note",
        type: "text",
        label: "Quick note",
        placeholder: "Anything worth noting? (optional)",
      },
    ],
    dynamic_fields: [
      {
        id: "conversation",
        type: "textarea",
        label: "Add conversation",
        placeholder: "Me: ...\nHer: ...",
        rows: 6,
      },
    ],
    active_dynamic_fields: [],
  },

  // ============================================================================
  // 2. Standard - 3 minutes
  // ============================================================================
  {
    slug: "standard",
    name: "Standard",
    description: "Quick learning loop. Extract the key lesson.",
    icon: "file-text",
    estimated_minutes: 3,
    static_fields: [
      {
        id: "mood",
        type: "select",
        label: "How do you feel?",
        options: ["😤", "😐", "😊", "🔥"],
        required: true,
      },
      {
        id: "approaches",
        type: "number",
        label: "Approaches",
        placeholder: "How many?",
        required: true,
        min: 0,
      },
      {
        id: "intention",
        type: "text",
        label: "What was your intention/goal?",
        placeholder: "What were you trying to do?",
      },
      {
        id: "best_moment",
        type: "textarea",
        label: "Best moment",
        placeholder: "What stood out positively?",
        rows: 2,
      },
      {
        id: "why_ended",
        type: "textarea",
        label: "Your best interaction - why did it end?",
        placeholder: "Compare to your intention...",
        rows: 3,
      },
      {
        id: "do_differently",
        type: "textarea",
        label: "What would you do differently?",
        placeholder: "If you could replay it...",
        rows: 2,
      },
      {
        id: "key_takeaway",
        type: "text",
        label: "Key takeaway (optional)",
        placeholder: "One thing to remember",
      },
    ],
    dynamic_fields: [
      {
        id: "conversation",
        type: "textarea",
        label: "Add conversation for AI analysis",
        placeholder: "Me: ...\nHer: ...",
        rows: 8,
      },
    ],
    active_dynamic_fields: [],
  },

  // ============================================================================
  // 3. Deep Dive - 10 minutes
  // ============================================================================
  {
    slug: "deep-dive",
    name: "Deep Dive",
    description: "Full forensic analysis for notable sessions.",
    icon: "microscope",
    estimated_minutes: 10,
    static_fields: [
      {
        id: "mood",
        type: "select",
        label: "How do you feel?",
        options: ["😤", "😐", "😊", "🔥"],
        required: true,
      },
      {
        id: "approaches",
        type: "number",
        label: "Approaches",
        placeholder: "How many?",
        required: true,
        min: 0,
      },
      {
        id: "intention",
        type: "text",
        label: "What was your intention/goal?",
        placeholder: "What were you trying to do?",
      },
      {
        id: "best_moment",
        type: "textarea",
        label: "Best moment",
        placeholder: "What stood out positively?",
        rows: 2,
      },
      {
        id: "conversation",
        type: "textarea",
        label: "Conversation",
        placeholder: "Me: ...\nHer: ...",
        rows: 8,
      },
      {
        id: "technique",
        type: "multiselect",
        label: "Technique practiced",
        options: [
          "Push-pull",
          "Cold read",
          "Statement of intent",
          "Compliance test",
          "Time bridge",
          "Tease",
          "Qualification",
          "Role play",
          "Assumption stacking",
          "Future projection",
        ],
      },
      {
        id: "thirty_seconds_before",
        type: "textarea",
        label: "What happened in the 30 seconds before the key moment?",
        placeholder: "The lead-up often reveals more than the moment itself...",
        rows: 3,
      },
      {
        id: "hinge_moment",
        type: "textarea",
        label: "The hinge moment (where it could have gone differently)",
        placeholder: "Describe the decision point...",
        rows: 3,
      },
      {
        id: "why_ended",
        type: "textarea",
        label: "Why did it end?",
        placeholder: "Compare to your intention...",
        rows: 3,
      },
      {
        id: "do_differently",
        type: "textarea",
        label: "What would you do differently?",
        placeholder: "If you could replay it...",
        rows: 2,
      },
      {
        id: "sticking_point",
        type: "select",
        label: "Did your sticking point show up?",
        options: ["Yes", "No"],
      },
      {
        id: "sticking_point_detail",
        type: "textarea",
        label: "If yes, describe",
        placeholder: "What happened?",
        rows: 2,
      },
      {
        id: "not_admitting",
        type: "textarea",
        label: "What are you not admitting to yourself?",
        placeholder: "Be honest - this is private...",
        rows: 3,
      },
      {
        id: "key_takeaway",
        type: "text",
        label: "Key takeaway",
        placeholder: "One thing to remember",
      },
    ],
    dynamic_fields: [],
    active_dynamic_fields: [],
  },

  // ============================================================================
  // 4. The Phoenix - Blowout Recovery (5 minutes)
  // ============================================================================
  {
    slug: "phoenix",
    name: "The Phoenix",
    description: "Turn harsh rejections into growth fuel",
    icon: "flame",
    estimated_minutes: 5,
    static_fields: [
      {
        id: "mood",
        type: "select",
        label: "How do you feel?",
        options: ["😤", "😐", "😊", "🔥"],
        required: true,
      },
      {
        id: "approaches",
        type: "number",
        label: "Approaches",
        placeholder: "How many?",
        required: true,
        min: 0,
      },
      {
        id: "what_happened",
        type: "textarea",
        label: "What happened? (factual, without judgment)",
        placeholder: "Describe what actually occurred...",
        rows: 3,
        required: true,
      },
      {
        id: "how_it_made_you_feel",
        type: "textarea",
        label: "How it made you feel",
        placeholder: "Emotional processing - be honest...",
        rows: 3,
        required: true,
      },
      {
        id: "why_it_happened",
        type: "textarea",
        label: "Why it might have happened",
        placeholder: "Analysis without self-blame...",
        rows: 3,
      },
      {
        id: "tell_friend",
        type: "textarea",
        label: "What would you tell a friend who had this experience?",
        placeholder: "Be compassionate with yourself...",
        rows: 2,
      },
      {
        id: "do_it_again",
        type: "select",
        label: "Would you do it again?",
        options: ["Yes, definitely", "Yes, with adjustments", "Need to think about it", "Probably not"],
      },
      {
        id: "key_takeaway",
        type: "text",
        label: "Key takeaway (optional)",
        placeholder: "One thing to remember",
      },
    ],
    dynamic_fields: [],
    active_dynamic_fields: [],
  },

]

// ============================================================================
// Main Seed Function
// ============================================================================

async function main() {
  const supabase = createAdminSupabaseClient()

  console.log("Seeding field report templates...")

  for (const template of TEMPLATES) {
    console.log(`  Processing: ${template.name} (${template.slug})`)

    // Check if template exists
    const { data: existing } = await supabase
      .from("field_report_templates")
      .select("id")
      .eq("slug", template.slug)
      .eq("is_system", true)
      .single()

    if (existing) {
      // Update existing template
      const { error } = await supabase
        .from("field_report_templates")
        .update({
          name: template.name,
          description: template.description,
          icon: template.icon,
          estimated_minutes: template.estimated_minutes,
          static_fields: template.static_fields,
          dynamic_fields: template.dynamic_fields,
          active_dynamic_fields: template.active_dynamic_fields,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)

      if (error) {
        console.error(`    ❌ Failed to update ${template.name}:`, error.message)
      } else {
        console.log(`    ✓ Updated ${template.name}`)
      }
    } else {
      // Insert new template
      const { error } = await supabase.from("field_report_templates").insert({
        user_id: null, // System template
        slug: template.slug,
        name: template.name,
        description: template.description,
        icon: template.icon,
        estimated_minutes: template.estimated_minutes,
        is_system: true,
        base_template_id: null,
        static_fields: template.static_fields,
        dynamic_fields: template.dynamic_fields,
        active_dynamic_fields: template.active_dynamic_fields,
      })

      if (error) {
        console.error(`    ❌ Failed to insert ${template.name}:`, error.message)
      } else {
        console.log(`    ✓ Inserted ${template.name}`)
      }
    }
  }

  console.log("\nDone! Templates seeded successfully.")
}

main().catch((error) => {
  console.error("Seed script failed:", error)
  process.exit(1)
})
