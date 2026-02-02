import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Stripe webhook endpoint
// Note: This is handled by Next.js API route at /api/stripe/webhook
// This Convex HTTP route is kept for potential direct Convex webhook handling
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    
    // Call the mutation to handle the webhook
    // The webhook is actually processed in Next.js API route which calls api.stripe.processWebhook
    await ctx.runMutation(api.stripe.processWebhook, body);
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
