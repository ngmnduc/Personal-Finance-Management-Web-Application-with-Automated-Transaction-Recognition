import { useState } from 'react'
import { Edit2, Lock, Wallet as WalletIcon, Shield, Info, LogOut } from 'lucide-react'
import { toast } from 'sonner'

import { useGetMe, useUpdateProfile, useChangePassword, useLogout } from '../../features/auth/api/auth.api'
import { useWallets, useSetDefaultWallet } from '../../features/wallets/api/wallet.api'
import { useAuthStore } from '../../store/auth.store'
import { useTheme } from '../../components/ThemeProvider'

import PageSkeleton from '../../components/shared/PageSkeleton'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Switch } from '../../components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase()
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { isLoading: meLoading } = useGetMe()
  const user = useAuthStore((s) => s.user)

  // Profile edit state
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [profileErr, setProfileErr] = useState('')

  // Password state
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [pwdErr, setPwdErr] = useState('')

  // UI prefs
  const { theme, setTheme } = useTheme()

  // Wallet
  const { data: wallets = [] } = useWallets()
  const defaultWalletId = wallets.find((w) => w.isDefault)?.id ?? ''
  const [walletId, setWalletId] = useState<string>('')
  const setDefault = useSetDefaultWallet()

  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const logoutMutation = useLogout()

  if (meLoading) return <PageSkeleton />

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openEdit() {
    setEditName(user?.name ?? '')
    setEditAvatar(user?.avatarUrl ?? '')
    setProfileErr('')
    setEditMode(true)
  }

  function handleSaveProfile() {
    if (editName.trim().length < 2) {
      setProfileErr('Name must be at least 2 characters.')
      return
    }
    if (editAvatar && !/^https?:\/\/.+/.test(editAvatar)) {
      setProfileErr('Avatar URL must be a valid https:// URL.')
      return
    }
    setProfileErr('')
    updateProfile.mutate(
      { name: editName.trim(), avatarUrl: editAvatar || undefined },
      { onSuccess: () => setEditMode(false) },
    )
  }

  function handleChangePassword() {
    setPwdErr('')
    if (!oldPwd || !newPwd || !confPwd) {
      setPwdErr('Please fill all password fields.')
      return
    }
    if (newPwd.length < 6) {
      setPwdErr('New password must be at least 6 characters.')
      return
    }
    if (newPwd !== confPwd) {
      setPwdErr('New passwords do not match.')
      return
    }
    changePassword.mutate(
      { currentPassword: oldPwd, newPassword: newPwd },
      {
        onSuccess: () => {
          setOldPwd(''); setNewPwd(''); setConfPwd('')
        },
      },
    )
  }

  function handleSetDefaultWallet(id: string) {
    setWalletId(id)
    setDefault.mutate(id, {
      onSuccess: () => toast.success('Default wallet updated!'),
      onError: () => toast.error('Failed to update default wallet'),
    })
  }

  return (
    // TODO [DARK MODE]: Đổi bg-[#f0f4f8] → bg-background khi triển khai dark mode
    <div className="p-4 sm:p-6 lg:p-8 min-h-full bg-[#f0f4f8] max-w-[1200px] mx-auto">

      {/* ── Header ── */}
      {/* TODO [DARK MODE]: text-[#0f1f3d] → text-foreground | text-slate-500 → text-muted-foreground */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0f1f3d]">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your institutional presence and security parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: 2/3 ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Card 1: Profile */}
          {/* TODO [DARK MODE]: border-slate-100 → border-border | bg-white → bg-card */}
          <Card className="rounded-2xl border border-slate-100 bg-white p-0">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                {/* TODO [DARK MODE]: text-[#0f1f3d] → text-foreground */}
                <h2 className="text-base font-bold text-[#0f1f3d] flex items-center gap-2">
                  <Shield size={16} className="text-[#10b981]" /> Personal Information
                </h2>
                {!editMode && (
                  <Button
                    onClick={openEdit}
                    className="bg-[#0f1f3d] text-white hover:bg-[#1a2f57] h-9 px-4 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit2 size={13} /> Edit
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-5 mb-6">
                <Avatar className="size-16">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                  <AvatarFallback className="bg-[#0f1f3d] text-white text-xl font-bold">
                    {initials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  {/* TODO [DARK MODE]: text-[#0f1f3d] → text-foreground | text-slate-400 → text-muted-foreground */}
                  <p className="text-lg font-bold text-[#0f1f3d]">{user?.name ?? '—'}</p>
                  <p className="text-sm text-slate-400">{user?.email ?? '—'}</p>
                </div>
              </div>

              {editMode && (
                <div className="flex flex-col gap-4 border-t border-slate-100 pt-6">
                  {/* TODO [DARK MODE]: border-slate-100 → border-border */}
                  <div>
                    {/* TODO [DARK MODE]: text-slate-400 → text-muted-foreground */}
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                      Display Name
                    </label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your name"
                      className="bg-slate-50 border-slate-200 text-[#0f1f3d] placeholder:text-slate-300 focus-visible:ring-[#0f1f3d]/20 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                      Avatar URL <span className="normal-case font-normal">(optional, https://)</span>
                    </label>
                    <Input
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                      placeholder="https://..."
                      className="bg-slate-50 border-slate-200 text-[#0f1f3d] placeholder:text-slate-300 focus-visible:ring-[#0f1f3d]/20 focus-visible:ring-offset-0"
                    />
                  </div>
                  {profileErr && <p className="text-xs text-red-500">{profileErr}</p>}
                  <div className="flex gap-3 pt-1">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={updateProfile.isPending}
                      className="bg-[#10b981] hover:bg-[#059669] text-white font-bold px-6"
                    >
                      {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(false)}
                      className="border-slate-200 text-slate-600"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Change Password */}
          {/* TODO [DARK MODE]: border-slate-100 → border-border | bg-white → bg-card */}
          <Card className="rounded-2xl border border-slate-100 bg-white p-0">
            <CardContent className="p-6 sm:p-8">
              {/* TODO [DARK MODE]: text-[#0f1f3d] → text-foreground */}
              <h2 className="text-base font-bold text-[#0f1f3d] flex items-center gap-2 mb-6">
                <Lock size={16} className="text-[#10b981]" /> Security
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  {/* TODO [DARK MODE]: text-slate-400 → text-muted-foreground */}
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                    Old Password
                  </label>
                  <Input
                    type="password"
                    value={oldPwd}
                    onChange={(e) => setOldPwd(e.target.value)}
                    placeholder="Current password"
                    className="bg-slate-50 border-slate-200 text-[#0f1f3d] placeholder:text-slate-300 focus-visible:ring-[#0f1f3d]/20 focus-visible:ring-offset-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Min 6 characters"
                    className="bg-slate-50 border-slate-200 text-[#0f1f3d] placeholder:text-slate-300 focus-visible:ring-[#0f1f3d]/20 focus-visible:ring-offset-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    value={confPwd}
                    onChange={(e) => setConfPwd(e.target.value)}
                    placeholder="Repeat new password"
                    className="bg-slate-50 border-slate-200 text-[#0f1f3d] placeholder:text-slate-300 focus-visible:ring-[#0f1f3d]/20 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              {pwdErr && <p className="text-xs text-red-500 mt-3">{pwdErr}</p>}
              <div className="mt-5">
                <Button
                  onClick={handleChangePassword}
                  disabled={changePassword.isPending}
                  className="bg-[#10b981] hover:bg-[#059669] text-white font-bold px-6"
                >
                  {changePassword.isPending ? 'Updating…' : 'Update Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: 1/3 ── */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          {/* Card 3: Appearance — Dark Mode Toggle (LOCKED - Coming Soon) */}
          {/* TODO [DARK MODE PHASE 2]:
              - Unlock Switch: xóa disabled + opacity-50
              - Kết nối: checked={theme === 'dark'} onCheckedChange={(c) => setTheme(c ? 'dark' : 'light')}
              - Đảm bảo input.tsx + page components đã migrate semantic classes xong
          */}
          <Card className="rounded-2xl border-none bg-[#0f1f3d] text-white p-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-bold">Appearance</h2>
                <span className="text-[10px] font-bold bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full tracking-wide uppercase">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Set your interface preference.</p>
              <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                <div>
                  <p className="text-sm font-semibold">Dark Mode</p>
                  <p className="text-xs text-slate-400 mt-0.5">Switch to dark interface</p>
                </div>
                {/* LOCKED: disabled cho đến khi hoàn tất dark mode migration */}
                <Switch checked={false} disabled onCheckedChange={() => {}} />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Default Wallet */}
          {/* TODO [DARK MODE]: border-slate-100 → border-border | bg-white → bg-card */}
          <Card className="rounded-2xl border border-slate-100 bg-white p-0">
            <CardContent className="p-6">
              {/* TODO [DARK MODE]: text-[#0f1f3d] → text-foreground */}
              <h2 className="text-base font-bold text-[#0f1f3d] flex items-center gap-2 mb-1">
                <WalletIcon size={16} className="text-[#10b981]" /> Default Wallet
              </h2>
              <p className="text-xs text-[#10b981] mb-5">Used for quick transaction creation.</p>
              <Select
                value={walletId || defaultWalletId}
                onValueChange={handleSetDefaultWallet}
              >
                {/* TODO [DARK MODE]: border-slate-200 → border-border | text-[#0f1f3d] → text-foreground */}
                <SelectTrigger className="rounded-xl border-slate-200 text-[#0f1f3d] text-sm">
                  <SelectValue placeholder="Select wallet…" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} {w.isDefault ? '(default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {setDefault.isPending && (
                <p className="text-xs text-slate-400 mt-2 animate-pulse">Updating…</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Bottom full-width ── */}
        {/* TODO [DARK MODE]: border-slate-100 → border-border | bg-slate-50 → bg-muted/50 */}
        <div className="lg:col-span-3">
          <Card className="rounded-2xl border border-slate-100 bg-slate-50 p-0">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                  <Info size={18} className="text-slate-500" />
                </div>
                <div>
                  {/* TODO [DARK MODE]: text-[#0f1f3d] → text-foreground | text-slate-400 → text-muted-foreground */}
                  <p className="text-sm font-bold text-[#0f1f3d]">Thông tin ứng dụng</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono tracking-wider">BUILD VERSION v1.0.0</p>
                </div>
              </div>
              {/* TODO [DARK MODE]: border-slate-200 → border-border | text-slate-600 → text-muted-foreground */}
              <Button
                variant="outline"
                className="border-slate-200 text-slate-600 hover:text-[#0f1f3d] text-xs font-bold self-start sm:self-auto"
                onClick={() => window.open('mailto:support@finman.app')}
              >
                Support Center
              </Button>
            </CardContent>
          </Card>

          {/* Account Actions / Danger Zone */}
          <Card className="rounded-2xl border border-red-100 bg-red-50/30 p-0 mt-6">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-red-600">Account Actions</p>
                <p className="text-xs text-slate-500 mt-0.5">Securely log out of your account on this device.</p>
              </div>
              <Button
                variant="destructive"
                className="bg-red-500 hover:bg-red-600 text-white font-bold w-full sm:w-auto flex items-center gap-2"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut size={16} />
                {logoutMutation.isPending ? 'Logging out...' : 'Log Out'}
              </Button>
            </CardContent>
          </Card>

          {/* TODO [DARK MODE]: text-slate-400 → text-muted-foreground */}
          <p className="text-center text-xs text-slate-400 mt-5">
            © {new Date().getFullYear()} FinMan. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}