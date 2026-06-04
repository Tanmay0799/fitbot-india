import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars. Copy .env.example → .env and fill in values.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── TODAY helpers ─────────────────────────────────────────────
const todayStart = () => new Date(new Date().setHours(0,0,0,0)).toISOString()
const todayEnd   = () => new Date(new Date().setHours(23,59,59,999)).toISOString()

// ── AUTH ──────────────────────────────────────────────────────
export const auth = {
  signUp: (email, password, name) =>
    supabase.auth.signUp({ email, password, options: { data: { name } } }),

  signIn: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getUser: () => supabase.auth.getUser(),

  onAuthChange: (cb) => supabase.auth.onAuthStateChange(cb)
}

// ── PROFILE ───────────────────────────────────────────────────
export const profileDB = {
  get: async (userId) => {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    return { data, error }
  },
  update: async (userId, updates) => {
    const { data, error } = await supabase
      .from('profiles').update(updates).eq('id', userId).select().single()
    return { data, error }
  }
}

// ── FOOD LOGS ─────────────────────────────────────────────────
export const foodDB = {
  add: async (userId, entry) => {
    const { data, error } = await supabase.from('food_logs').insert({
      user_id: userId, ...entry
    }).select().single()
    return { data, error }
  },
  today: async (userId) => {
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', todayStart())
      .lte('logged_at', todayEnd())
      .order('logged_at', { ascending: false })
    return { data, error }
  },
  delete: async (id) => supabase.from('food_logs').delete().eq('id', id)
}

// ── WORKOUT LOGS ──────────────────────────────────────────────
export const workoutDB = {
  add: async (userId, entry) => {
    const { data, error } = await supabase.from('workout_logs').insert({
      user_id: userId, ...entry
    }).select().single()
    return { data, error }
  },
  today: async (userId) => {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', todayStart())
      .lte('logged_at', todayEnd())
      .order('logged_at', { ascending: false })
    return { data, error }
  }
}

// ── WATER LOGS ────────────────────────────────────────────────
export const waterDB = {
  add: async (userId, glasses = 1) => {
    const { data, error } = await supabase.from('water_logs').insert({
      user_id: userId, glasses
    }).select().single()
    return { data, error }
  },
  today: async (userId) => {
    const { data, error } = await supabase
      .from('water_logs')
      .select('glasses')
      .eq('user_id', userId)
      .gte('logged_at', todayStart())
      .lte('logged_at', todayEnd())
    return { data, error }
  }
}

// ── ALARMS ────────────────────────────────────────────────────
export const alarmDB = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('alarms').select('*').eq('user_id', userId).order('time')
    return { data, error }
  },
  add: async (userId, alarm) => {
    const { data, error } = await supabase.from('alarms').insert({
      user_id: userId, ...alarm
    }).select().single()
    return { data, error }
  },
  toggle: async (id, active) =>
    supabase.from('alarms').update({ active }).eq('id', id),
  delete: async (id) =>
    supabase.from('alarms').delete().eq('id', id)
}

// ── CHAT ──────────────────────────────────────────────────────
export const chatDB = {
  save: async (userId, role, content) => {
    await supabase.from('chat_messages').insert({ user_id: userId, role, content })
  },
  recent: async (userId, limit = 40) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data: data?.reverse(), error }
  }
}
