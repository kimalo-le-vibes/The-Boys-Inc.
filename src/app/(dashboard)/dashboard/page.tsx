"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Plus, ChevronRight, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null)
    const [topUsers, setTopUsers] = useState<any[]>([])
    const [rank, setRank] = useState<number | string>('-')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboardData = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // 1. Fetch Top 5 Users for Leaderboard Preview
            const { data: allProfiles } = await supabase
                .from('profiles')
                .select('*')
                .order('total_points', { ascending: false })

            if (allProfiles) {
                // Determine current user rank
                const myIndex = allProfiles.findIndex(p => p.id === session.user.id)
                if (myIndex !== -1) {
                    setRank(myIndex + 1)
                    setUser(allProfiles[myIndex])
                }

                // Format top 4 for preview
                const top4 = allProfiles.slice(0, 4).map((p, index) => ({
                    id: p.id,
                    rank: index + 1,
                    name: p.full_name || p.username || 'User',
                    points: p.total_points || 0,
                    avatar: p.avatar_url || (p.username ? p.username[0].toUpperCase() : 'U'),
                    isMe: p.id === session.user.id
                }))
                setTopUsers(top4)
            }
            setLoading(false)
        }

        fetchDashboardData()
    }, [])

    return (
        <div className="pb-24 px-4 pt-6 space-y-6 max-w-lg mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                    {loading ? 'Welcome back...' : `Welcome back, ${user?.username || 'Traveler'}`}
                </h1>
                <p className="text-slate-500 text-sm">Here's your weekly progress</p>
            </div>

            {/* AI Insights Card (Simplified Dynamic) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 shadow-xl">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative space-y-3">
                    <div className="flex items-center gap-2 text-indigo-200">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">AI Insights</span>
                    </div>
                    <p className="text-white text-base leading-relaxed">
                        {loading ? 'Analyzing your performance...' :
                            rank === 1 ? "Incredible work! You're currently ranked #1. Keep maintaining this consistency." :
                                `You're currently ranked #${rank}. Push a bit harder in Fitness to climb the leaderboard!`}
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-xs font-medium mb-1">Total Points</p>
                    <p className="text-2xl font-bold">{loading ? '...' : (user?.total_points || 0).toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-xs font-medium mb-1">Current Rank</p>
                    <p className="text-2xl font-bold text-indigo-400">#{rank}</p>
                </div>
            </div>

            {/* Leaderboard Preview */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Leaderboard Top 4</h2>
                    <Link href="/leaderboard" className="text-sm font-medium text-indigo-400 flex items-center gap-1">
                        View All
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="space-y-3">
                    {loading ? (
                        [1, 2].map(i => <div key={i} className="h-16 w-full bg-slate-900/50 rounded-2xl animate-pulse" />)
                    ) : (
                        topUsers.map((user) => (
                            <Link key={user.id} href={`/leaderboard/${user.id}`}>
                                <div
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-2xl transition-all",
                                        user.isMe
                                            ? "bg-indigo-600/10 border border-indigo-500/30"
                                            : "bg-slate-900 border border-slate-800 hover:border-slate-700"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                                        user.rank === 1 ? "bg-yellow-500/20 text-yellow-500" : "bg-slate-800 text-slate-400"
                                    )}>
                                        {user.avatar.length > 2 ? <img src={user.avatar} className="w-full h-full object-cover rounded-xl" /> : user.avatar}
                                    </div>
                                    <div className="flex-1">
                                        <p className={cn("font-bold text-sm", user.isMe ? "text-indigo-400" : "text-white")}>
                                            {user.name}
                                        </p>
                                        <p className="text-xs text-slate-500">Rank #{user.rank}</p>
                                    </div>
                                    <span className="text-sm font-bold">{user.points.toLocaleString()}</span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {/* Floating Action Button */}
            <Link
                href="/survey/new"
                className="fixed bottom-24 right-6 w-16 h-16 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 z-40 group"
            >
                <Plus className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
            </Link>
        </div>
    )
}
