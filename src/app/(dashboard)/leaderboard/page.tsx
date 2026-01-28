"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, Medal, Users, TrendingUp, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// Fallback empty while loading or if no data
const mockTeams = [
    { id: 1, name: 'Alpha Squad', members: 4, points: 5200, rank: 1, avatar: 'AS' },
    { id: 2, name: 'The Avengers', members: 3, points: 4100, rank: 2, avatar: 'TA' },
    { id: 3, name: 'Morning Huddle', members: 5, points: 3800, rank: 3, avatar: 'MH' },
]

export default function LeaderboardPage() {
    const [teams, setTeams] = useState<any[]>([])
    const [view, setView] = useState<'individuals' | 'teams'>('individuals')
    const [search, setSearch] = useState('')
    const [individuals, setIndividuals] = useState<any[]>([])
    const [currentUserId, setCurrentUserId] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            // Get current user for highlighting
            const { data: { session } } = await supabase.auth.getSession()
            setCurrentUserId(session?.user?.id || '')

            // 1. Fetch Individuals
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .order('total_points', { ascending: false })
                .limit(50)

            if (profiles) {
                const formatted = profiles.map((p, index) => ({
                    id: p.id,
                    name: p.full_name || p.username || 'User',
                    username: p.username,
                    points: p.total_points || 0,
                    rank: index + 1,
                    avatar: p.avatar_url || (p.username ? p.username[0].toUpperCase() : 'U'),
                    change: '0',
                    isMe: p.id === session?.user?.id
                }))
                setIndividuals(formatted)
            }

            // 2. Fetch Teams and Aggregate Points
            const { data: teamsData } = await supabase
                .from('teams')
                .select('*, team_members(profile_id, profiles(total_points))')

            if (teamsData) {
                const formattedTeams = teamsData.map((t) => {
                    const members = t.team_members || []
                    const teamPoints = members.reduce((acc: number, m: any) => acc + (m.profiles?.total_points || 0), 0)
                    return {
                        id: t.id,
                        name: t.name,
                        members: members.length,
                        points: teamPoints,
                        avatar: t.name.substring(0, 2).toUpperCase()
                    }
                })
                // Sort by points
                formattedTeams.sort((a, b) => b.points - a.points)
                // Assign Ranks
                const rankedTeams = formattedTeams.map((t, idx) => ({ ...t, rank: idx + 1 }))
                setTeams(rankedTeams)
            }

            setLoading(false)
        }

        fetchData()
    }, [])

    const filteredList = view === 'individuals'
        ? individuals.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.username.toLowerCase().includes(search.toLowerCase()))
        : teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="pb-24 px-4 pt-6 space-y-6 animate-in fade-in duration-700 max-w-lg mx-auto">
            <div className="flex flex-col gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
                    <p className="text-slate-500 text-sm">Discipline meets competition.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                        onClick={() => setView('individuals')}
                        className={cn(
                            "py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2",
                            view === 'individuals' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        Individuals
                    </button>
                    <button
                        onClick={() => setView('teams')}
                        className={cn(
                            "py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2",
                            view === 'teams' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Teams
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    placeholder={`Search ${view}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition-colors text-sm"
                />
            </div>

            <div className="space-y-4 min-h-[300px]">
                {loading && view === 'individuals' ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 w-full bg-slate-900/50 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    filteredList.map((item) => {
                        // Render content first
                        const content = (
                            <div className={cn(
                                "flex items-center gap-4 p-4 rounded-2xl transition-all border w-full",
                                (item as any).isMe
                                    ? "bg-indigo-600/10 border-indigo-500/30"
                                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                            )}>
                                <div className="flex flex-col items-center justify-center min-w-[24px]">
                                    {item.rank === 1 && <Medal className="w-4 h-4 text-yellow-500 mb-0.5" />}
                                    <span className={cn(
                                        "font-bold text-sm",
                                        item.rank === 1 ? "text-yellow-500" :
                                            item.rank === 2 ? "text-slate-300" :
                                                item.rank === 3 ? "text-amber-600" : "text-slate-500"
                                    )}>{item.rank}</span>
                                </div>

                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                                    {item.avatar.length > 2 ? <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" /> : item.avatar}
                                </div>

                                <div className="flex-1 min-w-0 text-left">
                                    <p className={cn("font-bold text-sm truncate", (item as any).isMe ? "text-indigo-400" : "text-slate-200")}>
                                        {item.name}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {view === 'individuals' ? `@${(item as any).username}` : `${(item as any).members} Members`}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="font-bold text-sm text-white">{item.points.toLocaleString()}</p>
                                    {view === 'individuals' && (item as any).change !== '0' && (
                                        <p className={cn(
                                            "text-[10px] font-bold",
                                            (item as any).change.startsWith('+') ? "text-emerald-400" : "text-rose-400"
                                        )}>
                                            {(item as any).change}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )

                        // Conditional linking
                        if (view === 'individuals') {
                            return (
                                <Link key={item.id} href={`/leaderboard/${item.id}`} className="block w-full">
                                    {content}
                                </Link>
                            )
                        }

                        return <div key={item.id}>{content}</div>
                    })
                )}
            </div>

            {/* Weekly Goal Card (Simplified for mobile) */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white overflow-hidden relative group mt-6">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="w-5 h-5 text-white/70" />
                    <h3 className="font-bold text-sm">Weekly Goal</h3>
                </div>
                <p className="text-indigo-100 text-xs leading-relaxed mb-4">
                    Reach top 10% to unlock "Discipline Master".
                </p>
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                        <span>Progress</span>
                        <span>85%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white w-[85%]" />
                    </div>
                </div>
            </div>
        </div>
    )
}
