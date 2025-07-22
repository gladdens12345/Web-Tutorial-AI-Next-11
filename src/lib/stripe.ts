import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface SubscriptionStatus {
  status: 'anonymous' | 'trial' | 'premium' | 'limited' | 'free';
  startDate?: Date;
  endDate?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  anonymousTimeUsed?: number; // milliseconds
  dailyTimeUsed?: number; // milliseconds for limited users
  lastResetDate?: Date; // for daily reset tracking
}

export const PRICING_PLANS = {
  trial: {
    name: '7-Day Free Trial',
    price: 0,
    duration: '7 days',
    features: [
      'Full access to AI knowledge base',
      'Unlimited usage for 7 days',
      'All premium features included',
      'No credit card required'
    ],
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_TRIAL_PRODUCT_ID,
  },
  premium: {
    name: 'Premium',
    price: 5.00,
    period: 'month',
    features: [
      'Everything in free trial',
      'Unlimited usage forever',
      'Priority customer support',
      'Future features included'
    ],
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
  }
};