'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { getApp } from '@firebase/app';
import { getStripePayments, createCheckoutSession } from '@invertase/firestore-stripe-payments';

// Initialize Stripe Payments SDK
const app = getApp();
const payments = getStripePayments(app, {
  productsCollection: 'products',
  customersCollection: 'customers',
});

function UpgradeNowContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleUpgrade = async () => {
      // Wait for auth to load
      if (loading) return;
      
      // If no user, redirect to login
      if (!user) {
        const returnUrl = encodeURIComponent(`/upgrade-now?${searchParams.toString()}`);
        router.push(`/login?returnUrl=${returnUrl}`);
        return;
      }

      // User is authenticated, create Stripe checkout session
      try {
        setIsRedirecting(true);
        
        console.log('Creating Stripe checkout for user:', user.uid);
        
        const priceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID;
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
        
        console.log('Redirecting to Stripe checkout:', session.url);
        
        // Redirect to Stripe checkout
        window.location.assign(session.url);
        
      } catch (error) {
        console.error('Checkout error:', error);
        setError(error instanceof Error ? error.message : 'Failed to start checkout');
        setIsRedirecting(false);
      }
    };

    handleUpgrade();
  }, [user, loading, router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Redirecting to checkout...</h2>
          <p className="text-gray-600">Please wait while we redirect you to our secure payment page.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-green-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // This shouldn't render, but just in case
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Preparing your upgrade...</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
}

export default function UpgradeNowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <UpgradeNowContent />
    </Suspense>
  );
}