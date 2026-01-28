
"use client"

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calculateTotalScore, calculateQuestionScore, Question } from '@/lib/scoring'
import surveyData from '@/data/survey_questions.json'
import { addDays, startOfYear, endOfYear, eachWeekOfInterval, format, addWeeks } from 'date-fns'
import {
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Sparkles,
    Trophy,
    TrendingUp,
    AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NewSurveyPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)
    const [responses, setResponses] = useState<Record<string, string | number>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submissionResult, setSubmissionResult] = useState<any>(null) // New state for summary

    const [selectedWeek, setSelectedWeek] = useState<string>('')
    const [weeks, setWeeks] = useState<any[]>([])
    const [loadingWeeks, setLoadingWeeks] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Calculate real-time score
    const allQuestions = useMemo(() => (surveyData as any).flatMap((cat: any) => cat.questions) as Question[], [])
    const currentScore = useMemo(() => calculateTotalScore(responses, allQuestions), [responses, allQuestions])

    useEffect(() => {
        const fetchWeeks = async () => {
            try {
                // 1. Fetch/Seed Weeks
                const { data: existingWeeks } = await supabase
                    .from('survey_weeks')
                    .select('*')
                    .eq('year', 2026)
                    .order('week_number', { ascending: true })

                if (existingWeeks && existingWeeks.length > 0) {
                    setWeeks(existingWeeks)
                    const today = new Date().toISOString().split('T')[0]
                    const current = existingWeeks.find(w => today >= w.start_date && today <= w.end_date)
                    setSelectedWeek(current ? current.id : existingWeeks[0].id)
                } else {
                    console.log('Seeding 2026 weeks...')
                    const startDate = startOfYear(new Date(2026, 0, 1))
                    const weeksToInsert = []
                    let currentStart = startDate
                    for (let i = 1; i <= 52; i++) {
                        const currentEnd = addDays(currentStart, 6)
                        weeksToInsert.push({
                            year: 2026,
                            week_number: i,
                            start_date: format(currentStart, 'yyyy-MM-dd'),
                            end_date: format(currentEnd, 'yyyy-MM-dd')
                        })
                        currentStart = addWeeks(currentStart, 1)
                    }
                    const { data: insertedWeeks } = await supabase
                        .from('survey_weeks')
                        .insert(weeksToInsert)
                        .select()
                        .order('week_number', { ascending: true })

                    if (insertedWeeks) {
                        setWeeks(insertedWeeks)
                        setSelectedWeek(insertedWeeks[0].id)
                    }
                }

                // 2. Auto-seed Questions
                const questionsToUpsert = allQuestions.map(q => ({
                    id: q.id,
                    question_text: q.text,
                    question_type: q.type,
                    point_value: q.points || 0,
                    is_active: true
                    // We map JSON 'mapping' to options if needed, or store it in a metadata column if schema supported it. 
                    // For now we just ensure ID exists.
                }))

                const { error: qError } = await supabase
                    .from('survey_questions')
                    .upsert(questionsToUpsert, { onConflict: 'id' })

                if (qError) {
                    console.error('Error seeding questions:', qError)
                }

            } catch (err: any) {
                console.error('Error initializing data:', err)
                setError('Failed to load survey data. Please contact support.')
            } finally {
                setLoadingWeeks(false)
            }
        }

        fetchWeeks()
    }, [allQuestions]) // Depend on allQuestions to ensure it's available for seeding

    const steps = [
        { id: 'intro', title: 'Welcome' },
        ...surveyData.map(cat => ({ id: cat.category, title: cat.category, questions: cat.questions }))
    ]

    const currentCategory = steps[currentStep]
    const isLastStep = currentStep === steps.length - 1

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
            window.scrollTo(0, 0)
        }
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
            window.scrollTo(0, 0)
        }
    }

    const handleResponse = (questionId: string, value: string | number) => {
        setResponses(prev => ({ ...prev, [questionId]: value }))
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setError(null)

        const totalScore = calculateTotalScore(responses, allQuestions)
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            setIsSubmitting(false)
            return
        }

        // 1. Upsert survey submission
        const { data: submission, error: subError } = await supabase
            .from('survey_submissions')
            .upsert({
                profile_id: session.user.id,
                week_id: selectedWeek,
                total_score: totalScore,
                submitted_at: new Date().toISOString()
            }, {
                onConflict: 'profile_id, week_id'
            })
            .select()
            .single()

        if (subError) {
            console.error('Submission error:', subError)
            setError(subError.message || 'Failed to submit survey.')
            setIsSubmitting(false)
            return
        }

        // 2. Delete old responses
        await supabase.from('survey_responses').delete().eq('submission_id', submission.id)

        // 3. Insert new responses
        const responseInserts = Object.entries(responses).map(([questionId, value]) => {
            const question = allQuestions.find(q => q.id === questionId)
            const pts = question ? calculateQuestionScore(question, value) : 0
            return {
                submission_id: submission.id,
                question_id: questionId,
                response_value: value.toString(),
                points_earned: pts
            }
        })

        const { error: resError } = await supabase.from('survey_responses').insert(responseInserts)

        if (resError) {
            console.error('Responses error:', resError)
            setError(resError.message || 'Error saving details.')
            setIsSubmitting(false)
        } else {
            // 4. Update Profile Total Points
            const { data: allSubs } = await supabase
                .from('survey_submissions')
                .select('total_score')
                .eq('profile_id', session.user.id)

            const newGrandTotal = allSubs?.reduce((acc, curr) => acc + (curr.total_score || 0), 0) || 0

            await supabase.from('profiles').update({ total_points: newGrandTotal }).eq('id', session.user.id)

            // 5. Show Summary instead of redirecting immediately
            setSubmissionResult({
                totalScore,
                breakdown: surveyData.map(cat => {
                    const catQuestions = cat.questions as Question[]
                    const catMax = catQuestions.reduce((acc, q) => {
                        if (q.mapping) {
                            return acc + Math.max(...Object.values(q.mapping));
                        }
                        if (q.type === 'likert') {
                            return acc + 8; // New max score for Likert is 8
                        }
                        return acc + (q.points || 0);
                    }, 0)
                    const catScore = catQuestions.reduce((acc, q) => {
                        const val = responses[q.id]
                        return acc + (val !== undefined ? calculateQuestionScore(q, val) : 0)
                    }, 0)
                    return {
                        category: cat.category,
                        score: catScore,
                        max: catMax,
                        percent: catMax > 0 ? (catScore / catMax) * 100 : 0
                    }
                })
            })
            setIsSubmitting(false)
        }
    }

    if (submissionResult) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-8">
                <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                        <Trophy className="w-12 h-12" />
                    </div>
                    <h1 className="text-3xl font-bold">Submission Complete!</h1>
                    <p className="text-slate-400">Way to stay locked in. Here is your breakdown.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Total Score</p>
                    <p className="text-5xl font-black text-white">{submissionResult.totalScore}</p>
                </div>

                <div className="grid gap-4">
                    {submissionResult.breakdown.map((item: any, i: number) => (
                        <div key={i} className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="font-bold text-sm">{item.category}</p>
                                <p className="text-xs text-slate-500">{item.score}/{item.max} Points</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className={cn(
                                        "font-bold text-sm",
                                        item.percent >= 80 ? "text-emerald-400" :
                                            item.percent >= 50 ? "text-amber-400" : "text-rose-400"
                                    )}>
                                        {item.percent >= 80 ? 'Excellent' : item.percent >= 50 ? 'Good' : 'Needs Work'}
                                    </p>
                                    <p className="text-xs text-slate-500">{item.percent.toFixed(0)}%</p>
                                </div>
                                <div className={cn(
                                    "w-2 h-10 rounded-full",
                                    item.percent >= 80 ? "bg-emerald-500" :
                                        item.percent >= 50 ? "bg-amber-500" : "bg-rose-500"
                                )} />
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl"
                >
                    Return to Dashboard
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 space-y-8 min-h-[80vh] flex flex-col relative">
            {/* Sticky Score Indicator */}
            {currentStep > 0 && (
                <div className="fixed top-24 right-4 md:right-8 bg-slate-900/90 backdrop-blur border border-indigo-500/30 p-3 rounded-2xl shadow-xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Unsaved Score</p>
                        <p className="text-xl font-black text-white">{currentScore}</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-2xl flex items-start gap-3 backdrop-blur-md z-50 shadow-xl">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <div className="flex-1 text-sm">
                        <p className="font-bold text-red-100">Error</p>
                        <p>{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
                        <CheckCircle2 className="w-5 h-5 rotate-45" />
                    </button>
                </div>
            )}

            {/* Progress Bar */}
            <div className="flex gap-2">
                {steps.map((step, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-1.5 flex-1 rounded-full transition-all duration-500",
                            i <= currentStep ? "bg-indigo-500" : "bg-slate-800"
                        )}
                    />
                ))}
            </div>

            <div className="flex-1 space-y-8 animate-in slide-in-from-right-4 duration-500">
                {currentStep === 0 ? (
                    <div className="space-y-6 text-center py-12">
                        <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                            <Sparkles className="w-10 h-10 text-indigo-500" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">Time for the Audit.</h1>
                        <p className="text-slate-400 text-lg max-w-sm mx-auto leading-relaxed">
                            We'll walk through 6 dimensions of your life this week. Be honest—you're only competing with who you were yesterday.
                        </p>

                        {/* Week Selector */}
                        <div className="max-w-xs mx-auto pt-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Week</label>
                            {loadingWeeks ? (
                                <div className="h-12 w-full bg-slate-900/50 rounded-xl animate-pulse border border-slate-800" />
                            ) : (
                                <select
                                    value={selectedWeek}
                                    onChange={(e) => setSelectedWeek(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 outline-none focus:border-indigo-500 font-medium appearance-none text-center cursor-pointer hover:border-slate-700 transition-colors"
                                >
                                    {weeks.map(week => (
                                        <option key={week.id} value={week.id}>
                                            Week {week.week_number}: {format(new Date(week.start_date), 'MMM d')} - {format(new Date(week.end_date), 'MMM d')}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="pt-8">
                            <button
                                onClick={handleNext}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-2xl transition-all flex items-center gap-2 mx-auto"
                            >
                                Let's get started
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10">
                        <header className="space-y-2">
                            <span className="text-indigo-400 font-bold text-sm tracking-widest uppercase">Section {currentStep} of {steps.length - 1}</span>
                            <h2 className="text-3xl font-bold">{currentCategory.title}</h2>
                        </header>

                        <div className="space-y-12">
                            {(currentCategory as any).questions?.map((q: any) => {
                                const currentVal = responses[q.id]
                                const currentPoints = currentVal !== undefined ? calculateQuestionScore(q as Question, currentVal) : 0

                                return (
                                    <div key={q.id} className="space-y-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <p className="text-lg font-medium text-slate-200">{q.text}</p>
                                            {currentVal !== undefined && (
                                                <span className="shrink-0 text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-lg">
                                                    +{currentPoints} pts
                                                </span>
                                            )}
                                        </div>

                                        {q.type === 'likert' && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
                                                    <span>Not at all</span>
                                                    <span>Above & Beyond</span>
                                                </div>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {[1, 2, 3, 4, 5].map((val) => (
                                                        <button
                                                            key={val}
                                                            onClick={() => handleResponse(q.id, val)}
                                                            className={cn(
                                                                "py-4 rounded-xl border font-bold transition-all relative overflow-hidden",
                                                                responses[q.id] === val
                                                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                                                                    : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                                                            )}
                                                        >
                                                            {val}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {(q.type === 'binary' || q.type === 'multi') && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* Logic to determine options: use 'options' array if present, else infer or use keys from mapping */}
                                                {(q.options || (q.mapping ? Object.keys(q.mapping) : ['Yes', 'No'])).map((opt: any) => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => handleResponse(q.id, opt)}
                                                        className={cn(
                                                            "py-4 px-6 rounded-xl border font-medium text-left transition-all flex items-center justify-between",
                                                            responses[q.id] === opt
                                                                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                                                                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                                                        )}
                                                    >
                                                        {opt}
                                                        {responses[q.id] === opt && <CheckCircle2 className="w-5 h-5 text-white" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {currentStep > 0 && (
                <div className="pt-12 flex justify-between items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-4 px-6"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back
                    </button>

                    {isLastStep ? (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-2xl transition-all flex items-center gap-2 group disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Submit Audit
                                    <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-2xl transition-all flex items-center gap-2 group shadow-lg shadow-indigo-600/20"
                        >
                            Continue
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
