
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const STRIPE_CONFIG = {
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  PLATFORM_FEE_PERCENTAGE: 0.03, // 3% platform fee
  MIN_BALANCE_THRESHOLD: 1000, // $10.00 in cents for auto-refund
  POINTS_PER_DOLLAR: 100,
  MIN_CASHOUT_POINTS: 100, // $1.00 minimum cashout
  CURRENCY: 'usd',
  COUNTRY: 'US',
  // Test mode configuration
  TEST_TOKENS: {
    VISA: 'tok_visa',
    VISA_DEBIT: 'tok_visa_debit',
    MASTERCARD: 'tok_mastercard',
    AMEX: 'tok_amex',
    DISCOVER: 'tok_discover',
    DECLINED: 'tok_chargeDeclined',
    INSUFFICIENT_FUNDS: 'tok_chargeDeclinedInsufficientFunds'
  },
  // Test bank account details for connected accounts
  TEST_BANK_ACCOUNT: {
    country: 'US',
    currency: 'usd',
    routing_number: '110000000',
    account_number: '000123456789'
  },
  // Onboarding configuration
  ONBOARDING: {
    refresh_url: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/cashout?refresh=true` : 'http://localhost:5173/cashout?refresh=true',
    return_url: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/cashout?success=true` : 'http://localhost:5173/cashout?success=true'
  }
};

module.exports = { stripe, STRIPE_CONFIG };
