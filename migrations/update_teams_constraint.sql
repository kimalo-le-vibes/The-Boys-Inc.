-- Update teams.created_by to SET NULL on user deletion
-- This prevents deletion errors when a team leader deletes their account
ALTER TABLE public.teams 
DROP CONSTRAINT IF EXISTS teams_created_by_fkey;

ALTER TABLE public.teams
ADD CONSTRAINT teams_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;
