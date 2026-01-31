/**
 * Creates a second test user for RLS/IDOR security tests.
 *
 * Usage:
 *   npx tsx scripts/create-test-user-b.ts
 *
 * Prerequisites:
 *   - SUPABASE_SERVICE_ROLE_KEY must be set in .env
 *   - NEXT_PUBLIC_SUPABASE_URL must be set in .env
 *
 * After running, add the output credentials to your .env.local:
 *   TEST_USER_B_EMAIL=...
 *   TEST_USER_B_PASSWORD=...
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local (where Supabase keys live)
config({ path: '.env.local' })

const TEST_USER_B_EMAIL = 'test-user-b@daygame-coach-test.local'
const TEST_USER_B_PASSWORD = 'TestUserB_SecurePass123!'

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

  console.log('Creating second test user...')

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find((u) => u.email === TEST_USER_B_EMAIL)

  if (existingUser) {
    console.log('User already exists!')
    console.log('\nAdd these to your .env.local:')
    console.log(`TEST_USER_B_EMAIL=${TEST_USER_B_EMAIL}`)
    console.log(`TEST_USER_B_PASSWORD=${TEST_USER_B_PASSWORD}`)
    return
  }

  // Create the user
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_USER_B_EMAIL,
    password: TEST_USER_B_PASSWORD,
    email_confirm: true, // Auto-confirm email
  })

  if (error) {
    console.error('Failed to create user:', error.message)
    process.exit(1)
  }

  console.log('User created successfully!')
  console.log(`User ID: ${data.user.id}`)
  console.log('\n=== Add these to your .env.local ===')
  console.log(`TEST_USER_B_EMAIL=${TEST_USER_B_EMAIL}`)
  console.log(`TEST_USER_B_PASSWORD=${TEST_USER_B_PASSWORD}`)
}

main().catch(console.error)
