/**
 * ChatDetailPage — full chat thread with real-time messaging, media upload,
 * read receipts, and paginated load-older.
 * Exported as ChatDetailPage (named export).
 */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  FileIcon,
  ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  X,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import {
  chatKeys,
  useConversation,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
} from '../../lib/api/chat'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import type { Message } from '../../types'
import { colors } from '../../theme'
import { useChatRealtime } from './_shared/useChatRealtime'
import { useReadReceiptRealtime } from './_shared/useReadReceiptRealtime'
import { useOtherLastReadAt } from './_shared/useUnreadCounts'
import { useQueryClient } from '@tanstack/react-query'
import {
  formatDateSeparator,
  formatFileSize,
  formatMessageTime,
  messageTypeFromMime,
  shouldShowDateSeparator,
  uploadChatMedia,
} from './_shared/chatHelpers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OptimisticMessage extends Message {
  _isOptimistic?: boolean
  _isUploading?: boolean
  _isFailed?: boolean
  _localFile?: File
}

// ─── Message bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
  msg: OptimisticMessage
  isMe: boolean
  showDateSeparator: boolean
  dateLabel: string
  isLast: boolean
  otherLastReadAt: string | null
  onImageClick: (url: string) => void
}

function MessageBubble({
  msg,
  isMe,
  showDateSeparator,
  dateLabel,
  isLast,
  otherLastReadAt,
  onImageClick,
}: BubbleProps) {
  const time = formatMessageTime(msg.created_at)
  const isUploading = msg._isUploading
  const isFailed = msg._isFailed

  // Read receipt: show only on last sent message from self
  const isRead =
    isMe &&
    isLast &&
    otherLastReadAt !== null &&
    new Date(otherLastReadAt) >= new Date(msg.created_at)

  const bubbleBg = isMe ? colors.chatSelf : colors.chatOther

  return (
    <>
      {/* Date separator */}
      {showDateSeparator && (
        <div className="flex items-center justify-center py-3" aria-live="polite">
          <span className="text-[11px] text-text-secondary bg-card rounded-full px-3 py-1">
            {dateLabel}
          </span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}
        role="listitem"
      >
        <div
          className={`max-w-[75%] min-w-0 rounded-2xl px-3 py-2 ${
            isMe ? 'rounded-br-sm' : 'rounded-bl-sm'
          }`}
          style={{ backgroundColor: bubbleBg }}
        >
          {/* Image message */}
          {msg.type === 'image' && msg.media_url && (
            <button
              className="block mb-1 rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => msg.media_url && onImageClick(msg.media_url)}
              aria-label={`View image${msg.content ? ': ' + msg.content : ''}`}
            >
              <img
                src={msg.media_url}
                alt={msg.content ?? 'Shared image'}
                className="max-w-full rounded-lg object-cover"
                style={{ maxHeight: 240 }}
                loading="lazy"
              />
            </button>
          )}

          {/* File message */}
          {msg.type === 'file' && msg.media_url && (
            <a
              href={msg.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-black/20 rounded-lg mb-1 hover:bg-black/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Download ${msg.media_name ?? 'file'}`}
            >
              <FileIcon className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-text truncate">{msg.media_name ?? 'File'}</p>
                {msg.media_size != null && (
                  <p className="text-[10px] text-text-tertiary">
                    {formatFileSize(msg.media_size)}
                  </p>
                )}
              </div>
            </a>
          )}

          {/* Text content */}
          {msg.content && (
            <p
              className="text-sm text-text break-words min-w-0"
              style={{ wordBreak: 'break-word' }}
            >
              {msg.content}
            </p>
          )}

          {/* Upload indicator */}
          {isUploading && (
            <div className="flex items-center gap-1 mt-1">
              <Loader2 className="w-3 h-3 text-text-tertiary animate-spin" aria-hidden="true" />
              <span className="text-[10px] text-text-tertiary">Uploading…</span>
            </div>
          )}

          {/* Failed indicator */}
          {isFailed && (
            <p className="text-[10px] text-error mt-1">Failed to send</p>
          )}

          {/* Time + read receipt */}
          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-text-tertiary">{time}</span>
            {isMe && !isUploading && (
              <span
                className="text-[10px]"
                style={{ color: isRead ? colors.readReceipt : colors.textTertiary }}
                aria-label={isRead ? 'Read' : 'Delivered'}
              >
                {isRead ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function MessageSkeletons() {
  return (
    <div className="flex flex-col gap-3 p-4" aria-hidden="true">
      {[80, 60, 70, 50, 90].map((w, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className="h-9 rounded-2xl animate-pulse bg-card-elevated"
            style={{ width: `${w}%`, maxWidth: '75%' }}
            aria-hidden="true"
          />
        </div>
      ))}
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

interface LightboxProps {
  url: string
  onClose: () => void
}

function Lightbox({ url, onClose }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-card-elevated flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={onClose}
        aria-label="Close image preview"
      >
        <X className="w-5 h-5 text-text" aria-hidden="true" />
      </button>
      <img
        src={url}
        alt="Full size preview"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ChatDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()

  // ── State ─────────────────────────────────────────────────────────────────
  const [localMessages, setLocalMessages] = useState<OptimisticMessage[]>([])
  const [seenIds] = useState(() => new Set<string>())
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const msgListRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const [composerText, setComposerText] = useState('')

  // ── Server data ───────────────────────────────────────────────────────────
  const convQ = useConversation(conversationId)
  const conversation = convQ.data
  const otherParticipant = conversation?.conversation_participants.find(
    (p) => p.user_id !== user?.id,
  )
  const otherUser = otherParticipant?.users

  const messagesQ = useMessages(conversationId)
  const markRead = useMarkConversationRead()
  const sendMsg = useSendMessage()

  // Initial other last_read_at from server
  const otherReadQ = useOtherLastReadAt(conversationId, user?.id)
  useEffect(() => {
    if (otherReadQ.data !== undefined) {
      setOtherLastReadAt(otherReadQ.data)
    }
  }, [otherReadQ.data])

  // ── Flatten pages into a chronological list ───────────────────────────────
  const serverMessages = useMemo<Message[]>(() => {
    if (!messagesQ.data) return []
    // Pages come in reverse-chron (newest first per page, newest page last loaded)
    // Flatten and reverse to get oldest → newest
    const flat = messagesQ.data.pages.flatMap((page) => page as Message[])
    return [...flat].reverse()
  }, [messagesQ.data])

  // Merge server messages into localMessages on initial load, dedup by id
  useEffect(() => {
    if (!serverMessages.length) return
    setLocalMessages((prev) => {
      const merged = new Map<string, OptimisticMessage>()
      // Server messages are the truth
      for (const m of serverMessages) {
        merged.set(m.id, m)
        seenIds.add(m.id)
      }
      // Re-add any optimistic messages not yet confirmed
      for (const m of prev) {
        if (!merged.has(m.id)) {
          merged.set(m.id, m)
        }
      }
      return Array.from(merged.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverMessages])

  // ── Mark read on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !user?.id) return
    markRead.mutate({ conversationId, userId: user.id })
  }, [conversationId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime: new messages ─────────────────────────────────────────────────
  const handleNewMessage = useCallback(
    (msg: Message) => {
      if (!msg.id) return
      if (seenIds.has(msg.id)) return // dedup by ID

      seenIds.add(msg.id)

      setLocalMessages((prev) => {
        // Extra safety: check if already in list
        if (prev.some((m) => m.id === msg.id)) return prev

        // If it's our own message (optimistic echo), replace temp entry
        if (msg.sender_id === user?.id) {
          const tempIdx = prev.findIndex(
            (m) =>
              (m.id.startsWith('temp_') || m.id.startsWith('local_')) &&
              m.content === msg.content &&
              m.sender_id === user.id,
          )
          if (tempIdx !== -1) {
            const next = [...prev]
            seenIds.delete(next[tempIdx].id)
            next[tempIdx] = msg
            return next
          }
        }

        return [...prev, msg]
      })

      // Auto-scroll if near bottom
      const el = msgListRef.current
      if (el) {
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
        if (nearBottom) {
          requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight
          })
        } else {
          setShowScrollToBottom(true)
        }
      }

      // Mark read since the screen is open
      if (conversationId && user?.id) {
        markRead.mutate({ conversationId, userId: user.id })
      }
    },
    [user?.id, conversationId, seenIds], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useChatRealtime(conversationId, handleNewMessage)

  // ── Realtime: read receipts ───────────────────────────────────────────────
  useReadReceiptRealtime(conversationId, user?.id, (lastReadAt) => {
    setOtherLastReadAt(lastReadAt)
  })

  // ── Auto-scroll to bottom on initial load ─────────────────────────────────
  useLayoutEffect(() => {
    const el = msgListRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, []) // only on mount

  useEffect(() => {
    if (!messagesQ.isSuccess || localMessages.length === 0) return
    const el = msgListRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 300
    if (nearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [localMessages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll handler ────────────────────────────────────────────────────────
  function handleScroll() {
    const el = msgListRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setShowScrollToBottom(!nearBottom)

    // Load older messages when scrolled to top
    if (el.scrollTop < 60 && messagesQ.hasNextPage && !messagesQ.isFetchingNextPage) {
      const prevScrollHeight = el.scrollHeight
      messagesQ.fetchNextPage().then(() => {
        // Preserve scroll position after prepend
        requestAnimationFrame(() => {
          if (msgListRef.current) {
            msgListRef.current.scrollTop =
              msgListRef.current.scrollHeight - prevScrollHeight
          }
        })
      })
    }
  }

  // ── Send text ─────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = composerText.trim()
    if (!text || !conversationId || !user?.id) return

    setComposerText('')

    // Optimistic message
    const tempId = `temp_${Date.now()}`
    const optimistic: OptimisticMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
      type: 'text',
      media_url: null,
      media_type: null,
      media_name: null,
      media_size: null,
      thumbnail_url: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _isOptimistic: true,
    }
    seenIds.add(tempId)
    setLocalMessages((prev) => [...prev, optimistic])

    // Scroll to bottom
    requestAnimationFrame(() => {
      if (msgListRef.current) {
        msgListRef.current.scrollTop = msgListRef.current.scrollHeight
      }
    })

    try {
      const result = await sendMsg.mutateAsync({
        conversation_id: conversationId,
        sender_id: user.id,
        content: text,
        type: 'text',
      })

      // Replace optimistic with real
      seenIds.add(result.id)
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === tempId ? result : m)),
      )
    } catch {
      // Mark as failed
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, _isFailed: true } : m,
        ),
      )
    }
  }

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Media upload ──────────────────────────────────────────────────────────
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !conversationId || !user?.id) return
    e.target.value = '' // reset input
    setShowAttachMenu(false)
    setUploadError(null)

    const MAX = 10 * 1024 * 1024 // 10 MB
    if (file.size > MAX) {
      setUploadError('File too large (max 10 MB)')
      return
    }

    const mimeType = file.type || 'application/octet-stream'
    const msgType = messageTypeFromMime(mimeType)

    // Optimistic media message
    const tempId = `temp_${Date.now()}`
    const localUrl = URL.createObjectURL(file)
    const optimistic: OptimisticMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: null,
      type: msgType,
      media_url: localUrl,
      media_type: mimeType,
      media_name: file.name,
      media_size: file.size,
      thumbnail_url: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _isOptimistic: true,
      _isUploading: true,
      _localFile: file,
    }
    seenIds.add(tempId)
    setIsUploading(true)
    setLocalMessages((prev) => [...prev, optimistic])
    requestAnimationFrame(() => {
      if (msgListRef.current) {
        msgListRef.current.scrollTop = msgListRef.current.scrollHeight
      }
    })

    try {
      const publicUrl = await uploadChatMedia(supabase, user.id, conversationId, file)

      // Insert message referencing the storage URL
      const { data: insertedMsg, error: insertErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          type: msgType,
          content: null,
          media_url: publicUrl,
          media_type: mimeType,
          media_name: file.name,
          media_size: file.size,
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      URL.revokeObjectURL(localUrl)
      seenIds.add(insertedMsg.id)
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...insertedMsg, _isOptimistic: false } : m,
        ),
      )
      // Invalidate conversation list
      qc.invalidateQueries({ queryKey: chatKeys.conversations })
    } catch (err) {
      console.error('[ChatDetail] Upload failed:', err)
      URL.revokeObjectURL(localUrl)
      setIsUploading(false)
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, _isUploading: false, _isFailed: true }
            : m,
        ),
      )
      setUploadError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Close attach menu on outside click ───────────────────────────────────
  useEffect(() => {
    if (!showAttachMenu) return
    function handler(e: MouseEvent) {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAttachMenu])

  // ── Derived ───────────────────────────────────────────────────────────────
  const otherName = otherUser?.display_name ?? 'Chat'
  const isInitialLoading = convQ.isLoading || (messagesQ.isLoading && localMessages.length === 0)

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={{ height: '100%' }}
    >
      {/* ── App bar ─────────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-3 py-3 border-b border-divider bg-bg"
        style={{ minHeight: 56 }}
      >
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-text" aria-hidden="true" />
        </button>

        {convQ.isLoading ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar
              src={otherUser?.photo_url}
              name={otherName}
              size="sm"
              className="flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">{otherName}</p>
            </div>
          </div>
        )}
      </header>

      {/* ── Upload error toast ────────────────────────────────────────── */}
      {uploadError && (
        <div
          role="alert"
          className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-2 bg-error/10 border-b border-error/20"
        >
          <p className="text-xs text-error">{uploadError}</p>
          <button
            className="text-error hover:text-text transition-colors focus-visible:outline-none"
            onClick={() => setUploadError(null)}
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Message list ─────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto relative"
        ref={msgListRef}
        onScroll={handleScroll}
        aria-label="Message history"
        style={{ minHeight: 0 }}
      >
        {isInitialLoading ? (
          <MessageSkeletons />
        ) : messagesQ.isError && localMessages.length === 0 ? (
          <ErrorState
            title="Could not load messages"
            message="Check your connection and try again."
            onRetry={() => messagesQ.refetch()}
            className="py-20"
          />
        ) : localMessages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-7 h-7 text-text-tertiary" />}
            title={`Say hello to ${otherName}`}
            description="Start the conversation with a quick message."
          />
        ) : (
          <div
            className="px-3 py-3"
            role="list"
            aria-label="Messages"
          >
            {/* Load older indicator */}
            {messagesQ.isFetchingNextPage && (
              <div className="flex justify-center py-3" aria-live="polite" aria-label="Loading older messages">
                <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
              </div>
            )}

            {localMessages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id
              const showDate = shouldShowDateSeparator(
                localMessages as Array<{ created_at: string }>,
                i,
              )
              const dateLabel = showDate ? formatDateSeparator(msg.created_at) : ''
              const isLast = isMe && i === localMessages.length - 1

              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMe={isMe}
                  showDateSeparator={showDate}
                  dateLabel={dateLabel}
                  isLast={isLast}
                  otherLastReadAt={otherLastReadAt}
                  onImageClick={(url) => setLightboxUrl(url)}
                />
              )
            })}
          </div>
        )}

        {/* Scroll-to-bottom FAB */}
        {showScrollToBottom && (
          <button
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-lg hover:bg-card-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => {
              if (msgListRef.current) {
                msgListRef.current.scrollTop = msgListRef.current.scrollHeight
              }
              setShowScrollToBottom(false)
            }}
            aria-label="Scroll to latest message"
          >
            <ChevronDown className="w-5 h-5 text-primary" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Composer ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-divider bg-bg px-3 py-2 relative">
        {/* Attach menu */}
        {showAttachMenu && (
          <div
            ref={attachMenuRef}
            className="absolute bottom-full left-3 mb-2 bg-card border border-border rounded-xl shadow-lg p-3 flex gap-3"
            role="menu"
            aria-label="Attachment options"
          >
            <AttachOption
              icon={<ImageIcon className="w-5 h-5 text-primary" aria-hidden="true" />}
              label="Image"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*'
                  fileInputRef.current.click()
                }
                setShowAttachMenu(false)
              }}
            />
            <AttachOption
              icon={<FileIcon className="w-5 h-5 text-primary" aria-hidden="true" />}
              label="File"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept =
                    '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv'
                  fileInputRef.current.click()
                }
                setShowAttachMenu(false)
              }}
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Attach button */}
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center text-text-tertiary hover:text-text hover:bg-card transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setShowAttachMenu((v) => !v)}
            aria-label="Attach file"
            aria-expanded={showAttachMenu}
            aria-haspopup="menu"
            disabled={isUploading}
          >
            <Paperclip className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Text input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={composerRef}
              value={composerText}
              onChange={(e) => {
                setComposerText(e.target.value)
                // Auto-grow
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleComposerKeyDown}
              placeholder="Type a message…"
              rows={1}
              className="w-full bg-input-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-input-bg-focused transition-colors resize-none min-h-[40px]"
              style={{ maxHeight: 120 }}
              aria-label="Message composer"
              aria-multiline="true"
            />
          </div>

          {/* Send button */}
          <button
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary-dark transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            onClick={handleSend}
            disabled={!composerText.trim() || sendMsg.isPending || isUploading}
            aria-label="Send message"
          >
            {sendMsg.isPending ? (
              <Loader2 className="w-4 h-4 text-text-on-primary animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-4 h-4 text-text-on-primary" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          aria-label="File upload"
        />
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────── */}
      {lightboxUrl && (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  )
}

// ─── Attach option button ─────────────────────────────────────────────────────

interface AttachOptionProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function AttachOption({ icon, label, onClick }: AttachOptionProps) {
  return (
    <button
      className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-card-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-[56px]"
      onClick={onClick}
      role="menuitem"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[11px] text-text-secondary">{label}</span>
    </button>
  )
}

