/**
 * Shared helpers for chat pages.
 */

/**
 * Format a UTC ISO timestamp into a human-readable relative string.
 */
export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const dt = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - dt.getTime()
    const diffMin = Math.floor(diffMs / 60_000)
    if (diffMin < 1) return 'now'
    if (diffMin < 60) return `${diffMin}m`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `${diffD}d`
    return `${dt.getMonth() + 1}/${dt.getDate()}`
  } catch {
    return ''
  }
}

/**
 * Format a message timestamp into a time string (HH:MM).
 */
export function formatMessageTime(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const dt = new Date(iso)
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/**
 * Format a date separator label (Today / Yesterday / Month Day, Year).
 */
export function formatDateSeparator(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const dt = new Date(iso)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const msgDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
    const diffDays = Math.round(
      (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return dt.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

/**
 * Determine if two consecutive messages are from the same sender within
 * 2 minutes (grouping heuristic).
 */
export function isSameGroup(
  prevCreatedAt: string | null | undefined,
  prevSenderId: string | null | undefined,
  currSenderId: string | null | undefined,
  currCreatedAt: string | null | undefined,
): boolean {
  if (prevSenderId !== currSenderId) return false
  try {
    const prev = new Date(prevCreatedAt ?? '')
    const curr = new Date(currCreatedAt ?? '')
    return Math.abs(curr.getTime() - prev.getTime()) < 2 * 60_000
  } catch {
    return false
  }
}

/**
 * Determine if a date separator should be shown before message at `index`.
 */
export function shouldShowDateSeparator(
  messages: Array<{ created_at: string }>,
  index: number,
): boolean {
  if (index === 0) return true
  const curr = new Date(messages[index].created_at)
  const prev = new Date(messages[index - 1].created_at)
  return (
    curr.getDate() !== prev.getDate() ||
    curr.getMonth() !== prev.getMonth() ||
    curr.getFullYear() !== prev.getFullYear()
  )
}

/**
 * Format file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Determine message type from MIME type string.
 */
export function messageTypeFromMime(mimeType: string): 'image' | 'video' | 'file' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'file'
}

/**
 * Upload a file to the chat_media Supabase Storage bucket.
 * Returns the public URL.
 */
export async function uploadChatMedia(
  supabaseClient: typeof import('../../../lib/supabase').supabase,
  userId: string,
  conversationId: string,
  file: File,
): Promise<string> {
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^\w.\-]/g, '_')
  const storagePath = `${userId}/${conversationId}/${timestamp}_${sanitizedName}`

  const { error } = await supabaseClient.storage
    .from('chat_media')
    .upload(storagePath, file, { upsert: false })

  if (error) throw error

  const { data } = supabaseClient.storage
    .from('chat_media')
    .getPublicUrl(storagePath)

  return data.publicUrl
}
