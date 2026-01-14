# TODO - When You Come Back

## Immediate Actions

1. **Start Convex Dev**

   ```bash
   npx convex dev
   ```

   - Make sure it runs without errors
   - Check that all modules are pushed successfully

2. **Check Stripe Integration**
   - Verify Stripe products are created when sessions are created
   - Test the booking flow end-to-end
   - Ensure webhooks are working properly
   - Test payment flow with test card: `4242 4242 4242 4242`

## Testing Checklist

- [ ] Create a session as super-admin → Check if Stripe product is created
- [ ] User books sessions → Check if redirects to Stripe checkout
- [ ] Complete test payment → Check if booking is created
- [ ] Verify webhook is received and processed
- [ ] Check booking confirmation page displays correctly
- [ ] Verify recurring payment webhooks work
