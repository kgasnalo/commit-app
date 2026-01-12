-- Add Stripe payment method fields to users table
-- These fields store card information for off-session penalty charges

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS card_last_four TEXT,
ADD COLUMN IF NOT EXISTS card_brand TEXT;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
ON public.users(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.users.stripe_payment_method_id IS 'Stripe PaymentMethod ID for off-session charges (The Reaper)';
COMMENT ON COLUMN public.users.card_last_four IS 'Last 4 digits of saved card for display';
COMMENT ON COLUMN public.users.card_brand IS 'Card brand (visa, mastercard, etc.) for display';
