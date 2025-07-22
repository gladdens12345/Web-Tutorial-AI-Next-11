'use client';

import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/firebase';
import { useState } from 'react';

export default function GoogleSignInTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Hide tab if user is already signed in
  if (user) return null;
  
  const handleGoogleSignIn = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      console.log('GoogleSignInTab: Starting sign-in process...');
      
      // Check if popup blockers might be interfering
      const popup = window.open('', '_blank', 'width=1,height=1');
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        alert('Popup blocked! Please allow popups for this site and try again.');
        setLoading(false);
        return;
      }
      popup.close();
      
      const result = await signInWithGoogle();
      console.log('GoogleSignInTab: Sign-in successful, user:', result.user?.email);
      
      // User will be redirected by the auth context or we can manually redirect
      if (result.user) {
        console.log('Redirecting to main page...');
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('GoogleSignInTab: Sign-in error:', error);
      
      // Handle specific error types
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User cancelled sign-in');
      } else if (error.code === 'auth/popup-blocked') {
        console.log('Popup blocked, redirecting to signup page');
        window.location.href = '/quick-signup';
      } else if (error.code === 'auth/network-request-failed') {
        alert('Network error. Please check your internet connection and try again.');
      } else {
        console.log('Sign-in failed, redirecting to signup page');
        window.location.href = '/quick-signup';
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Google Material Design CSS Styles */}
      <style jsx>{`
        .gsi-material-button {
          -moz-user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
          -webkit-appearance: none;
          background-color: transparent;
          background-image: none;
          border: none;
          -webkit-border-radius: 20px;
          border-radius: 20px;
          -webkit-box-sizing: border-box;
          box-sizing: border-box;
          color: transparent;
          cursor: pointer;
          font-family: 'Roboto', arial, sans-serif;
          font-size: 14px;
          height: 40px;
          letter-spacing: 0.25px;
          outline: none;
          overflow: hidden;
          padding: 0;
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 1000;
          text-align: center;
          -webkit-transition: none;
          transition: none;
          vertical-align: middle;
          white-space: nowrap;
          width: 40px;
          max-width: 400px;
          min-width: min-content;
          opacity: 0;
        }

        .gsi-material-button .gsi-material-button-icon {
          height: 20px;
          margin: 0;
          padding: 9px;
          min-width: 20px;
          width: 20px;
          opacity: 0;
        }

        .gsi-material-button .gsi-material-button-content-wrapper {
          -webkit-align-items: center;
          align-items: center;
          display: flex;
          -webkit-flex-direction: row;
          flex-direction: row;
          -webkit-flex-wrap: nowrap;
          flex-wrap: nowrap;
          height: 100%;
          justify-content: center;
          position: relative;
          width: 100%;
        }

        .gsi-material-button .gsi-material-button-state {
          -webkit-transition: opacity .218s;
          transition: opacity .218s;
          bottom: 0;
          left: 0;
          opacity: 0;
          position: absolute;
          right: 0;
          top: 0;
          border-radius: 20px;
        }

        .gsi-material-button:disabled {
          cursor: default;
          background-color: transparent;
          border: none;
          opacity: 0;
        }

        .gsi-material-button:disabled .gsi-material-button-icon {
          opacity: 0;
        }

        .gsi-material-button:not(:disabled):active .gsi-material-button-state, 
        .gsi-material-button:not(:disabled):focus .gsi-material-button-state {
          background-color: transparent;
          opacity: 0;
        }

        .gsi-material-button:not(:disabled):hover {
          -webkit-box-shadow: none;
          box-shadow: none;
          background-color: transparent;
          opacity: 0;
        }

        .gsi-material-button:not(:disabled):hover .gsi-material-button-state {
          background-color: transparent;
          opacity: 0;
        }

        /* Loading spinner - hidden */
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: none;
          opacity: 0;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile responsive adjustments */
        @media (max-width: 768px) {
          .gsi-material-button {
            top: 16px;
            right: 16px;
          }
        }
      `}</style>

      <button 
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="gsi-material-button"
        title="Sign in with Google"
        aria-label="Sign in with Google"
      >
        <div className="gsi-material-button-state"></div>
        <div className="gsi-material-button-content-wrapper">
          <div className="gsi-material-button-icon">
            {loading ? (
              <div className="loading-spinner" />
            ) : (
              <svg 
                version="1.1" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 48 48" 
                style={{ display: 'block' }}
              >
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            )}
          </div>
        </div>
      </button>
    </>
  );
}