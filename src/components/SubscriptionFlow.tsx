'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApp } from '@firebase/app';
import { getStripePayments, createCheckoutSession } from '@invertase/firestore-stripe-payments';

// Initialize Stripe Payments SDK
const app = getApp();
const payments = getStripePayments(app, {
  productsCollection: 'products',
  customersCollection: 'customers',
});

export default function SubscriptionFlow() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    if (!user) {
      setError('Please sign in to subscribe');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID;
      console.log('🚀 Creating checkout session...');
      console.log('📝 Debug info:', {
        priceId,
        userId: user.uid,
        userEmail: user.email,
        hasApp: !!app,
        hasPayments: !!payments
      });
      
      if (!priceId) {
        throw new Error('Price ID not configured. Check NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID environment variable.');
      }
      
      // Create checkout session using Firebase Extension
      const session = await createCheckoutSession(payments, {
        price: priceId,
        success_url: `${window.location.origin}/subscription-success`,
        cancel_url: `${window.location.origin}/pricing`,
        allow_promotion_codes: true,
      });

      console.log('✅ Checkout session created:', session.id);
      
      // Redirect to Stripe Checkout
      window.location.assign(session.url);
      
    } catch (error: any) {
      console.error('❌ Subscription error:', error);
      console.error('📋 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        cause: error.cause,
        stack: error.stack
      });
      
      let userFriendlyMessage = 'Failed to start subscription';
      
      if (error.message?.includes('price')) {
        userFriendlyMessage = 'Price configuration error. Please contact support.';
      } else if (error.message?.includes('permission')) {
        userFriendlyMessage = 'Permission denied. Please sign in and try again.';
      } else if (error.message?.includes('network')) {
        userFriendlyMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        userFriendlyMessage = error.message;
      }
      
      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Upgrade to Premium</h2>
      
      <div className="mb-6">
        <div className="text-3xl font-bold text-green-600 mb-2">$1.00</div>
        <div className="text-gray-600">per month (testing)</div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Premium Features:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✅ Unlimited daily usage</li>
          <li>✅ No 1-hour time limits</li>
          <li>✅ Full AI assistant access</li>
          <li>✅ Priority support</li>
        </ul>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubscribe}
        disabled={loading || !user}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
          loading || !user
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Creating session...
          </div>
        ) : (
          'Subscribe Now'
        )}
      </button>

      {!user && (
        <p className="mt-2 text-sm text-gray-500 text-center">
          Please sign in to subscribe
        </p>
      )}
    </div>
  );
}