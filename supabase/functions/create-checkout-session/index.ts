// supabase/functions/create-checkout-session/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not configured.");
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { priceId, priceAmount, title, mode = "subscription", userId, successUrl, cancelUrl, itemId, itemType } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Look up or create the Stripe customer
    const { data: profile, error: profileErr } = await supabaseClient
      .from("profiles")
      .select("id, email, username, stripe_customer_id")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      throw new Error("User profile not found in Supabase.");
    }

    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || `${profile.username || "user"}@xtrapath.com`,
        metadata: {
          supabase_user_id: userId,
        },
      });
      customerId = customer.id;

      // Store stripe_customer_id in Supabase
      await supabaseClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    // 2. Build the Checkout session parameters
    const origin = req.headers.get("origin") || "https://xtrapath.com";

    let lineItems = [];
    if (mode === "payment" && !priceId) {
      const unitAmount = (priceAmount && priceAmount > 0) ? priceAmount : 499;
      lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: title || `XtraPath ${itemType || "Creation"}`,
              description: `Instant digital access on XtraPath`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ];
    } else {
      lineItems = [
        {
          price: priceId || "price_xtrapath_pro_monthly",
          quantity: 1,
        },
      ];
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
      success_url: successUrl || `${origin}/views/dashboard.html?session_id={CHECKOUT_SESSION_ID}&status=success&unlocked_id=${itemId || ""}`,
      cancel_url: cancelUrl || `${origin}/views/dashboard.html?status=canceled`,
      metadata: {
        supabase_user_id: userId,
        item_id: itemId || "pro_plan",
        item_type: itemType || "subscription",
      },
    };

    if (mode === "subscription") {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);


    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to create checkout session." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
