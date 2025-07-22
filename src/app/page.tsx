'use client';

import GoogleSignInTab from '@/components/GoogleSignInTab';
import AuthModal from '@/components/AuthModal';
import { signInWithGoogle } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [intendedAction, setIntendedAction] = useState<'daily' | 'premium'>('daily');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'anonymous' | 'limited' | 'premium'>('anonymous');
  const [loading, setLoading] = useState(false);
  
  // Updated with bright green pain relief points matching checkmarks
  const checkmarkGreen = '#008200'; // Darker green for pain relief points and Scale Your Compute title
  const brightRed = '#ff0000';       // Pure bright red for pain points


  // ✨ V1 ADDITION: Check user subscription status
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user) {
        setSubscriptionStatus('anonymous');
        return;
      }

      try {
        setLoading(true);
        
        // Validate user data before sending
        if (!user.uid || !user.email) {
          console.warn('⚠️ User data incomplete:', { uid: !!user.uid, email: !!user.email });
          setSubscriptionStatus('limited');
          return;
        }
        
        const response = await fetch('/api/extension/auth-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            userEmail: user.email
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Convert trial status to limited since we're removing trials
          let status = data.subscriptionStatus || 'limited';
          if (status === 'trial') {
            status = 'limited';
          }
          setSubscriptionStatus(status);
        } else {
          console.error('Failed to get subscription status');
          setSubscriptionStatus('limited');
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        setSubscriptionStatus('limited');
      } finally {
        setLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [user]);


  // Function to handle Google sign-in
  const handleGoogleSignIn = async () => {
    try {
      console.log('Google sign-in button clicked');
      const result = await signInWithGoogle();
      console.log('Sign-in successful:', result.user?.email);
      
      // After successful sign-in, stay on main page (pricing is now integrated)
      // The auth context will handle the user state update
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Failed to sign in with Google. Please try again.');
    }
  };

  // Function to handle trial start - activate daily use
  const handleStartTrial = async () => {
    try {
      console.log('Start daily use button clicked');
      setLoading(true);
      
      // First ensure user is signed in
      if (!user) {
        console.log('User not signed in, opening auth modal');
        setIntendedAction('daily');
        setAuthModalOpen(true);
        return;
      }

      // Get device fingerprint from the extension
      let deviceFingerprint = localStorage.getItem('extensionDeviceFingerprint');
      
      if (!deviceFingerprint) {
        // Request device fingerprint from extension
        try {
          // Try to get device fingerprint from extension
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            await new Promise((resolve) => {
              chrome.runtime.sendMessage({
                type: 'GET_DEVICE_FINGERPRINT'
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.log('Could not get device fingerprint from extension:', chrome.runtime.lastError);
                } else if (response && response.deviceFingerprint) {
                  deviceFingerprint = response.deviceFingerprint;
                  localStorage.setItem('extensionDeviceFingerprint', deviceFingerprint);
                  console.log('Got device fingerprint from extension:', deviceFingerprint.substring(0, 8) + '...');
                }
                resolve(null);
              });
            });
          }
        } catch (error) {
          console.log('Failed to get device fingerprint from extension:', error);
        }
        
        // Fallback: generate web-based fingerprint
        if (!deviceFingerprint) {
          deviceFingerprint = `web_${Date.now()}_${Math.random().toString(36).substring(2)}`;
          localStorage.setItem('extensionDeviceFingerprint', deviceFingerprint);
          console.log('Using fallback device fingerprint:', deviceFingerprint);
        }
      }

      // Call activation API
      const response = await fetch('/api/extension/activate-daily-use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          deviceFingerprint: deviceFingerprint
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Success - notify extension
        try {
          console.log('🔐 DEBUG: Dispatching webTutorialAuthSuccess event with data:', {
            userId: user.uid,
            email: user.email,
            activated: true,
            dailyUseStarted: true,
            timestamp: new Date().toISOString()
          });

          // Send message to Chrome extension
          window.dispatchEvent(new CustomEvent('webTutorialAuthSuccess', {
            detail: {
              userId: user.uid,
              email: user.email,
              activated: true,
              dailyUseStarted: true
            }
          }));

          console.log('✅ DEBUG: webTutorialAuthSuccess event dispatched');

          // Try direct extension communication as well
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            console.log('🔍 DEBUG: Sending message to extension with user data:', {
              userId: user.uid,
              email: user.email,
              activated: true,
              dailyUseStarted: true
            });
            
            chrome.runtime.sendMessage({
              type: 'USER_ACTION_SUCCESS',
              userData: {
                userId: user.uid,
                email: user.email,
                activated: true,
                dailyUseStarted: true
              }
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.log('❌ DEBUG: Extension message failed:', chrome.runtime.lastError);
              } else {
                console.log('✅ DEBUG: Extension message sent successfully:', response);
              }
            });
          }
        } catch (extensionError) {
          console.log('❌ DEBUG: Extension communication failed:', extensionError);
        }

        // Show success message
        alert(`🚀 Your 1-hour daily usage has started!\n\n` +
              `• You now have 1 hour of free AI assistance\n` +
              `• This resets daily at midnight\n` +
              `• Subscribe for unlimited access at just $5/month\n\n` +
              `Your extension is now active!`);

        // Update subscription status locally
        setSubscriptionStatus('limited');
        
      } else {
        // Handle errors
        if (result.code === 'DAILY_LIMIT_USED') {
          alert(`⏰ Daily limit already used\n\n${result.message}\n\nTry again tomorrow or subscribe for unlimited access.`);
        } else {
          alert(`❌ Failed to activate daily use\n\n${result.message || 'Please try again.'}`);
        }
      }
      
    } catch (error) {
      console.error('Daily use activation error:', error);
      alert('❌ Something went wrong. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };


  // Function to handle premium subscription
  const handlePremiumSubscription = async () => {
    try {
      console.log('Premium subscription button clicked');
      
      // First ensure user is signed in
      if (!user) {
        console.log('User not signed in, opening auth modal');
        setIntendedAction('premium');
        setAuthModalOpen(true);
        return;
      }
      
      console.log('Creating checkout session for user:', user.uid);
      
      // Create Stripe checkout session
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          planId: 'premium'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Checkout API error:', errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      console.log('Redirecting to Stripe checkout:', url);
      window.location.href = url; // Redirect to Stripe checkout
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-green-50">
      {/* Google Sign-In Floating Tab */}
      <GoogleSignInTab />
      
      {/* Navigation */}
      <nav className="px-4 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold relative">
            <span 
              className="relative z-10"
              style={{
                background: 'linear-gradient(to right, #e91e63, #f57c00, #ffc107)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Web Tutorial AI
            </span>
          </h1>
          <div className="flex gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Welcome, {user.email?.split('@')[0]}</span>
                <button 
                  onClick={() => {
                    import('@/lib/firebase').then(({ logOut }) => {
                      logOut().then(() => window.location.reload());
                    });
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => {
                    setIntendedAction('daily');
                    setAuthModalOpen(true);
                  }}
                  className="px-6 py-2 text-gray-700 hover:text-gray-900 transition"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => {
                    setIntendedAction('daily');
                    setAuthModalOpen(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-pink-400 to-orange-400 text-white rounded-lg hover:shadow-lg transition"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-6 flex items-center justify-center gap-1">
            <span 
              style={{
                background: 'linear-gradient(to right, #e91e63, #f57c00, #ffc107)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                WebkitTextStroke: '2px #000000'
              }}
            >
              Web Tutorial AI
            </span>
            
            {/* Logo Icon - Bigger and Closer to the I */}
            <Image 
              src="/logo-icon.png"
              alt="Web Tutorial AI Logo"
              width={160}
              height={160}
              className="w-24 h-24 md:w-40 md:h-40 inline-block"
              style={{
                filter: 'drop-shadow(0 0 0.5rem rgba(0, 0, 0, 0.1))'
              }}
            />
          </h1>
          
          <p className="text-3xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            Make It Easy
          </p>

          {/* Spacing before pricing cards */}
          <div className="mb-24"></div>
          

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Anonymous Trial Card - Always shown unless premium */}
            {subscriptionStatus !== 'premium' && (
              <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-4">Free Daily Use</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">1 Hour</span>
                  <span className="text-gray-400">/day</span>
                </div>
                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-gray-300">
                    <svg className="w-5 h-5 mr-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    1 hour of free daily usage
                  </div>
                  <div className="flex items-center text-gray-300">
                    <svg className="w-5 h-5 mr-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    All features included
                  </div>
                  <div className="flex items-center text-gray-300">
                    <svg className="w-5 h-5 mr-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    Resets daily at midnight
                  </div>
                </div>
                <button 
                  onClick={handleStartTrial}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Start 1 Hour Free'}
                </button>
              </div>
            )}

            {/* Premium Card */}
            <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">Premium</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$5.00</span>
                <span className="text-gray-400">/month</span>
              </div>
              <div className="space-y-3 mb-8">
                <div className="flex items-center text-gray-300">
                  <svg className="w-5 h-5 mr-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Unlimited AI assistance
                </div>
                <div className="flex items-center text-gray-300">
                  <svg className="w-5 h-5 mr-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Advanced Knowledge Base
                </div>
                <div className="flex items-center text-gray-300">
                  <svg className="w-5 h-5 mr-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Priority support
                </div>
              </div>
              <button 
                onClick={handlePremiumSubscription}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold rounded-lg hover:shadow-lg transition"
              >
                Get Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto flex justify-center gap-12">
          <div className="flex items-center gap-3 text-gray-700">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span className="font-medium">SSL Secured</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0010 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd"/>
            </svg>
            <span className="font-medium">Privacy Protected</span>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Headers */}
          <div className="text-center mb-16">
            <h2 className="text-6xl md:text-8xl font-bold mb-24 relative inline-block">
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
            </h2>
            <p className="text-4xl md:text-6xl font-bold mb-36" style={{
              background: 'linear-gradient(to right, #e91e63, #f57c00, #ffc107)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              10X Your Workflow
            </p>
          </div>

          {/* Two Column Layout - Headers */}
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto mb-20">
            <div className="text-center">
              <h3 className="text-5xl font-bold relative inline-block mb-8">
                <span className="relative z-10" style={{ color: brightRed }}>Tired Of!</span>
              </h3>
            </div>
            <div className="text-center">
              <h3 className="text-5xl font-bold relative inline-block mb-8">
                <span className="relative z-10" style={{ color: checkmarkGreen }}>Scale Your Compute!</span>
              </h3>
            </div>
          </div>

          {/* Pain Points and Solutions - Aligned Row by Row */}
          <div className="mx-4 space-y-10">
            {/* Row 1 */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: brightRed, fontWeight: 500 }}>
                  Taking screenshots, switching websites, and repeatedly explaining what your task is?
                </p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: checkmarkGreen, fontWeight: 500 }}>
                  The AI Reads The Web Page You&apos;re on and understands your task. No need for screenshots, No need for explaining.
                </p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: brightRed, fontWeight: 500 }}>
                  AI giving you essays when you need a quick, clear answer?
                </p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: checkmarkGreen, fontWeight: 500 }}>
                  Limit response length with the Max Tokens feature. Choose the maximum amount of words the AI uses in its responses.
                </p>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: brightRed, fontWeight: 500 }}>
                  Losing focus by switching tabs for web searches and trying to piece information together?
                </p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: checkmarkGreen, fontWeight: 500 }}>
                  Integrated Web Search: Get answers from the web without leaving your page. Your chosen AI model reviews and delivers the information you need.
                </p>
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: brightRed, fontWeight: 500 }}>
                  Overwhelming five-page AI to-do lists that get lost in the chat?
                </p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: checkmarkGreen, fontWeight: 500 }}>
                  Step-by-Step Guidance: Receive AI responses in manageable chunks (1, 2, or 3 steps). The AI understands its role, your task, and the page content.
                </p>
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: brightRed, fontWeight: 500 }}>
                  Getting tired of typing questions and reading responses?
                </p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: checkmarkGreen, fontWeight: 500 }}>
                  Interact naturally: Full Speech-to-Text and Text-to-Speech capabilities
                </p>
              </div>
            </div>

            {/* Row 6 */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: brightRed, fontWeight: 500 }}>
                  Jumping between ChatGPT, Gemini, and Claude for answers, explaining your context each time?
                </p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: checkmarkGreen, fontWeight: 500 }}>
                  Give the AI a Role and define the Task with our Role and Task feature. We have preset Roles connected to our knowledge base, making the AI an expert on your Task.
                </p>
              </div>
            </div>

            {/* Row 7 */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: brightRed, fontWeight: 500 }}>
                  AI struggling with the content on complex or niche websites?
                </p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-lg min-h-[200px] flex items-center">
                <p className="text-3xl" style={{ color: checkmarkGreen, fontWeight: 500 }}>
                  Deeper Website Comprehension: Our AI utilizes the Web Tutorial AI Knowledge Base for superior understanding across a wide range of websites.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <button 
            onClick={() => {
              setIntendedAction('daily');
              setAuthModalOpen(true);
            }}
            className="px-12 py-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xl font-semibold rounded-lg hover:shadow-xl transition transform hover:scale-105"
          >
            Get Started - 1 Hour Daily Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center text-gray-600">
          <p>&copy; 2024 Web Tutorial AI. All rights reserved.</p>
        </div>
      </footer>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        intendedAction={intendedAction}
        onSuccess={() => {
          // ✨ FIXED: After successful authentication, just close modal - let user choose their action
          setAuthModalOpen(false);
          // No more directing users to free option - let them see both options
        }}
      />
    </div>
  );
}