"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    PlusCircle,
    Trophy,
    Users,
    User,
    Settings,
    LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'New Entry', href: '/survey/new', icon: PlusCircle },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'Teams', href: '/teams', icon: Users },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex flex-col h-screen w-64 bg-slate-950 text-slate-300 border-r border-slate-800 fixed left-0 top-0">
            <div className="p-6">
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                        G
                    </div>
                    The Great Lock-In
                </h1>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-indigo-600 text-white"
                                    : "hover:bg-slate-900 hover:text-white"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-colors",
                                isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                            )} />
                            <span className="font-medium text-sm">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 mt-auto border-t border-slate-800">
                <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors group">
                    <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                    <span className="font-medium text-sm">Logout</span>
                </button>
            </div>
        </div>
    )
}
