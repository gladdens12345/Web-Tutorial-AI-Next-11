/**
 * Extension Authentication Bridge
 * 
 * Provides a reliable way for the website to communicate authentication status
 * to the Chrome extension, regardless of extension ID or installation method.
 */

interface AuthUserData {
  userId: string;
  email: string;
  subscriptionStatus: 'premium' | 'limited' | 'anonymous';
  customClaims?: any;
}

interface ExtensionMessage {
  type: 'USER_ACTION_SUCCESS';
  action: 'authentication_completed' | 'subscription_completed';
  userData: AuthUserData;
  timestamp: number;
}

/**
 * Notify Chrome extension of authentication success
 * Uses multiple methods to ensure the message gets through
 */
export async function notifyExtensionAuthentication(
  userData: AuthUserData,
  action: 'authentication_completed' | 'subscription_completed' = 'authentication_completed'
): Promise<boolean> {
  console.log('🔔 Notifying extension of authentication:', { action, userId: userData.userId });

  const message: ExtensionMessage = {
    type: 'USER_ACTION_SUCCESS',
    action,
    userData,
    timestamp: Date.now()
  };

  let success = false;

  // Method 1: Try known extension IDs (for different installation methods)
  const knownExtensionIds = [
    'ebjfioljljiiiaemdadedefpcdclglkk', // Published extension ID (from manifest key)
    // Local development IDs can vary, so we'll use other methods for those
  ];

  for (const extensionId of knownExtensionIds) {
    try {
      if (typeof window !== 'undefined' && window.chrome?.runtime?.sendMessage) {
        await new Promise<void>((resolve, reject) => {
          chrome.runtime.sendMessage(extensionId, message, (response) => {
            if (chrome.runtime.lastError) {
              console.log(`Extension ${extensionId} not responding:`, chrome.runtime.lastError.message);
              reject(chrome.runtime.lastError);
            } else {
              console.log(`✅ Extension ${extensionId} notified successfully:`, response);
              success = true;
              resolve();
            }
          });
        });
      }
    } catch (error) {
      console.log(`Failed to notify extension ${extensionId}:`, error);
    }
  }

  // Method 2: Store in localStorage as backup (extension can check this)
  try {
    const authData = {
      ...userData,
      timestamp: Date.now(),
      action,
      source: 'website'
    };
    
    localStorage.setItem('webTutorialAuth', JSON.stringify(authData));
    localStorage.setItem('webTutorialAuthTimestamp', Date.now().toString());
    console.log('✅ Auth data stored in localStorage for extension pickup');
    success = true;
  } catch (error) {
    console.warn('Failed to store auth data in localStorage:', error);
  }

  // Method 3: Dispatch custom event (extension can listen for this)
  try {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('webTutorialAuthSuccess', {
        detail: {
          ...message,
          method: 'customEvent'
        }
      });
      window.dispatchEvent(event);
      console.log('✅ Dispatched custom auth event');
      success = true;
    }
  } catch (error) {
    console.warn('Failed to dispatch custom event:', error);
  }

  // Method 4: Broadcast message across all tabs (extension content scripts can listen)
  try {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const channel = new BroadcastChannel('webTutorialAuth');
      channel.postMessage(message);
      channel.close();
      console.log('✅ Broadcast auth message across tabs');
      success = true;
    }
  } catch (error) {
    console.warn('Failed to broadcast message:', error);
  }

  console.log(success ? '✅ Extension notification sent via multiple methods' : '❌ All extension notification methods failed');
  return success;
}

/**
 * Convenience function for authentication completion
 */
export function notifyExtensionAuthenticationComplete(userData: AuthUserData): Promise<boolean> {
  return notifyExtensionAuthentication(userData, 'authentication_completed');
}

/**
 * Convenience function for subscription completion
 */
export function notifyExtensionSubscriptionComplete(userData: AuthUserData): Promise<boolean> {
  return notifyExtensionAuthentication(userData, 'subscription_completed');
}

/**
 * Check if extension communication is available
 */
export function isExtensionCommunicationAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.chrome !== 'undefined' && 
         typeof window.chrome.runtime !== 'undefined';
}

/**
 * Wait for authentication data to be available and return it
 * This can be used by pages that need to ensure auth data is ready
 */
export async function waitForAuthData(timeoutMs: number = 5000): Promise<AuthUserData | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const stored = localStorage.getItem('webTutorialAuth');
      if (stored) {
        const authData = JSON.parse(stored);
        if (authData.userId && authData.email) {
          return authData;
        }
      }
    } catch (error) {
      console.warn('Error checking stored auth data:', error);
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return null;
}