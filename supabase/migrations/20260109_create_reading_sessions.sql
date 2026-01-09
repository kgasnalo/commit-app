-- Create reading_sessions table for Monk Mode timer logs
CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON public.reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_completed_at ON public.reading_sessions(completed_at);

-- Enable RLS
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own sessions
CREATE POLICY "Users can view their own reading sessions"
  ON public.reading_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading sessions"
  ON public.reading_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.reading_sessions IS 'Stores Monk Mode reading timer session logs';
COMMENT ON COLUMN public.reading_sessions.duration_seconds IS 'Duration of the completed reading session in seconds';
COMMENT ON COLUMN public.reading_sessions.book_id IS 'Optional reference to the book being read (null for general reading)';
