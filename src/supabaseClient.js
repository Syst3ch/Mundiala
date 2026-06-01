import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wfyljzgkqancfxyunxjq.supabase.co' // ה-URL שלך
const supabaseAnonKey = 'sb_publishable_ToRU2wdqkmt4ZRZJkAARGQ_NESQ1wey' // המפתח שלך

export const supabase = createClient(supabaseUrl, supabaseAnonKey)