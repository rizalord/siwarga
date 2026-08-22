const BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000/api'

export interface PublicPage {
  slug: string
  title: string
  content: string | null
  hero_image_url: string | null
}

export interface PublicAnnouncement {
  slug: string
  title: string
  content: string
  category: string
  published_at: string
}

export interface PublicEventDocumentation {
  media_type: 'foto' | 'video'
  file_url: string
  caption: string | null
}

export interface PublicEvent {
  slug: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  status: 'upcoming' | 'ongoing' | 'completed'
  documentation: PublicEventDocumentation[]
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`)
    if (!response.ok) {
      return null
    }
    return response.json()
  } catch {
    return null
  }
}

export const publicApi = {
  async getPage(slug: string): Promise<PublicPage | null> {
    const json = await fetchJson<{ data: PublicPage }>(`/public/pages/${slug}`)
    return json?.data ?? null
  },
  async getAnnouncements(): Promise<PublicAnnouncement[]> {
    const json = await fetchJson<{ data: PublicAnnouncement[] }>('/public/announcements')
    return json?.data ?? []
  },
  async getAnnouncement(slug: string): Promise<PublicAnnouncement | null> {
    const json = await fetchJson<{ data: PublicAnnouncement }>(`/public/announcements/${slug}`)
    return json?.data ?? null
  },
  async getEvents(): Promise<PublicEvent[]> {
    const json = await fetchJson<{ data: PublicEvent[] }>('/public/events')
    return json?.data ?? []
  },
  async getEvent(slug: string): Promise<PublicEvent | null> {
    const json = await fetchJson<{ data: PublicEvent }>(`/public/events/${slug}`)
    return json?.data ?? null
  },
}
