"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, ChevronUp, MapPin, Calendar, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import surveyQuestions from '@/data/survey_questions.json'
import { format } from 'date-fns'

export default function UserHistoryPage() {
    const params = useParams()
    const router = useRouter()
    const userId = params.userId as string

    const [user, setUser] = useState<any>(null)
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({})

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return

            try {
                setLoading(true)

                // 1. Fetch Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single()

                if (profile) {
                    setUser(profile)
                }

                // 2. Fetch Submissions with Week info
                // We fake the join for now or assume we can fetch weeks.
                // Actually, let's fetch submissions and then manual join or just display date if week not available
                const { data: submissions } = await supabase
                    .from('survey_submissions')
                    .select('*, survey_weeks(*)')
                    .eq('profile_id', userId)
                    .order('submitted_at', { ascending: false })

                if (submissions && submissions.length > 0) {
                    // 3. For each submission, fetch responses to calculate category breakdown
                    const historyData = await Promise.all(submissions.map(async (sub) => {
                        const { data: responses } = await supabase
                            .from('survey_responses')
                            .select('*')
                            .eq('submission_id', sub.id)

                        // Calculate breakdown based on json mapping
                        const breakdownMap: Record<string, { current: number, max: number }> = {}

                        // Initialize categories from JSON
                        surveyQuestions.forEach(cat => {
                            breakdownMap[cat.category] = { current: 0, max: 0 }

                            // Calculate max possible for this category
                            cat.questions.forEach(q => {
                                // Max points per question is typically the point value (or max option mapping)
                                // Simplified max calculation:
                                let maxQ = 0
                                if (q.mapping) {
                                    maxQ = Math.max(...Object.values(q.mapping))
                                } else if (q.type === 'likert') {
                                    maxQ = 8 // New max score for Likert is 8
                                } else {
                                    maxQ = (q as any).points || 0
                                }
                                breakdownMap[cat.category].max += maxQ
                            })
                        })

                        // Fill in actuals
                        responses?.forEach(r => {
                            // Find question in JSON to know its category
                            let foundCat = ''
                            let foundQ = null

                            for (const cat of surveyQuestions) {
                                const q = cat.questions.find(quest => quest.id === r.question_id)
                                if (q) {
                                    foundCat = cat.category
                                    foundQ = q
                                    break
                                }
                            }

                            if (foundCat && breakdownMap[foundCat]) {
                                breakdownMap[foundCat].current += (r.points_earned || 0)
                            }
                        })

                        return {
                            id: sub.id,
                            week: sub.survey_weeks ? `Week ${sub.survey_weeks.week_number}` : format(new Date(sub.submitted_at), 'MMM d'),
                            total: sub.total_score,
                            breakdown: Object.entries(breakdownMap).map(([cat, val]) => ({
                                category: cat,
                                points: val.current,
                                max: val.max
                            }))
                        }
                    }))

                    setHistory(historyData)
                    // Expand first week by default
                    if (historyData.length > 0) {
                        setExpandedWeeks({ [historyData[0].week]: true })
                    }
                }

            } catch (err) {
                console.error('Error fetching history:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [userId])

    const toggleWeek = (week: string) => {
        setExpandedWeeks(prev => ({ ...prev, [week]: !prev[week] }))
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading history...</div>
    }

    if (!user) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">User not found.</div>
    }

    return (
        <div className="pb-24 px-4 pt-6 space-y-8 animate-in slide-in-from-right-8 duration-500 max-w-lg mx-auto">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                <h1 className="text-lg font-bold">Performance History</h1>
            </div>

            {/* User Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl relative">
                    {user.avatar_url || user.username?.[0]?.toUpperCase() || 'U'}
                    <div className="absolute -bottom-3 px-3 py-1 bg-amber-500 border-4 border-slate-950 rounded-full flex items-center justify-center text-xs font-black text-slate-950 shadow-lg">
                        #{user.rank || '-'}
                    </div>
                </div>
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold">{user.full_name || user.username}</h2>
                    <p className="text-slate-400 font-medium text-sm">@{user.username}</p>
                    <div className="flex items-center justify-center gap-3 pt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Global</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined 2026</span>
                    </div>
                </div>
            </div>

            {/* History List */}
            <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-lg">
                    <Trophy className="w-5 h-5 text-indigo-400" />
                    Weekly Log
                </h3>

                {history.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                        No history available yet.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((record, i) => (
                            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                                <button
                                    onClick={() => toggleWeek(record.week)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2 h-10 rounded-full",
                                            i === 0 ? "bg-emerald-500" : "bg-slate-700"
                                        )} />
                                        <div className="text-left">
                                            <p className="font-bold text-sm text-slate-200">{record.week}</p>
                                            <p className="text-xs text-slate-500">{record.total} Points</p>
                                        </div>
                                    </div>
                                    {expandedWeeks[record.week] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </button>

                                {/* Expanded Details */}
                                {expandedWeeks[record.week] && (
                                    <div className="p-4 pt-0 space-y-3 border-t border-slate-800/50 mt-2 bg-slate-950/30">
                                        {record.breakdown.map((item: any, idx: number) => (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-xs font-medium text-slate-400">
                                                    <span>{item.category}</span>
                                                    <span className="text-slate-200 font-bold">{item.points}/{item.max}</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${item.max > 0 ? (item.points / item.max) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
