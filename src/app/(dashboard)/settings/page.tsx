"use client"

import { useState, useEffect } from 'react'
import {
    Settings as SettingsIcon,
    Bell,
    Shield,
    Database,
    Save,
    Smartphone,
    Mail,
    ChevronRight,
    LogOut,
    User,
    Upload,
    Camera,
    Trash2,
    AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/components/UserAvatar'
import { useRef } from 'react'

export default function SettingsPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [userId, setUserId] = useState('')

    // Form State
    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')

    // UI State
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            setUserId(session.user.id)

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

            if (profile) {
                setFullName(profile.full_name || '')
                setUsername(profile.username || '')
                setAvatarUrl(profile.avatar_url || '')
            }
            setIsLoading(false)
        }

        fetchProfile()
    }, [])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setMessage(null)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}.${fileExt}`
            const filePath = `${userId}/${fileName}`

            // 1. Upload to Storage
            const { error: uploadError, data } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { cacheControl: '3600', upsert: true })

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setAvatarUrl(publicUrl)

            // 3. Update Profile Immediately
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
                .eq('id', userId)

            if (updateError) throw updateError

            setMessage({ text: 'Avatar uploaded and saved!', type: 'success' })
        } catch (err: any) {
            console.error('Upload error:', err)
            setMessage({ text: err.message || 'Error uploading image. Is the "avatars" bucket created in Supabase?', type: 'error' })
        } finally {
            setIsUploading(false)
        }
    }

    const handleSaveProfile = async () => {
        setIsSaving(true)
        setMessage(null)

        try {
            if (!username.trim()) throw new Error('Username cannot be empty')

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    username: username,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)

            if (error) throw error

            setMessage({ text: 'Profile updated successfully!', type: 'success' })
        } catch (err: any) {
            console.error('Error updating profile:', err)
            setMessage({ text: err.message || 'Failed to update profile', type: 'error' })
        } finally {
            setIsSaving(false)
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            setMessage({ text: 'Please type DELETE to confirm', type: 'error' })
            return
        }

        setIsDeleting(true)
        setMessage(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No session')

            // Call the Edge Function to delete user
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                }
            )

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete account')
            }

            // Sign out and redirect to login
            await supabase.auth.signOut()
            router.push('/login')
        } catch (error: any) {
            console.error('Delete error:', error)
            setMessage({ text: error.message || 'Failed to delete account', type: 'error' })
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return <div className="p-12 text-center text-slate-500">Loading settings...</div>
    }

    return (
        <div className="pb-24 px-4 pt-6 space-y-8 animate-in fade-in duration-700 max-w-lg mx-auto">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-slate-500 text-sm">Manage your preferences.</p>
            </div>

            <div className="space-y-6">
                {/* Profile Edit Section */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Profile Details</h3>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row items-center gap-6 mb-4">
                            <div className="relative group">
                                <UserAvatar
                                    url={avatarUrl}
                                    name={fullName}
                                    username={username}
                                    size="xl"
                                    className="border-2 border-slate-800 shadow-2xl transition-opacity group-hover:opacity-80"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-3xl transition-opacity"
                                >
                                    {isUploading ? (
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Camera className="w-8 h-8 text-white" />
                                    )}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>

                            <div className="flex-1 w-full space-y-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Avatar Mode</label>
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold py-2 px-3 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Upload className="w-3 h-3" />
                                            Upload File
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">External Link</label>
                                    <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 mt-2 focus-within:border-indigo-500 transition-colors">
                                        <input
                                            value={avatarUrl}
                                            onChange={(e) => setAvatarUrl(e.target.value)}
                                            className="bg-transparent outline-none text-[10px] w-full placeholder:text-slate-600 truncate text-slate-300"
                                            placeholder="https://example.com/avatar.jpg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 mt-1 focus-within:border-indigo-500 transition-colors">
                                    <User className="w-4 h-4 text-slate-500" />
                                    <input
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="bg-transparent outline-none text-sm w-full placeholder:text-slate-600"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 mt-1 focus-within:border-indigo-500 transition-colors">
                                    <span className="text-slate-500 text-sm font-bold">@</span>
                                    <input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="bg-transparent outline-none text-sm w-full placeholder:text-slate-600"
                                        placeholder="johndoe"
                                    />
                                </div>
                            </div>
                        </div>

                        {message && (
                            <div className={cn(
                                "text-xs font-bold p-3 rounded-xl",
                                message.type === 'success' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            )}>
                                {message.text}
                            </div>
                        )}

                        <button
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </section>

                {/* Account Section (Read Only / Toggles) */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Account & Display</h3>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/50">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                    <Smartphone className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-200">Dark Mode</p>
                                    <p className="text-[10px] text-slate-500">Always on</p>
                                </div>
                            </div>
                            <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-md" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 ml-1">⚠️ Danger Zone</h3>
                    <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-5 space-y-3">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-rose-200">Delete Account</p>
                                <p className="text-xs text-rose-300/70 leading-relaxed">
                                    Permanently delete your account and all associated data. This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full bg-rose-900/30 hover:bg-rose-900/50 border border-rose-800/50 text-rose-400 hover:text-rose-300 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete My Account
                        </button>
                    </div>
                </section>

                <div className="pt-6">
                    <button
                        onClick={handleSignOut}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-400 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 hover:text-white transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                    <p className="text-center text-[10px] text-slate-600 mt-4">Version 1.0.0 • The Great Lock-In</p>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-rose-900/50 rounded-3xl p-6 max-w-md w-full space-y-5 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="text-center space-y-3">
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-8 h-8 text-rose-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Delete Account?</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                This will permanently delete your account, all survey submissions, team memberships, and uploaded files. This action cannot be undone.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 ml-1">
                                Type <span className="text-rose-400">DELETE</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-rose-500 transition-colors"
                                autoFocus
                            />
                        </div>

                        {message?.type === 'error' && (
                            <p className="text-rose-400 text-sm text-center font-medium bg-rose-500/10 py-2 rounded-lg">
                                {message.text}
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setDeleteConfirmText('')
                                    setMessage(null)
                                }}
                                disabled={isDeleting}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                                className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
