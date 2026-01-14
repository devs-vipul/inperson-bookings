import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

export async function POST(request: NextRequest) {
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
        
        // Call Convex HTTP action to handle webhook
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (convexUrl) {
          const response = await fetch(`${convexUrl}/api/stripe/webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "checkout.session.completed",
              session: {
                id: session.id,
                customer: session.customer,
                subscription: session.subscription,
                metadata: session.metadata,
                amount_total: session.amount_total,
                currency: session.currency,
              },
            }),
          });

          if (!response.ok) {
            console.error("Failed to process webhook in Convex");
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        
        if (convexUrl) {
          await fetch(`${convexUrl}/api/stripe/webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: event.type,
              subscription: {
                id: subscription.id,
                customer: subscription.customer,
                status: subscription.status,
                metadata: subscription.metadata,
              },
            }),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        
        if (convexUrl) {
          await fetch(`${convexUrl}/api/stripe/webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "customer.subscription.deleted",
              subscription: {
                id: subscription.id,
                customer: subscription.customer,
                metadata: subscription.metadata,
              },
            }),
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        
        if (convexUrl) {
          await fetch(`${convexUrl}/api/stripe/webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "invoice.payment_succeeded",
              invoice: {
                id: invoice.id,
                subscription: invoice.subscription,
                customer: invoice.customer,
                amount_paid: invoice.amount_paid,
                currency: invoice.currency,
              },
            }),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        
        if (convexUrl) {
          await fetch(`${convexUrl}/api/stripe/webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "invoice.payment_failed",
              invoice: {
                id: invoice.id,
                subscription: invoice.subscription,
                customer: invoice.customer,
              },
            }),
          });
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
