-- Reset all user points and remove activity logs
-- Execute this to "start from zero"

-- 1. Remove all survey responses (answers to questions)
TRUNCATE TABLE public.survey_responses CASCADE;

-- 2. Remove all survey submissions (weekly entries)
TRUNCATE TABLE public.survey_submissions CASCADE;

-- 3. Reset total points for all profiles
UPDATE public.profiles
SET total_points = 0;

-- 4. Clear all notifications
TRUNCATE TABLE public.notifications CASCADE;

-- Optional: If you want to clear teams too, uncomment below:
-- TRUNCATE TABLE public.teams CASCADE;
