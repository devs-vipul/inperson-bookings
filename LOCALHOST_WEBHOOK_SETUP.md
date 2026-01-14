# Localhost Webhook Setup for Stripe

## Problem
Stripe webhooks need a publicly accessible URL, but your localhost (`http://localhost:3000`) is not accessible from the internet.

## Solution: Use Stripe CLI

Stripe CLI provides a tool to forward webhook events from Stripe to your local development server.

### Step 1: Install Stripe CLI

**macOS (Option 1 - Direct Download - Recommended if Homebrew not installed):**
1. Go to [Stripe CLI releases](https://github.com/stripe/stripe-cli/releases/latest)
2. Download the macOS `.tar.gz` file (e.g., `stripe_X.X.X_macOS_x86_64.tar.gz` or `stripe_X.X.X_macOS_arm64.tar.gz` for Apple Silicon)
3. Extract the file:
   ```bash
   tar -xzf stripe_X.X.X_macOS_x86_64.tar.gz
   ```
4. Move to a directory in your PATH (optional but recommended):
   ```bash
   sudo mv stripe /usr/local/bin/
   ```
   Or add to your local bin:
   ```bash
   mkdir -p ~/bin
   mv stripe ~/bin/
   echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```
5. Verify installation:
   ```bash
   stripe --version
   ```

**macOS (Option 2 - Using Homebrew - if you have Homebrew installed):**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows (using Scoop):**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Linux:**
Download from [Stripe CLI releases](https://github.com/stripe/stripe-cli/releases)

### Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate with your Stripe account.

### Step 3: Forward Webhooks to Localhost

Run this command in a separate terminal (keep it running):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Important:** Replace `3000` with your actual Next.js port if different.

This command will:
- Create a webhook endpoint in your Stripe account
- Forward all webhook events to your local server
- Display a **webhook signing secret** (starts with `whsec_`)

### Step 4: Update Your .env.local

Copy the webhook signing secret from the CLI output and add it to your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_... (the secret from stripe listen command)
```

### Step 5: Restart Your Development Server

After updating `.env.local`, restart your Next.js dev server:

```bash
npm run dev
```

## Testing Webhooks

1. **Trigger a test event:**
   ```bash
   stripe trigger checkout.session.completed
   ```

2. **Check your terminal** - you should see the webhook being received and processed.

3. **Check your app** - the booking should be created in your database.

## Webhook Events to Listen For

Make sure your Stripe CLI is forwarding these events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Alternative: Using ngrok (Not Recommended)

If you prefer not to use Stripe CLI, you can use ngrok to expose your localhost:

1. Install ngrok: `brew install ngrok` (or download from ngrok.com)
2. Run: `ngrok http 3000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. In Stripe Dashboard, create webhook with URL: `https://abc123.ngrok.io/api/stripe/webhook`
5. Copy the webhook signing secret to `.env.local`

**Note:** ngrok URLs change each time you restart, so you'll need to update the webhook URL in Stripe Dashboard each time.

## Production Setup

For production, you don't need Stripe CLI. Just:
1. Deploy your app to a public URL (e.g., Vercel, Netlify)
2. In Stripe Dashboard, create webhook with your production URL: `https://yourdomain.com/api/stripe/webhook`
3. Copy the webhook signing secret to your production environment variables
