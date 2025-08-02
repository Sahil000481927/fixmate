# Stripe Connect Cashout Implementation

This implementation provides a complete Stripe Connect solution for user cashouts using Express accounts. Users can onboard through Stripe's hosted onboarding flow and receive payments directly to their bank accounts.

## Features

- **Stripe Express Accounts**: Automatic account creation with minimal friction
- **Hosted Onboarding**: Stripe-hosted onboarding flow with pre-filled information
- **Real-time Status Updates**: Webhook-driven status updates
- **Test Mode Support**: Full testing with fake data and test mode
- **Auto-refund Monitoring**: Platform balance monitoring with alerts
- **Comprehensive Logging**: Detailed payment activity logging
- **Admin Controls**: Admin approval workflow for cashout requests

## Setup Instructions

### 1. Environment Variables

Add these variables to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe test secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook endpoint secret from Stripe
CLIENT_URL=http://localhost:5173 # Your frontend URL for redirects

# Optional: Override default settings
PLATFORM_FEE_PERCENTAGE=0.03 # 3% platform fee
MIN_BALANCE_THRESHOLD=1000 # $10.00 in cents for low balance alerts
```

### 2. Stripe Dashboard Setup

1. **Enable Connect**: Go to Stripe Dashboard → Connect → Get Started
2. **Create Webhook Endpoint**: 
   - URL: `https://your-ngrok-url.ngrok.io/api/payments/webhook`
   - Events: `account.updated`, `transfer.created`, `transfer.updated`, `transfer.failed`, `balance.available`
   - Copy the webhook secret to your `.env` file

### 3. Ngrok Setup (for webhook testing)

```bash
# Install ngrok if you haven't already
npm install -g ngrok

# Start your server first
npm run start

# In another terminal, expose your server
ngrok http 3001

# Copy the HTTPS URL to use as your webhook endpoint
```

### 4. Test the Integration

#### Method 1: Using the Test Script

```bash
# Navigate to the server directory
cd server

# Run the test script
node scripts/testStripeConnect.js
```

#### Method 2: Manual Testing

1. **Start the application**:
   ```bash
   npm run start
   ```

2. **Add test platform revenue** (admin only):
   ```bash
   curl -X POST http://localhost:3001/api/payments/simulate-revenue \
     -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"amount": 10000}'
   ```

3. **Start onboarding**:
   ```bash
   curl -X POST http://localhost:3001/api/payments/onboarding/start \
     -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
   ```

4. **Complete onboarding** using the returned URL with test data:
   - Business type: Individual
   - Name: Test User
   - Email: test@example.com
   - Phone: (000) 000-0000
   - DOB: 01/01/1990
   - SSN: 000-00-0000 (test SSN)
   - Address: 123 Test Street, Test City, CA 90210
   - Bank: Routing 110000000, Account 000123456789

5. **Request cashout**:
   ```bash
   curl -X POST http://localhost:3001/api/payments/cashout \
     -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"points": 200}'
   ```

6. **Process cashout** (admin):
   ```bash
   curl -X PUT http://localhost:3001/api/payments/cashout/CASHOUT_ID/process \
     -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action": "approve", "adminNotes": "Test approval"}'
   ```

## API Endpoints

### User Endpoints

- `GET /api/payments/points/:userId` - Get user points and cashout eligibility
- `POST /api/payments/onboarding/start` - Start Stripe onboarding process
- `GET /api/payments/onboarding/status` - Check onboarding completion status
- `POST /api/payments/cashout` - Request a cashout
- `GET /api/payments/cashout-history` - Get user's cashout history
- `GET /api/payments/points-history` - Get user's points transaction history

### Admin Endpoints

- `PUT /api/payments/cashout/:id/process` - Approve or reject cashout requests
- `POST /api/payments/simulate-revenue` - Add test funds to platform (test mode only)

### Webhook Endpoint

- `POST /api/payments/webhook` - Stripe webhook handler (no auth required)

## Test Data for Onboarding

When completing the Stripe onboarding in test mode, use these values:

### Personal Information
- **Name**: Test User
- **Email**: test@example.com
- **Phone**: (000) 000-0000
- **Date of Birth**: 01/01/1990
- **SSN**: 000-00-0000

### Address
- **Street**: 123 Test Street
- **City**: Test City
- **State**: CA
- **ZIP**: 90210

### Bank Account
- **Routing Number**: 110000000
- **Account Number**: 000123456789
- **Account Type**: Checking

## Flow Overview

1. **User Setup**: User visits cashout page and clicks "Start Account Setup"
2. **Account Creation**: Backend creates Stripe Express account with pre-filled data
3. **Onboarding**: User is redirected to Stripe-hosted onboarding form
4. **Completion**: User completes onboarding with test data
5. **Verification**: Webhooks update account status in real-time
6. **Cashout Request**: User can now request cashouts
7. **Admin Approval**: Admin reviews and approves cashout requests
8. **Transfer**: Funds are transferred to user's connected account
9. **Payout**: Stripe automatically sends funds to user's bank account

## Security Notes

- All sensitive operations require proper authentication
- Webhook signatures are verified to prevent tampering
- Platform balance is monitored to prevent overdrafts
- Comprehensive logging for audit trails
- Test mode clearly indicated throughout the interface

## Troubleshooting

### Common Issues

1. **"Insufficient platform balance"**: Use the simulate revenue endpoint to add test funds
2. **"Account not ready for payouts"**: Check onboarding completion status
3. **Webhook not receiving events**: Verify ngrok URL and webhook secret
4. **Onboarding fails**: Ensure using test data and test mode is enabled

### Debug Tools

- Check payment logs in Firebase: `/paymentLogs`
- Monitor webhook events in Stripe Dashboard
- Use browser dev tools to check network requests
- Check server logs for detailed error messages

## Production Deployment

Before going live:

1. Replace test Stripe keys with live keys
2. Update webhook URL to production domain
3. Set up proper SSL certificates
4. Configure production environment variables
5. Test with small amounts first
6. Monitor balance and set up automatic funding if needed

## Support

For issues with this implementation:
1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure ngrok is running for webhook testing
