import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email, password, fullName) =>
  supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })

export const signOut = () => supabase.auth.signOut()

// ── Profile ───────────────────────────────────────────────────────────────────
export const getProfile = (userId) =>
  supabase.from('profiles').select('*').eq('id', userId).single()

// ── Opportunities ─────────────────────────────────────────────────────────────
export const getOpportunities = () =>
  supabase.from('opportunities').select('*').order('created_at', { ascending: false })

export const upsertOpportunity = (opp) =>
  supabase.from('opportunities').upsert({ ...opp, updated_at: new Date().toISOString() }).select().single()

export const deleteOpportunity = (id) =>
  supabase.from('opportunities').delete().eq('id', id)

// ── Actions ───────────────────────────────────────────────────────────────────
export const getActions = (userId) =>
  supabase.from('actions').select('*').eq('user_id', userId).order('due_date', { ascending: true, nullsFirst: false })

export const upsertAction = (action) =>
  supabase.from('actions').upsert(action).select().single()

export const deleteAction = (id) =>
  supabase.from('actions').delete().eq('id', id)

// ── Notes ─────────────────────────────────────────────────────────────────────
export const getNote = (userId, oppId) =>
  supabase.from('notes').select('*').eq('user_id', userId).eq('opportunity_id', oppId).maybeSingle()

export const upsertNote = (userId, oppId, content) =>
  supabase.from('notes').upsert({ user_id: userId, opportunity_id: oppId, content, updated_at: new Date().toISOString() }, { onConflict: 'user_id,opportunity_id' }).select().single()

// ── Chat History ──────────────────────────────────────────────────────────────
export const getChatHistory = (userId, oppId) =>
  supabase.from('chats').select('*').eq('user_id', userId).eq('opportunity_id', oppId).order('created_at', { ascending: true })

export const saveChatMessage = (userId, oppId, role, content) =>
  supabase.from('chats').insert({ user_id: userId, opportunity_id: oppId, role, content })

export const clearChatHistory = (userId, oppId) =>
  supabase.from('chats').delete().eq('user_id', userId).eq('opportunity_id', oppId)
