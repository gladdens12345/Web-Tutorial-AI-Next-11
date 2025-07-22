'use client';

import React, { useState } from 'react';
import { signInWithGoogle } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  intendedAction?: 'trial' | 'premium';
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, intendedAction = 'trial', onSuccess }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Close modal if user becomes authenticated
  // Track if we've already called onSuccess to prevent duplicates
  const [successCalled, setSuccessCalled] = React.useState(false);
  
  React.useEffect(() => {
    if (user && onSuccess && !successCalled) {
      setTimeout(() => {
        setSuccessCalled(true);
        onSuccess();
        onClose();
      }, 100); // Small delay to prevent double execution
    }
  }, [user, onSuccess, onClose, successCalled]);

  const handleGoogleSignIn = async () => {
    if (loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('AuthModal: Starting Google sign-in...');
      const result = await signInWithGoogle();
      console.log('AuthModal: Sign-in successful:', result.user?.email);
      
      if (result.user && onSuccess && !successCalled) {
        setSuccessCalled(true);
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('AuthModal: Sign-in error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User cancelled sign-in');
        setError('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(error.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackSignup = () => {
    window.location.href = `/quick-signup?action=${intendedAction}`;
  };

  // Reset success state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSuccessCalled(false);
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative" style={{ animation: 'slideIn 0.3s ease-out' }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content matching the signup page design */}
        <div className="text-center">
          {/* Web Tutorial AI Branding */}
          <h1 className="text-3xl font-bold mb-4 relative inline-block">
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
          
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Get Started with AI Assistance
          </h2>
          
          <p className="text-gray-600 mb-6">
            Sign in with Google to access your AI-powered web assistant
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {/* Google Sign-in Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full inline-flex justify-center items-center py-3 px-6 border border-gray-300 rounded-lg shadow-sm bg-white text-lg font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-4"
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

          {/* Fallback button */}
          <button
            onClick={handleFallbackSignup}
            className="text-sm text-blue-600 hover:text-blue-500 underline"
          >
            Having trouble? Try the signup page instead
          </button>

          {/* Terms and Privacy */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>

          {/* What's Next Section */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">What's Next?</h3>
            <ol className="text-xs text-blue-700 space-y-1">
              <li>1. Sign in with your Google account</li>
              <li>2. {intendedAction === 'trial' ? 'Start your 7-day free trial' : 'Get Premium access'}</li>
              <li>3. Start using AI assistance on any webpage!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}