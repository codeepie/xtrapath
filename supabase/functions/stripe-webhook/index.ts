// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req: Request) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe keys not configured in Edge Function", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    switch (event.type) {
      // 1. Checkout completed (Subscription or One-time Purchase)
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (userId) {
          if (session.mode === "subscription") {
            // Upgrade user to Pro
            await supabaseClient
              .from("profiles")
              .update({ is_pro: true })
              .eq("id", userId);

            // Record active subscription
            if (session.subscription) {
              const sub = await stripe.subscriptions.retrieve(session.subscription as string);
              await supabaseClient.from("subscriptions").upsert({
                user_id: userId,
                stripe_subscription_id: sub.id,
                stripe_customer_id: sub.customer as string,
                status: sub.status,
                price_id: sub.items.data[0]?.price.id,
                plan_interval: sub.items.data[0]?.price.recurring?.interval || "month",
                current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                cancel_at_period_end: sub.cancel_at_period_end,
                updated_at: new Date().toISOString(),
              }, { onConflict: "stripe_subscription_id" });
            }
          } else if (session.mode === "payment") {
            // Record one-time marketplace purchase
            await supabaseClient.from("purchases").insert({
              user_id: userId,
              item_id: session.metadata?.item_id || "unknown_item",
              item_type: session.metadata?.item_type || "item",
              amount: session.amount_total || 0,
              currency: session.currency || "usd",
              stripe_session_id: session.id,
            });
          }
        }
        break;
      }

      // 2. Subscription updated (Renewal, Plan upgrade, Cancelation scheduled)
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Find user by stripe_customer_id
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          const isActive = ["active", "trialing"].includes(sub.status);
          await supabaseClient
            .from("profiles")
            .update({ is_pro: isActive })
            .eq("id", profile.id);

          await supabaseClient.from("subscriptions").upsert({
            user_id: profile.id,
            stripe_subscription_id: sub.id,
            stripe_customer_id: customerId,
            status: sub.status,
            price_id: sub.items.data[0]?.price.id,
            plan_interval: sub.items.data[0]?.price.recurring?.interval || "month",
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_subscription_id" });
        }
        break;
      }

      // 3. Subscription deleted / expired
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          // Revert Pro tier
          await supabaseClient
            .from("profiles")
            .update({ is_pro: false })
            .eq("id", profile.id);

          await supabaseClient
            .from("subscriptions")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`[Stripe Webhook Error]: ${err?.message}`);
    return new Response(`Webhook Error: ${err?.message || "Webhook error"}`, { status: 400 });
  }
});
