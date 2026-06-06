import React, { useState, useEffect, useRef } from 'react'
import { LogOut, Edit2, Check, X, Upload } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useUser, useTrainer, useUpdateUser } from '../../lib/api/users'
import { useUpdateTrainerProfile } from './_shared/hooks'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/Spinner'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'

// ─── Main page ─────────────────────────────────────────────────────────────────

export function TrainerProfilePage() {
  const { user, signOut, role } = useAuth()
  const { toast } = useToast()

  const userQ = useUser(user?.id)
  const trainerQ = useTrainer(user?.id)
  const updateUser = useUpdateUser()
  const updateTrainer = useUpdateTrainerProfile()

  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync form state when data loads
  useEffect(() => {
    if (userQ.data) {
      setDisplayName(userQ.data.display_name ?? '')
      setUsername(userQ.data.username ?? '')
    }
  }, [userQ.data])

  useEffect(() => {
    if (trainerQ.data) {
      setBio(trainerQ.data.bio ?? '')
      setPortfolioUrl(trainerQ.data.portfolio_url ?? '')
    }
  }, [trainerQ.data])

  const handleSave = async () => {
    if (!user?.id) return
    try {
      // Update user fields
      await updateUser.mutateAsync({
        id: user.id,
        display_name: displayName,
        username: username.trim() || null,
      })
      // Update trainer fields
      await updateTrainer.mutateAsync({
        trainerId: user.id,
        bio: bio.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
      })
      toast('Profile saved!', 'success')
      setEditing(false)
    } catch (e) {
      toast((e as Error).message ?? 'Failed to save.', 'error')
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (file.size > 5 * 1024 * 1024) {
      toast('File must be under 5 MB.', 'error')
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('user_avatars')
        .upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage
        .from('user_avatars')
        .getPublicUrl(path)

      await updateUser.mutateAsync({
        id: user.id,
        photo_url: urlData.publicUrl,
      })
      toast('Avatar updated!', 'success')
    } catch (e) {
      toast((e as Error).message ?? 'Upload failed.', 'error')
    } finally {
      setUploading(false)
      // reset so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const isSaving = updateUser.isPending || updateTrainer.isPending

  if (userQ.isLoading || trainerQ.isLoading) return <PageSpinner />
  if (userQ.isError) {
    return (
      <ErrorState
        message="Could not load your profile."
        onRetry={() => userQ.refetch()}
      />
    )
  }

  const profile = userQ.data
  const trainer = trainerQ.data

  return (
    <div className="page-container max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-text mb-6">My Profile</h1>

      {/* Avatar + identity */}
      <Card className="mb-4">
        {/* Avatar row */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <Avatar
              src={profile?.photo_url}
              name={profile?.display_name ?? user?.email}
              size="lg"
            />
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarUpload}
              aria-label="Upload new avatar"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary-dark transition-colors focus-within:ring-2 focus-within:ring-primary"
              aria-label="Change avatar photo"
            >
              {uploading ? (
                <span className="w-4 h-4 border-2 border-text-on-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-text-on-primary" aria-hidden="true" />
              )}
            </label>
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  aria-label="Display name"
                  label="Display name"
                />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  aria-label="Username"
                  label="Username"
                  hint="Used in your invite link"
                />
              </div>
            ) : (
              <div>
                <p className="text-lg font-semibold text-text truncate">
                  {profile?.display_name ?? 'Set your name'}
                </p>
                {profile?.username && (
                  <p className="text-sm text-text-tertiary">@{profile.username}</p>
                )}
                <p className="text-sm text-text-secondary mt-0.5">{user?.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Trainer-specific fields */}
        {editing && (
          <div className="flex flex-col gap-3 mb-4">
            <Textarea
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell trainees about yourself…"
              rows={3}
              aria-label="Bio"
            />
            <Input
              label="Portfolio / Website"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://yoursite.com"
              type="url"
              aria-label="Portfolio URL"
            />
          </div>
        )}

        {/* View-mode bio */}
        {!editing && trainer?.bio && (
          <p className="text-sm text-text-secondary mb-3">{trainer.bio}</p>
        )}
        {!editing && trainer?.portfolio_url && (
          <a
            href={trainer.portfolio_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:text-primary-light break-all"
          >
            {trainer.portfolio_url}
          </a>
        )}

        {/* Edit / Save buttons */}
        <div className="flex gap-2 mt-4">
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                isLoading={isSaving}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={isSaving}
                leftIcon={<X className="w-4 h-4" />}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing(true)}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </Card>

      {/* Account info */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Role" value={role ?? '—'} />
          <InfoRow
            label="Verified"
            value={trainer?.is_verified ? 'Yes' : 'Not yet'}
          />
          <InfoRow
            label="Member since"
            value={
              profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : '—'
            }
          />
          <InfoRow
            label="Units"
            value={profile?.preferred_units === 'imperial' ? 'Imperial' : 'Metric'}
          />
        </div>
      </Card>

      {/* Sign out */}
      <Button
        variant="danger"
        fullWidth
        onClick={signOut}
        leftIcon={<LogOut className="w-4 h-4" />}
      >
        Sign Out
      </Button>
    </div>
  )
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 gap-3">
      <span className="text-sm text-text-secondary flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-text capitalize text-right min-w-0 truncate">{value}</span>
    </div>
  )
}
