"use client"

import { useState, useEffect } from 'react'
import { CategoryChart } from '@/components/CategoryChart'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import {
    Award,
    TrendingUp,
    Clock,
    Settings as SettingsIcon,
    MapPin,
    Calendar,
    Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { UserAvatar } from '@/components/UserAvatar'

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null)
    const [performanceData, setPerformanceData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfileData = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // 1. Fetch Profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

            if (profile) {
                setUser(profile)
            }

            // 2. Fetch Recent Submissions for Chart
            const { data: submissions } = await supabase
                .from('survey_submissions')
                .select('submitted_at, total_score')
                .eq('profile_id', session.user.id)
                .order('submitted_at', { ascending: true })
                .limit(5)

            if (submissions) {
                const chartData = submissions.map((s, i) => ({
                    week: `W${i + 1}`,
                    points: s.total_score
                }))
                setPerformanceData(chartData)
            }
            setLoading(false)
        }

        fetchProfileData()
    }, [])

    if (loading) {
        return <div className="p-12 text-center text-slate-500">Loading profile...</div>
    }

    return (
        <div className="pb-24 px-4 pt-6 space-y-8 animate-in fade-in duration-700 max-w-lg mx-auto">
            {/* Profile Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5 min-w-0">
                    <div className="relative shrink-0">
                        <UserAvatar
                            url={user?.avatar_url}
                            name={user?.full_name}
                            username={user?.username}
                            size="lg"
                            className="rounded-2xl shadow-lg border-2 border-slate-800"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-slate-950 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-1 min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight truncate">{user?.full_name || user?.username || 'Traveler'}</h1>
                        <p className="text-slate-400 font-medium text-sm truncate">@{user?.username || 'user'}</p>
                        <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Global</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {user?.created_at ? new Date(user.created_at).getFullYear() : '2026'}</span>
                        </div>
                    </div>
                </div>

                <Link href="/settings" className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0">
                    <SettingsIcon className="w-5 h-5" />
                </Link>
            </div>

            {/* Achievements Scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {[
                    { label: 'Total Points', value: (user?.total_points || 0).toLocaleString(), icon: Trophy, bg: 'bg-indigo-500/10 text-indigo-400' },
                    { label: 'Streak', value: '0 Days', icon: Clock, bg: 'bg-emerald-500/10 text-emerald-400' },
                    { label: 'Status', value: 'Verified', icon: Award, bg: 'bg-yellow-500/10 text-yellow-500' },
                ].map((item, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 p-3 rounded-xl min-w-[100px] flex-1">
                        <item.icon className={cn("w-4 h-4 mb-2", item.bg.split(' ')[1])} />
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{item.label}</p>
                        <p className="font-bold text-sm text-slate-200">{item.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="space-y-6">
                {/* Category Radar Chart */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="font-bold text-sm">Category Breakdown</h3>
                    </div>
                    <div className="h-[250px] w-full -ml-2">
                        <CategoryChart />
                    </div>
                </div>

                {/* Performance Chart */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-sm">Score History</h3>
                        <div className="flex gap-1">
                            <span className="px-2 py-1 bg-indigo-600 rounded-lg text-[10px] font-bold text-white">Monthly</span>
                        </div>
                    </div>

                    <div className="h-[200px] w-full">
                        {performanceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceData}>
                                    <defs>
                                        <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis
                                        dataKey="week"
                                        stroke="#475569"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#475569"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                        width={30}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                                        itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="points"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorPoints)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                                No performance history yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

