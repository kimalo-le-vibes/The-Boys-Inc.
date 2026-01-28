export type QuestionType = 'likert' | 'binary' | 'multi' | 'directional'

export interface Question {
    id: string
    text: string
    type: QuestionType
    points?: number
    options?: string[]
    mapping?: Record<string, number>
    invert?: boolean
}

export function calculateQuestionScore(question: Question, value: string | number): number {
    switch (question.type) {
        case 'likert': {
            const scalePoints = [0, 1, 3, 5, 8]
            let numValue = typeof value === 'string' ? parseInt(value) : (value as number)
            let index = numValue - 1
            if (question.invert) {
                index = 4 - index
            }
            if (index >= 0 && index < scalePoints.length) {
                return scalePoints[index]
            }
            return 0
        }

        case 'binary':
        case 'multi':
            if (question.mapping && (typeof value === 'string' || typeof value === 'number')) {
                if (question.mapping[value.toString()] !== undefined) {
                    return question.mapping[value.toString()]
                }
                const key = Object.keys(question.mapping).find(k => k.toLowerCase() === value.toString().toLowerCase())
                if (key) return question.mapping[key]
            }
            if (question.type === 'binary' && !question.mapping) {
                const strVal = value.toString().toLowerCase()
                return (strVal === 'yes' || strVal === 'true') ? (question.points || 0) : 0
            }
            return 0

        case 'directional':
            return typeof value === 'number' ? value : 0

        default:
            return 0
    }
}

export function calculateTotalScore(responses: Record<string, string | number>, questions: Question[]): number {
    return questions.reduce((acc, question) => {
        const response = responses[question.id]
        if (response !== undefined) {
            return acc + calculateQuestionScore(question, response)
        }
        return acc
    }, 0)
}
