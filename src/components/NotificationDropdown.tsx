"use client"

import { useState } from 'react'
import { Bell, Sparkles, Trophy, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const mockNotifications = [
    { id: 1, type: 'rank', title: 'Rank Surpassed', message: 'John Doe just passed you in the Fitness category.', time: '2h ago', icon: Trophy, color: 'text-yellow-500' },
    { id: 2, type: 'team', title: 'New Team Member', message: 'Sarah Wilson joined Alpha Squad.', time: '5h ago', icon: Users, color: 'text-blue-500' },
    { id: 3, type: 'goal', title: 'Goal Achieved', message: 'You completed your 12-day discipline streak!', time: '1d ago', icon: Sparkles, color: 'text-indigo-500' },
]

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState(mockNotifications)

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border border-slate-950" />
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold">Notifications</h3>
                            <button onClick={() => setNotifications([])} className="text-xs text-slate-500 hover:text-white font-medium">Clear all</button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-800/50">
                            {notifications.length > 0 ? (
                                notifications.map((n) => (
                                    <div key={n.id} className="p-4 hover:bg-slate-800/50 transition-colors flex gap-4 group">
                                        <div className={cn("w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shrink-0", n.color.replace('text', 'bg') + '/10')}>
                                            <n.icon className={cn("w-5 h-5", n.color)} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-start">
                                                <p className="text-sm font-bold text-slate-200">{n.title}</p>
                                                <span className="text-[10px] text-slate-500 uppercase font-bold">{n.time}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center mx-auto mb-4">
                                        <Bell className="w-6 h-6 text-slate-700" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">All caught up!</p>
                                    <p className="text-xs text-slate-600">No new notifications at this time.</p>
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <button className="w-full py-3 text-xs font-bold text-indigo-400 border-t border-slate-800 hover:bg-indigo-500/5 transition-colors">
                                View All Activity
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
