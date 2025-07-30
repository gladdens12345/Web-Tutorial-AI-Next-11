'use client';

import React, { useState, useEffect } from 'react';
import { signInWithGoogle } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { notifyExtensionAuthenticationComplete } from '@/lib/extension-auth-bridge';

export default function QuickSignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const router = useRouter();
  
  // Check for intended action and return URL from URL params
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const intendedAction = searchParams.get('action') || 'trial'; // trial or premium
  const returnUrl = searchParams.get('returnUrl') || '/'; // Where to redirect after sign-in

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push(returnUrl); // Redirect to return URL or main page
    }
  }, [user, router, returnUrl]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Starting Google sign-in process...');
      const result = await signInWithGoogle();
      console.log('Sign-in successful:', result.user?.email);
      
      // Notify Chrome extension of authentication success (always, not just from extension)
      try {
        // Get user's token to determine subscription status
        const token = await result.user?.getIdToken(true);
        const tokenResult = await result.user?.getIdTokenResult();
        
        // Determine subscription status from custom claims
        const customClaims = tokenResult?.claims || {};
        const subscriptionStatus = (customClaims.stripeRole === 'premium' || customClaims.premium === true) 
          ? 'premium' 
          : 'limited';

        await notifyExtensionAuthenticationComplete({
          userId: result.user?.uid || '',
          email: result.user?.email || '',
          subscriptionStatus,
          customClaims
        });
        
        console.log('✅ Extension notified of authentication success');
      } catch (extensionError) {
        console.warn('Failed to notify extension:', extensionError);
        // Don't throw error - authentication was successful even if extension communication failed
      }
      
      // Redirect to return URL or main page after sign-in
      router.push(returnUrl);
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-green-50">
      <div className="max-w-md mx-auto pt-20 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Web Tutorial AI Branding */}
          <h1 className="text-4xl font-bold mb-6 relative inline-block">
            <span 
              className="relative z-10"
              style={{
                background: 'linear-gradient(to right, #e91e63, #f57c00, #ffc107)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                WebkitTextStroke: '2px #000000'
              }}
            >
              Web Tutorial AI
            </span>
          </h1>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Get Started with AI Assistance
          </h2>
          
          <p className="text-gray-600 mb-6">
            Sign in with Google to access your AI-powered web assistant
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full inline-flex justify-center items-center py-3 px-6 border border-gray-300 rounded-lg shadow-sm bg-white text-lg font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 mr-3"></div>
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">What's Next?</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Sign in with your Google account</li>
              <li>2. Choose your plan (7-day free trial or Premium)</li>
              <li>3. Start using AI assistance on any webpage!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}