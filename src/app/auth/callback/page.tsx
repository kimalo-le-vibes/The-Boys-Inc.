"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
    const router = useRouter()

    useEffect(() => {
        const handleCallback = async () => {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error) {
                console.error('Auth callback error:', error)
                router.push('/login')
                return
            }

            if (session) {
                // Check if profile exists
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single()

                if (!profile?.username) {
                    router.push('/onboarding')
                } else {
                    router.push('/dashboard')
                }
            } else {
                router.push('/login')
            }
        }

        handleCallback()
    }, [router])

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
    )
}
