"use client"

import { cn } from '@/lib/utils'

interface UserAvatarProps {
    url?: string
    name?: string
    username?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

export function UserAvatar({ url, name, username, size = 'md', className }: UserAvatarProps) {
    const initials = (name || username || 'U')[0].toUpperCase()

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs rounded-lg',
        md: 'w-10 h-10 text-sm rounded-xl',
        lg: 'w-16 h-16 text-xl rounded-2xl',
        xl: 'w-24 h-24 text-4xl rounded-3xl'
    }

    const isUrl = url && url.startsWith('http')

    return (
        <div className={cn(
            "bg-slate-800 border border-slate-700 flex items-center justify-center font-bold shrink-0 overflow-hidden text-slate-400",
            sizeClasses[size],
            className
        )}>
            {isUrl ? (
                <img
                    src={url}
                    alt={name || username || 'Avatar'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fallback on error (broken link)
                        (e.target as HTMLImageElement).style.display = 'none'
                        const parent = (e.target as HTMLImageElement).parentElement
                        if (parent) {
                            parent.innerHTML = initials
                        }
                    }}
                />
            ) : (
                initials
            )}
        </div>
    )
}
