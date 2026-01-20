# 🚀 Production Deployment Guide

Complete step-by-step guide for deploying to production.

---

## 📋 Pre-Deployment Checklist

- [ ] Code is tested and working locally
- [ ] All environment variables are ready
- [ ] Stripe account is in **Live Mode**
- [ ] Clerk account is set up
- [ ] Resend account is configured
- [ ] Domain is ready (if using custom domain)

---

## Step 1: Deploy Convex to Production

### 1.1 Deploy Convex Backend

```bash
cd InPerson-bookings/bwf-fitness-inperson
npx convex deploy --prod
```

**What this does:**
- Creates a production Convex deployment
- Generates a production URL (e.g., `https://your-deployment.convex.cloud`)
- Deploys all Convex functions, queries, and mutations

### 1.2 Set Convex Environment Variables

After deployment, set production environment variables in Convex:

**Option A: Via CLI**
```bash
npx convex env set STRIPE_SECRET_KEY sk_live_... --prod
```

**Option B: Via Dashboard**
1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your **production** deployment
3. Navigate to **Settings → Environment Variables**
4. Add:
   - `STRIPE_SECRET_KEY` = `sk_live_...` (your live Stripe secret key)
   - `RESEND_API_KEY` = `re_...` (your Resend API key)
   - `RESEND_FROM_EMAIL` = `noreply@yourdomain.com` (your verified domain)

### 1.3 Verify Convex Deployment

- Check Convex Dashboard → Functions tab
- Verify all functions are deployed
- Test a query/mutation in the dashboard

**Save the production Convex URL** - you'll need it for Step 2.

---

## Step 2: Update Environment Variables for Production

### 2.1 Environment Variables to Change

| Variable | Development | Production |
|----------|------------|------------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://dev-deployment.convex.cloud` | `https://prod-deployment.convex.cloud` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_test_...` | `whsec_live_...` (new webhook) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` | `noreply@yourdomain.com` |
| `NEXT_PUBLIC_BYPASS_STRIPE` | `true` (testing) | `false` (production) |

### 2.2 Complete Production Environment Variables List

```env
# Convex (Production URL from Step 1)
NEXT_PUBLIC_CONVEX_URL=https://your-production-deployment.convex.cloud

# Stripe (LIVE MODE)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_... (from Step 3)

# Clerk (LIVE MODE)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Resend (Production)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Feature Flags
NEXT_PUBLIC_BYPASS_STRIPE=false
```

---

## Step 3: Set Up Stripe Webhook for Production

### 3.1 Switch Stripe to Live Mode

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle **Test mode** OFF (top right)
3. You're now in **Live mode**

### 3.2 Create Production Webhook

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-domain.vercel.app/api/stripe/webhook`
   - Replace `your-domain.vercel.app` with your actual Vercel domain
4. **Description**: "Production Webhook - In-Person Bookings"
5. **Select events to listen to**:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
6. Click **"Add endpoint"**

### 3.3 Get Webhook Signing Secret

1. After creating the webhook, click on it
2. Find **"Signing secret"** section
3. Click **"Reveal"** or **"Click to reveal"**
4. Copy the secret (starts with `whsec_`)
5. **Save this** - you'll add it to Vercel in Step 4

### 3.4 Verify Webhook is Active

- Status should show **"Enabled"**
- Recent events will show up after first payment
- You can send a test event to verify

---

## Step 4: Deploy to Vercel

### 4.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Select the repository: `breezeway-gym/In-Person`

### 4.2 Configure Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: `InPerson-bookings/bwf-fitness-inperson`
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 4.3 Add Environment Variables

In Vercel project settings → **Environment Variables**, add:

```
NEXT_PUBLIC_CONVEX_URL=https://your-production-deployment.convex.cloud
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_... (from Step 3.3)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_BYPASS_STRIPE=false
```

**Important:**
- Set all variables for **Production** environment
- Optionally set for **Preview** and **Development** if needed
- Click **"Save"** after adding each variable

### 4.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Note your deployment URL (e.g., `https://your-project.vercel.app`)

### 4.5 Update Stripe Webhook URL (if needed)

If your Vercel URL changed:
1. Go back to Stripe Dashboard → Webhooks
2. Edit your webhook endpoint
3. Update URL to: `https://your-actual-vercel-url.vercel.app/api/stripe/webhook`
4. Save changes

---

## Step 5: Verify Everything Works

### 5.1 Test Stripe Webhook

**Option A: Test via Stripe Dashboard**
1. Go to Stripe Dashboard → Webhooks → Your webhook
2. Click **"Send test webhook"**
3. Select event: `checkout.session.completed`
4. Click **"Send test webhook"**
5. Check Vercel logs to see if webhook was received

**Option B: Test with Real Payment**
1. Use a real test card: `4242 4242 4242 4242`
2. Complete a booking
3. Check Stripe Dashboard → Webhooks → Recent events
4. Verify event shows **"Succeeded"** (green checkmark)

### 5.2 Check Webhook Delivery

In Stripe Dashboard → Webhooks → Your webhook:
- **Recent events** tab should show events
- Status should be **"Succeeded"** (200 response)
- If failed, check:
  - Vercel logs for errors
  - Webhook URL is correct
  - `STRIPE_WEBHOOK_SECRET` matches

### 5.3 Verify Convex Integration

1. Go to Convex Dashboard → Logs
2. Look for webhook processing logs
3. Verify bookings are created
4. Check database for new records

### 5.4 Test Full Booking Flow

1. **Sign up/Login** via Clerk
2. **Select trainer and session**
3. **Book a slot** (will redirect to Stripe)
4. **Complete payment** with test card
5. **Verify**:
   - ✅ Redirected to confirmation page
   - ✅ Booking appears in "My Bookings"
   - ✅ Email received (check spam folder)
   - ✅ Stripe webhook shows as succeeded
   - ✅ Convex database has booking record

### 5.5 Check Email Delivery

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Check **"Sent"** tab
3. Verify emails are being sent
4. Check spam folder if not receiving

---

## Step 6: Monitor Production

### 6.1 Key Dashboards to Monitor

**Stripe Dashboard:**
- Payments → Check successful payments
- Customers → Verify customer creation
- Webhooks → Monitor webhook delivery
- Subscriptions → Check active subscriptions

**Convex Dashboard:**
- Logs → Check for errors
- Data → Verify bookings are created
- Functions → Monitor function execution

**Vercel Dashboard:**
- Logs → Check for runtime errors
- Analytics → Monitor traffic
- Functions → Check API route performance

**Resend Dashboard:**
- Emails → Monitor delivery rates
- Domains → Verify domain status

### 6.2 Common Issues to Watch For

**Webhook Failures:**
- Check `STRIPE_WEBHOOK_SECRET` matches
- Verify webhook URL is correct
- Check Vercel function logs

**Payment Issues:**
- Verify Stripe is in Live mode
- Check `STRIPE_SECRET_KEY` is live key
- Verify webhook events are being received

**Booking Not Created:**
- Check Convex logs
- Verify webhook is processing
- Check user exists in Convex database

**Email Not Sending:**
- Verify `RESEND_API_KEY` is correct
- Check `RESEND_FROM_EMAIL` is verified domain
- Check Resend dashboard for errors

---

## Step 7: Post-Deployment Checklist

- [ ] Convex deployed to production
- [ ] Convex environment variables set
- [ ] Stripe switched to Live mode
- [ ] Production webhook created
- [ ] Webhook signing secret added to Vercel
- [ ] All environment variables set in Vercel
- [ ] Vercel deployment successful
- [ ] Webhook test successful
- [ ] Test booking completed successfully
- [ ] Email received
- [ ] Booking appears in database
- [ ] Monitoring dashboards set up

---

## 🔧 Troubleshooting

### Webhook Not Receiving Events

1. **Check Webhook URL:**
   - Must be: `https://your-domain.vercel.app/api/stripe/webhook`
   - Must be HTTPS
   - No trailing slash

2. **Verify Secret:**
   - `STRIPE_WEBHOOK_SECRET` in Vercel must match Stripe
   - Copy from Stripe Dashboard → Webhooks → Signing secret

3. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your project → Logs
   - Look for webhook errors
   - Check for 400/500 responses

4. **Test Webhook:**
   - Stripe Dashboard → Webhooks → Send test webhook
   - Check if event appears in Vercel logs

### Payment Succeeds But Booking Not Created

1. **Check Convex Logs:**
   - Convex Dashboard → Logs
   - Look for webhook processing errors

2. **Verify User Exists:**
   - Check if user is synced to Convex
   - UserSync component should create user on login

3. **Check Webhook Metadata:**
   - Verify `clerkUserId` is in webhook metadata
   - Check Stripe session metadata

### Environment Variables Not Working

1. **Redeploy After Adding Variables:**
   - Vercel requires redeploy after adding env vars
   - Go to Deployments → Redeploy

2. **Check Variable Names:**
   - Must match exactly (case-sensitive)
   - `NEXT_PUBLIC_` prefix for client-side vars

3. **Verify Environment:**
   - Variables must be set for **Production** environment
   - Check all environments if needed

---

## 📞 Support Resources

- **Stripe Support**: [support.stripe.com](https://support.stripe.com)
- **Convex Docs**: [docs.convex.dev](https://docs.convex.dev)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Clerk Docs**: [clerk.com/docs](https://clerk.com/docs)
- **Resend Docs**: [resend.com/docs](https://resend.com/docs)

---

## ✅ Success Indicators

Your deployment is successful when:

1. ✅ Build completes without errors
2. ✅ Webhook receives test events
3. ✅ Test booking creates database record
4. ✅ Email is received
5. ✅ Booking appears in "My Bookings"
6. ✅ Stripe shows successful payment
7. ✅ Convex logs show no errors
8. ✅ All dashboards show healthy status

---

**Last Updated**: Production deployment guide v1.0
