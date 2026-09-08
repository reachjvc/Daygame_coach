import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
for (const f of ['.env.local', '.env']) {
  if (!fs.existsSync(f)) continue
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, svc, { auth: { persistSession: false } })
const email = process.argv[2]
const password = process.argv[3]
const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
if (error) { console.error('ERR', error.message); process.exit(1) }
console.log('created user id', data.user.id)
