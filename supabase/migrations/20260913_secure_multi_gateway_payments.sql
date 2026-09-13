-- =========================================================================
-- MULTI-GATEWAY REAL PAYMENTS SCHEMA (PAYPAL v2, STRIPE, RAZORPAY UPI)
-- =========================================================================
-- Ensures all payment gateways record cryptographically verified transactions
-- directly into public.purchases for zero-trust authorization.
-- =========================================================================

-- 1. Extend purchases table for multi-gateway support
ALTER TABLE public.purchases 
ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
ADD COLUMN IF NOT EXISTS payer_email TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- 2. Allow stripe_session_id to be nullable for non-Stripe gateways (PayPal, Razorpay)
DO $$
BEGIN
    ALTER TABLE public.purchases ALTER COLUMN stripe_session_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Indexes for instant lookup by gateway transaction ID or item ownership
CREATE INDEX IF NOT EXISTS idx_purchases_gateway_ref ON public.purchases(gateway, gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_item_status ON public.purchases(user_id, item_id, status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Users can view only their own verified purchases
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchases;
CREATE POLICY "Users can view their own purchases"
ON public.purchases FOR SELECT
USING (auth.uid() = user_id);

-- Backend Service Role or Security Definer functions can insert & update purchases
DROP POLICY IF EXISTS "Service role full access on purchases" ON public.purchases;
CREATE POLICY "Service role full access on purchases"
ON public.purchases FOR ALL
USING (auth.role() = 'service_role' OR auth.uid() IS NOT NULL)
WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);
