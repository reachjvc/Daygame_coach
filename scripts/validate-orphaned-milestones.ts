/**
 * Orphaned Milestone Detection Script
 *
 * Detects milestone types in the database that are no longer defined in code.
 * Run this BEFORE removing any achievement from ALL_MILESTONES.
 *
 * Usage:
 *   npx tsx scripts/validate-orphaned-milestones.ts
 *
 * Prerequisites:
 *   - SUPABASE_SERVICE_ROLE_KEY must be set in .env.local
 *   - NEXT_PUBLIC_SUPABASE_URL must be set in .env.local
 *
 * Exit codes:
 *   0 - No orphans found
 *   1 - Orphaned milestones detected
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { ALL_MILESTONES } from '../src/tracking/data/milestones'

// Load environment variables
config({ path: '.env.local' })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL')
    process.exit(1)
  }

  if (!serviceKey) {
    console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY')
    console.error('Get this from Supabase Dashboard > Project Settings > API > service_role key')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey)

  console.log('\n📊 Checking for orphaned milestones...\n')

  // Get all unique milestone_types from database
  const { data, error } = await supabase
    .from('milestones')
    .select('milestone_type')

  if (error) {
    console.error('Database error:', error.message)
    process.exit(1)
  }

  // Get unique types
  const dbTypes = new Set(data?.map(row => row.milestone_type) || [])
  const validTypes = new Set(Object.keys(ALL_MILESTONES))

  // Find orphans
  const orphans: string[] = []
  for (const type of dbTypes) {
    if (!validTypes.has(type)) {
      orphans.push(type)
    }
  }

  if (orphans.length === 0) {
    console.log('✅ No orphaned milestones found.\n')
    console.log(`   Database has ${dbTypes.size} unique milestone types.`)
    console.log(`   ALL_MILESTONES defines ${validTypes.size} types.\n`)
    process.exit(0)
  }

  // Report orphans with counts
  console.log('❌ ORPHANED MILESTONES FOUND:\n')

  for (const orphan of orphans) {
    const { count } = await supabase
      .from('milestones')
      .select('*', { count: 'exact', head: true })
      .eq('milestone_type', orphan)

    console.log(`   "${orphan}" - ${count} user(s) affected`)
  }

  console.log('\n⚠️  These milestone types exist in the database but NOT in ALL_MILESTONES.')
  console.log('   Options:')
  console.log('   1. Add them back to ALL_MILESTONES (if removal was accidental)')
  console.log('   2. Delete orphaned records from DB (if intentional removal)')
  console.log('   3. Keep metadata in ALL_MILESTONES even if no longer awardable\n')

  process.exit(1)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
