-- docs/database/01-user-feedbacks.sql

-- Buat tabel user_feedbacks
CREATE TABLE IF NOT EXISTS public.user_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    device_type TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.user_feedbacks ENABLE ROW LEVEL SECURITY;

-- Policy: User hanya bisa memasukkan feedback (insert)
DROP POLICY IF EXISTS "Users can insert their own feedbacks" ON public.user_feedbacks;
CREATE POLICY "Users can insert their own feedbacks" 
ON public.user_feedbacks 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Policy: User bisa melihat semua masukan
DROP POLICY IF EXISTS "Users can view all feedbacks" ON public.user_feedbacks;
CREATE POLICY "Users can view all feedbacks" 
ON public.user_feedbacks 
FOR SELECT 
TO authenticated 
USING (true);
