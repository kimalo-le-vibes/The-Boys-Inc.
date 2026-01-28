"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Users, UserPlus, Trash2, Shield, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export default function ManageTeamPage() {
    const params = useParams()
    const router = useRouter()
    const teamId = params.teamId as string

    const [team, setTeam] = useState<any>(null)
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [inviteStatus, setInviteStatus] = useState<string | null>(null)

    useEffect(() => {
        const fetchTeamData = async () => {
            setLoading(true)

            // 1. Fetch Team Details
            const { data: teamData } = await supabase
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single()

            setTeam(teamData)

            // 2. Fetch Members with Profiles
            const { data: memberData } = await supabase
                .from('team_members')
                .select(`
                    joined_at,
                    profiles (
                        id,
                        username,
                        full_name,
                        avatar_url,
                        total_points
                    )
                `)
                .eq('team_id', teamId)

            if (memberData) {
                setMembers(memberData.map((m: any) => ({
                    ...m.profiles,
                    joined_at: m.joined_at
                })))
            }
            setLoading(false)
        }

        fetchTeamData()
    }, [teamId])

    const handleSearchUser = async () => {
        if (!searchQuery.trim()) return

        const { data: users } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${searchQuery}%`)
            .limit(5)

        // Filter out existing members
        const filtered = users?.filter(u => !members.find(m => m.id === u.id)) || []
        setSearchResults(filtered)
    }

    const handleAddMember = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('team_members')
                .insert({
                    team_id: teamId,
                    profile_id: userId
                })

            if (error) throw error

            setInviteStatus('User added successfully!')
            setSearchResults(prev => prev.filter(u => u.id !== userId))
            // Refresh members (optimistic add)
            // Ideally trigger re-fetch or add to state manually. 
            // For now simple reload logic or append:
            const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', userId).single()
            setMembers([...members, newProfile])

        } catch (err: any) {
            console.error('Add failed:', err)
            setInviteStatus('Failed to add user.')
        }
    }

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return

        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('profile_id', userId)

        if (!error) {
            setMembers(members.filter(m => m.id !== userId))
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Loading team...</div>

    return (
        <div className="pb-24 px-4 pt-6 space-y-8 animate-in slide-in-from-right-8 duration-500 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                    <h1 className="text-lg font-bold">Manage Team</h1>
                    <p className="text-xs text-slate-500">{team?.name}</p>
                </div>
            </div>

            {/* Add Member Section */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-indigo-400" />
                    Add Members
                </h3>
                <div className="flex gap-2">
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search username..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-indigo-500"
                    />
                    <button
                        onClick={handleSearchUser}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 transition-colors"
                    >
                        <Search className="w-4 h-4" />
                    </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="space-y-2 mt-2">
                        {searchResults.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold overflow-hidden">
                                        {user.avatar_url && user.avatar_url.length > 2 ? (
                                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                                        ) : (
                                            user.username[0].toUpperCase()
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-slate-200">{user.username}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAddMember(user.id)}
                                    className="text-xs font-bold bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {inviteStatus && <p className="text-xs text-emerald-400">{inviteStatus}</p>}
            </div>

            {/* Members List */}
            <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    Team Members ({members.length})
                </h3>
                <div className="space-y-3">
                    {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sm font-bold border border-slate-700 overflow-hidden">
                                    {member.avatar_url && member.avatar_url.length > 2 ? (
                                        <img src={member.avatar_url} alt={member.username} className="w-full h-full object-cover" />
                                    ) : (
                                        member.username[0].toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-white">{member.full_name || member.username}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        {member.total_points} Pts • {team.created_by === member.id ? 'Leader' : 'Member'}
                                    </p>
                                </div>
                            </div>

                            {team.created_by !== member.id && (
                                <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            {team.created_by === member.id && (
                                <Shield className="w-4 h-4 text-indigo-500" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
