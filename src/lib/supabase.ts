import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getURL = () => {
    let url =
        (typeof window !== 'undefined' && window.location.origin ? window.location.origin : '') ??
        process?.env?.NEXT_PUBLIC_VERCEL_URL ??
        'http://localhost:3000/'

    // Make sure to include `https://` when not localhost
    url = url.includes('http') ? url : `https://${url}`
    // Make sure to include a trailing `/`
    url = url.endsWith('/') ? url : `${url}/`
    return url
}
