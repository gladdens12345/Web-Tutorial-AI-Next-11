'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function SubscriptionSuccess() {
  const { user } = useAuth();
  const [customClaims, setCustomClaims] = useState<any>(null);

  useEffect(() => {
    // Check for custom claims after subscription
    const checkCustomClaims = async () => {
      if (user) {
        try {
          // Force token refresh to get latest claims
          const token = await user.getIdToken(true);
          const decodedToken = await user.getIdTokenResult();
          setCustomClaims(decodedToken.claims);
          
          console.log('🎉 Updated custom claims:', decodedToken.claims);
          
          // Notify Chrome extension about premium status
          try {
            if (typeof window !== 'undefined' && window.postMessage) {
              // Send message to any listening content scripts
              window.postMessage({
                type: 'WEB_TUTORIAL_AI_PREMIUM_ACTIVATED',
                source: 'subscription-success',
                data: {
                  userId: user.uid,
                  email: user.email,
                  subscriptionStatus: 'premium',
                  customClaims: decodedToken.claims,
                  timestamp: Date.now()
                }
              }, '*');
              
              console.log('📨 Sent premium activation message to extension');
            }
          } catch (error) {
            console.warn('Failed to notify extension:', error);
          }
        } catch (error) {
          console.error('Error getting custom claims:', error);
        }
      }
    };

    // Function to notify extension immediately with user data if available
    const notifyExtensionImmediately = () => {
      if (user && typeof window !== 'undefined') {
        try {
          window.postMessage({
            type: 'WEB_TUTORIAL_AI_PREMIUM_ACTIVATED',
            source: 'subscription-success',
            data: {
              userId: user.uid,
              email: user.email,
              subscriptionStatus: 'premium',
              timestamp: Date.now()
            }
          }, '*');
          
          console.log('📨 Sent immediate premium notification to extension');
        } catch (error) {
          console.warn('Failed to send immediate notification:', error);
        }
      }
    };

    // Notify immediately
    notifyExtensionImmediately();
    
    // Check claims immediately and then every 5 seconds for up to 30 seconds
    checkCustomClaims();
    const interval = setInterval(checkCustomClaims, 5000);
    
    // Clean up after 30 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🎉 Welcome to Premium!
          </h1>
          <p className="text-gray-600">
            Your subscription has been activated successfully.
          </p>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold text-blue-900 mb-2">What's New:</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ Unlimited daily usage - no more 1-hour limits!</li>
            <li>✅ Full access to all AI features</li>
            <li>✅ Priority customer support</li>
          </ul>
        </div>

        {customClaims && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Debug Info:</h3>
            <div className="text-xs text-gray-600 font-mono">
              stripeRole: {customClaims.stripeRole || 'not set yet'}
            </div>
            {customClaims.stripeRole === 'premium' && (
              <div className="mt-2 text-sm text-green-600 font-semibold">
                ✅ Premium access confirmed!
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Using Premium Features
          </Link>
          
          <Link
            href="/pricing"
            className="block w-full py-2 px-4 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back to Pricing
          </Link>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>
            Need help? Contact support at{' '}
            <a href="mailto:support@webtutorialai.com" className="text-blue-600 hover:underline">
              support@webtutorialai.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}