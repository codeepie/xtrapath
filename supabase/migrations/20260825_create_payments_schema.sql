-- =======================================================
-- XTRAPATH PAYMENTS & SUBSCRIPTIONS SCHEMA (STRIPE SYNC)
-- =======================================================

-- 1. Extend the profiles table for Pro status and Stripe Customer ID
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    status TEXT NOT NULL, -- 'active', 'trialing', 'past_due', 'canceled', 'unpaid'
    price_id TEXT NOT NULL,
    plan_interval TEXT DEFAULT 'month', -- 'month' or 'year'
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. One-Time Purchases Table (Courses, Books, Asset Packs)
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL, -- 'course', 'book', 'asset_pack', 'template'
    amount INTEGER NOT NULL, -- In cents (e.g. 1500 = $15.00)
    currency TEXT DEFAULT 'usd',
    stripe_session_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- 6. Policies for Purchases
CREATE POLICY "Users can view their own purchases"
ON public.purchases FOR SELECT
USING (auth.uid() = user_id);

-- 7. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
