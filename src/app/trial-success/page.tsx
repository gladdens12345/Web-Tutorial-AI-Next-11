'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';

function TrialSuccessContent() {
  const [status, setStatus] = useState('processing');
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const notifyExtension = async () => {
      // ✨ SERVER-FIRST: Notify extension that user completed payment
      const extensionId = 'ebjfioljljiiiaemdadedefpcdclglkk';
      
      // Get current user data from Firebase Auth
      const currentUser = auth.currentUser;
      
      if (window.chrome?.runtime?.sendMessage) {
        const message: any = {
          type: 'USER_ACTION_SUCCESS',
          action: 'subscription_completed'
        };
        
        // Include user data if available
        if (currentUser) {
          message.userData = {
            userId: currentUser.uid,
            email: currentUser.email
          };
          console.log('📤 Sending user data with success message:', message.userData);
        }
        
        chrome.runtime.sendMessage(extensionId, message, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Extension not installed or not responding:', chrome.runtime.lastError.message);
            setStatus('extension_not_found');
          } else {
            console.log('✅ Extension notified of subscription success:', response);
            setStatus('success');
          }
        });
      } else {
        console.log('Chrome extension API not available');
        setStatus('extension_not_found');
      }
    };

    // Add a small delay to ensure webhook has processed
    setTimeout(() => {
      notifyExtension();
    }, 2000);

    // Redirect to main page after 5 seconds (increased to allow webhook processing)
    const timer = setTimeout(() => {
      window.location.href = '/?success=true';
    }, 5000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Processing...</h1>
            <p className="text-gray-600">Activating your subscription and notifying the extension.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-2xl font-bold text-green-800 mb-4">Success!</h1>
            <p className="text-gray-600 mb-4">
              Your subscription is now active and the extension has been notified.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to the main page...
            </p>
          </>
        )}

        {status === 'extension_not_found' && (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-2xl font-bold text-green-800 mb-4">Payment Successful!</h1>
            <p className="text-gray-600 mb-4">
              Your subscription is active. Please refresh any extension tabs to access unlimited features.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to the main page...
            </p>
          </>
        )}

        {sessionId && (
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Session ID: {sessionId.substring(0, 20)}...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrialSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h1>
        </div>
      </div>
    }>
      <TrialSuccessContent />
    </Suspense>
  );
}