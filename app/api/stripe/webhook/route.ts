import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "Convex URL not configured" },
      { status: 500 }
    );
  }
  const convexClient = new ConvexHttpClient(convexUrl);
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log("🎉 Checkout session completed:", session.id);
        console.log("📧 Customer:", session.customer);
        console.log("💳 Subscription:", session.subscription);
        console.log("📦 Metadata:", session.metadata);

        // Call Convex mutation directly
        try {
          console.log("📡 Calling Convex mutation directly...");

          await convexClient.mutation(api.stripe.processWebhook, {
            type: "checkout.session.completed",
            session: {
              id: session.id,
              customer: session.customer,
              subscription: session.subscription,
              metadata: session.metadata,
              amount_total: session.amount_total,
              currency: session.currency,
            },
          });

          console.log("✅ Convex webhook processed successfully!");
        } catch (error) {
          console.error("❌ Failed to process webhook in Convex:", error);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        try {
          await convexClient.mutation(api.stripe.processWebhook, {
            type: event.type,
            subscription: {
              id: subscription.id,
              customer: subscription.customer,
              status: subscription.status,
              metadata: subscription.metadata,
            },
          });
        } catch (error) {
          console.error("❌ Failed to process subscription webhook:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        try {
          await convexClient.mutation(api.stripe.processWebhook, {
            type: "customer.subscription.deleted",
            subscription: {
              id: subscription.id,
              customer: subscription.customer,
              metadata: subscription.metadata,
            },
          });
        } catch (error) {
          console.error(
            "❌ Failed to process subscription deleted webhook:",
            error
          );
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        try {
          await convexClient.mutation(api.stripe.processWebhook, {
            type: "invoice.payment_succeeded",
            invoice: {
              id: invoice.id,
              subscription: invoice.subscription,
              customer: invoice.customer,
              amount_paid: invoice.amount_paid,
              currency: invoice.currency,
            },
          });
        } catch (error) {
          console.error(
            "❌ Failed to process invoice payment succeeded webhook:",
            error
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        try {
          await convexClient.mutation(api.stripe.processWebhook, {
            type: "invoice.payment_failed",
            invoice: {
              id: invoice.id,
              subscription: invoice.subscription,
              customer: invoice.customer,
            },
          });
        } catch (error) {
          console.error(
            "❌ Failed to process invoice payment failed webhook:",
            error
          );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
