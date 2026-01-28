"use client"

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer
} from 'recharts'

const data = [
    { subject: 'Spiritual', A: 120, fullMark: 150 },
    { subject: 'Moral', A: 98, fullMark: 150 },
    { subject: 'Fitness', A: 86, fullMark: 150 },
    { subject: 'Financial', A: 99, fullMark: 150 },
    { subject: 'Social', A: 85, fullMark: 150 },
    { subject: 'Career', A: 65, fullMark: 150 },
]

export function CategoryChart() {
    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                    <Radar
                        name="You"
                        dataKey="A"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.6}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}
