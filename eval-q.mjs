import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
for (const f of ['.env.local', '.env']) {
  if (!fs.existsSync(f)) continue
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim()
  }
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = process.argv[2]
const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
const u = users.users.find(x => x.email === email)
if (!u) { console.log('no auth user'); process.exit(0) }
const { data, error } = await admin.from('profiles').select('*').eq('id', u.id).maybeSingle()
if (error) console.log('profile query error:', error.message)
console.log('userId', u.id)
console.log(JSON.stringify(data, null, 2))
