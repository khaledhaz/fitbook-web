import React, { useState, useEffect } from 'react'
import { LogOut, Edit2, Check, X } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useUser, useUpdateUser } from '../../lib/api/users'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/Spinner'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'

export function TraineeProfilePage() {
  const { user, signOut, role } = useAuth()
  const { toast } = useToast()
  const userQ = useUser(user?.id)
  const updateUser = useUpdateUser()

  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')

  useEffect(() => {
    if (userQ.data) {
      setDisplayName(userQ.data.display_name ?? '')
      setUsername(userQ.data.username ?? '')
    }
  }, [userQ.data])

  const handleSave = async () => {
    if (!user) return
    try {
      await updateUser.mutateAsync({
        id: user.id,
        display_name: displayName,
        username: username,
      })
      toast('Profile updated!', 'success')
      setEditing(false)
    } catch (e) {
      toast((e as Error).message ?? 'Failed to save', 'error')
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (userQ.isLoading) return <PageSpinner />
  if (userQ.isError)
    return (
      <ErrorState
        message="Could not load your profile."
        onRetry={() => userQ.refetch()}
      />
    )

  const profile = userQ.data

  return (
    <div className="page-container max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-text mb-6">My Profile</h1>

      <Card className="mb-4">
        {/* Avatar + name header */}
        <div className="flex items-center gap-4 mb-4">
          <Avatar src={profile?.photo_url} name={profile?.display_name ?? user?.email} size="lg" />
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  aria-label="Display name"
                />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username"
                  aria-label="Username"
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
                <p className="text-sm text-text-secondary">{user?.email}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                isLoading={updateUser.isPending}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing(false)}
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

      {/* Info cards */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Role" value={role ?? '—'} />
          <InfoRow
            label="Units"
            value={profile?.preferred_units === 'imperial' ? 'Imperial' : 'Metric'}
          />
          <InfoRow
            label="Member since"
            value={
              profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : '—'
            }
          />
        </div>
      </Card>

      {/* Sign out */}
      <Button
        variant="danger"
        fullWidth
        onClick={handleSignOut}
        leftIcon={<LogOut className="w-4 h-4" />}
      >
        Sign Out
      </Button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text capitalize">{value}</span>
    </div>
  )
}
