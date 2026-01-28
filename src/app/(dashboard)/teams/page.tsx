"use client"

import { useState, useEffect } from 'react'
import { Users, Plus, Shield, Search, ArrowRight, UserPlus, TrendingUp, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function TeamsPage() {
    const router = useRouter()
    const [isCreating, setIsCreating] = useState(false)
    const [teams, setTeams] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string>('')
    const [newTeamName, setNewTeamName] = useState('')
    const [newTeamDesc, setNewTeamDesc] = useState('')
    const [createError, setCreateError] = useState<string | null>(null)

    useEffect(() => {
        const fetchTeams = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) setUserId(session.user.id)

            // Fetch teams with members AND their profile points
            const { data: allTeams, error } = await supabase
                .from('teams')
                .select(`
                    id, 
                    name, 
                    description, 
                    created_by, 
                    team_members (
                        profile_id,
                        profiles ( total_points )
                    )
                `)
                .order('created_at', { ascending: false })

            if (allTeams) {
                const formatted = allTeams.map(t => {
                    // Calculate Total Team Points
                    const totalPoints = t.team_members.reduce((sum: number, m: any) => {
                        return sum + (m.profiles?.total_points || 0)
                    }, 0)

                    return {
                        id: t.id,
                        name: t.name,
                        description: t.description,
                        points: totalPoints,
                        members: t.team_members.length,
                        role: t.created_by === session?.user.id ? 'Leader' : t.team_members.find((m: any) => m.profile_id === session?.user.id) ? 'Member' : null,
                        avatar: t.name.substring(0, 2).toUpperCase(),
                        isMember: !!t.team_members.find((m: any) => m.profile_id === session?.user.id)
                    }
                })
                setTeams(formatted.sort((a, b) => b.points - a.points)) // Sort by points
            }
            setLoading(false)
        }

        fetchTeams()
    }, [isCreating])

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return
        setCreateError(null)

        try {
            // 1. Create Team
            const { data: team, error: teamError } = await supabase
                .from('teams')
                .insert({
                    name: newTeamName,
                    description: newTeamDesc,
                    created_by: userId
                })
                .select()
                .single()

            if (teamError) throw teamError

            // 2. Add creator as member
            const { error: memberError } = await supabase
                .from('team_members')
                .insert({
                    team_id: team.id,
                    profile_id: userId
                })

            if (memberError) throw memberError

            // Reset
            setNewTeamName('')
            setNewTeamDesc('')
            setIsCreating(false)
        } catch (err: any) {
            console.error('Error creating team:', err)
            setCreateError(err.message || 'Failed to create team')
        }
    }

    const handleJoinTeam = async (teamId: string) => {
        try {
            const { error } = await supabase
                .from('team_members')
                .insert({
                    team_id: teamId,
                    profile_id: userId
                })

            if (error) throw error

            // Optimistic update
            setTeams(teams.map(t => t.id === teamId ? { ...t, isMember: true, members: t.members + 1, role: 'Member' } : t))

        } catch (err) {
            console.error('Error joining team:', err)
            alert('Could not join team. You might already be a member.')
        }
    }

    return (
        <div className="pb-24 px-4 pt-6 space-y-8 animate-in fade-in duration-700 max-w-lg mx-auto">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
                    <p className="text-slate-500 text-sm">Collaboration is key.</p>
                </div>

                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 rounded-xl transition-all flex items-center gap-2"
                >
                    {isCreating ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    <span className="sr-only">{isCreating ? 'Cancel' : 'New Team'}</span>
                </button>
            </div>

            {/* Create Team Form */}
            {isCreating && (
                <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top-4">
                    <h3 className="font-bold text-lg">Create a New Team</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Team Name</label>
                            <input
                                value={newTeamName}
                                onChange={e => setNewTeamName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none focus:border-indigo-500 transition-colors"
                                placeholder="e.g. The Morning Crew"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Description (Optional)</label>
                            <input
                                value={newTeamDesc}
                                onChange={e => setNewTeamDesc(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none focus:border-indigo-500 transition-colors"
                                placeholder="What's your mission?"
                            />
                        </div>
                        {createError && <p className="text-red-400 text-xs">{createError}</p>}
                        <button
                            onClick={handleCreateTeam}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Team
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {loading ? (
                    [1, 2].map(i => <div key={i} className="h-40 w-full bg-slate-900/50 rounded-2xl animate-pulse" />)
                ) : teams.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        No teams found. Be the first to create one!
                    </div>
                ) : (
                    teams.map((team) => (
                        <div key={team.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-indigo-500/30 transition-colors group">
                            <div className="flex items-start justify-between">
                                <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-lg font-bold text-indigo-400">
                                    {team.avatar}
                                </div>
                                {team.isMember && (
                                    <div className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        team.role === 'Leader' ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800 text-slate-400"
                                    )}>
                                        {team.role}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="text-lg font-bold mb-1">{team.name}</h3>
                                <p className="text-xs text-slate-500 mb-2 min-h-[1.5em]">{team.description}</p>
                                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                                    <span className="flex items-center gap-1.5 ">
                                        <Users className="w-3.5 h-3.5" />
                                        {team.members} Members
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-800 mt-2">
                                {!team.isMember ? (
                                    <button
                                        onClick={() => handleJoinTeam(team.id)}
                                        className="w-full bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 font-bold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 group-hover:bg-slate-700"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Join Team
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button className="bg-slate-950 text-slate-500 font-bold py-2.5 rounded-xl text-xs cursor-default">
                                            Member
                                        </button>
                                        {team.role === 'Leader' && (
                                            <button
                                                onClick={() => router.push(`/teams/${team.id}`)}
                                                className="bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
                                            >
                                                Manage
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
