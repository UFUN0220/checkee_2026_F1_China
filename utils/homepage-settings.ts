import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { HomepageContentSettings } from '~/types/homepage'

type HomepageSettingsRow = {
  id: string
  pinned_article_slug: string | null
  updated_at?: string
}

let readClient: SupabaseClient | null | undefined
let writeClient: SupabaseClient | null | undefined

function getReadClient() {
  if (readClient !== undefined) return readClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  readClient = url && key ? createClient(url, key) : null
  return readClient
}

function getWriteClient() {
  if (writeClient !== undefined) return writeClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  writeClient = url && key ? createClient(url, key) : null
  return writeClient
}

export async function loadHomepageContentSettings(): Promise<HomepageContentSettings | null> {
  const client = getReadClient()
  if (!client) return null

  const { data, error } = await client
    .from('homepage_settings')
    .select('id, pinned_article_slug, updated_at')
    .eq('id', 'homepage')
    .maybeSingle<HomepageSettingsRow>()

  if (error || !data || typeof data.pinned_article_slug !== 'string') return null

  return { pinnedArticleSlug: data.pinned_article_slug }
}

export async function saveHomepageContentSettings(settings: HomepageContentSettings) {
  const client = getWriteClient()
  if (!client) return false

  const { error } = await client.from('homepage_settings').upsert(
    {
      id: 'homepage',
      pinned_article_slug: settings.pinnedArticleSlug,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  return !error
}
