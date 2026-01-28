"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'Teams', href: '/teams', icon: Users },
    { name: 'Profile', href: '/profile', icon: User },
]

export function BottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 z-50 safe-area-inset-bottom">
            <div className="flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[70px]",
                                isActive
                                    ? "text-indigo-400"
                                    : "text-slate-500 active:scale-95"
                            )}
                        >
                            <item.icon className={cn(
                                "w-6 h-6 transition-colors",
                                isActive ? "text-indigo-400" : "text-slate-500"
                            )} />
                            <span className={cn(
                                "text-xs font-medium",
                                isActive ? "text-indigo-400" : "text-slate-500"
                            )}>{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
