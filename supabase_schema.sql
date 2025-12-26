-- 1. users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    stripe_customer_id TEXT,
    role TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. books table
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_books_id TEXT UNIQUE,
    title TEXT NOT NULL,
    author TEXT,
    cover_url TEXT,
    amazon_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. commitments table
CREATE TABLE IF NOT EXISTS public.commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'defaulted')),
    deadline TIMESTAMPTZ NOT NULL,
    pledge_amount INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. verification_logs table
CREATE TABLE IF NOT EXISTS public.verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commitment_id UUID REFERENCES public.commitments(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    memo_text TEXT,
    ai_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Books table policies
CREATE POLICY "Anyone can view books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (true);

-- Commitments table policies
CREATE POLICY "Users can view their own commitments" ON public.commitments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own commitments" ON public.commitments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verification logs table policies
CREATE POLICY "Users can view their own verification logs" ON public.verification_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.commitments
        WHERE commitments.id = verification_logs.commitment_id
        AND commitments.user_id = auth.uid()
    )
);
