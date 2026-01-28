"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, AtSign, Check } from 'lucide-react'

export default function OnboardingPage() {
    const router = useRouter()
    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }
            setFullName(session.user.user_metadata.full_name || '')
        }
        checkUser()
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: session.user.id,
                username,
                full_name: fullName,
                avatar_url: session.user.user_metadata.avatar_url,
                updated_at: new Date().toISOString(),
            })

        if (profileError) {
            if (profileError.code === '23505') {
                setError('Username already taken')
            } else {
                setError(profileError.message)
            }
            setIsLoading(false)
        } else {
            router.push('/dashboard')
        }
    }

    return (
        <div className="max-w-md mx-auto py-20 px-4 space-y-10 animate-in fade-in duration-700">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Set up your profile</h1>
                <p className="text-slate-400">Complete these details to join the competition.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 transition-colors"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Username (unique)</label>
                        <div className="relative">
                            <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 transition-colors"
                                placeholder="johndoe123"
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <p className="text-red-500 text-sm text-center font-medium bg-red-500/10 py-3 rounded-xl border border-red-500/20">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isLoading || !username || !fullName}
                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all disabled:opacity-50 group"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Complete Registration
                            <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
