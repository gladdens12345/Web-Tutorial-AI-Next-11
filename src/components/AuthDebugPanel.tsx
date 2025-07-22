'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function AuthDebugPanel() {
  const { user, loading } = useAuth();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  const testFirebaseConfig = () => {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
    
    console.log('Firebase Config:', config);
    
    const missing = Object.entries(config)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missing.length > 0) {
      alert(`Missing Firebase config: ${missing.join(', ')}`);
    } else {
      alert('Firebase config looks complete!');
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-sm max-w-xs">
      <h3 className="font-bold mb-2">Auth Debug Panel</h3>
      <div className="space-y-1">
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>User: {user ? user.email : 'None'}</div>
        <div>UID: {user ? user.uid.substring(0, 8) + '...' : 'None'}</div>
      </div>
      <button 
        onClick={testFirebaseConfig}
        className="mt-2 px-2 py-1 bg-blue-600 text-white rounded text-xs"
      >
        Test Config
      </button>
    </div>
  );
}