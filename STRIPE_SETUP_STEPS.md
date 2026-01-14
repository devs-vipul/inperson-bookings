s# Stripe Setup - Next Steps

## ✅ Completed

- Homebrew installed
- Stripe CLI installed
- PATH configured in .zprofile

## Next Steps

### Step 1: Login to Stripe CLI

Open a new terminal window (or restart your current one to load the updated PATH) and run:

```bash
stripe login
```

This will:

- Open your browser
- Ask you to authenticate with your Stripe account
- Link your local CLI to your Stripe account

### Step 2: Start Webhook Forwarding

In a **separate terminal window** (keep this running while developing), run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Important:**

- Replace `3000` with your actual Next.js port if different
- Keep this terminal window open - it needs to stay running
- You'll see output like:
  ```
  > Ready! Your webhook signing secret is whsec_... (^C to quit)
  ```

### Step 3: Copy Webhook Secret

From the `stripe listen` output, copy the webhook signing secret (starts with `whsec_`).

### Step 4: Update .env.local

Add the webhook secret to your `.env.local` file:

```env
STRIPE_SECRET_KEY=sk_test_... (you already have this)
STRIPE_WEBHOOK_SECRET=whsec_... (paste the secret from step 3)
```

### Step 5: Restart Your Dev Server

After updating `.env.local`, restart your Next.js dev server:

```bash
npm run dev
```

## Testing

To test if webhooks are working:

1. In another terminal, trigger a test event:

   ```bash
   stripe trigger checkout.session.completed
   ```

2. You should see:
   - The webhook event in your `stripe listen` terminal
   - The webhook being processed in your Next.js server logs
   - The booking being created in your database

## Troubleshooting

**If `stripe` command not found:**

- Close and reopen your terminal (to reload .zprofile)
- Or run: `eval "$(/opt/homebrew/bin/brew shellenv zsh)"`

**If webhooks not working:**

- Make sure `stripe listen` is running
- Check that the port in `stripe listen` matches your Next.js port
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly in `.env.local`
