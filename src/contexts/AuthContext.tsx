'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { SubscriptionStatus } from '@/lib/stripe';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  subscription: SubscriptionStatus | null;
  updateSubscription: (subscription: SubscriptionStatus) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  subscription: null,
  updateSubscription: async () => {}
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Fetch user subscription status from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setSubscription({
              status: userData.subscriptionStatus || 'free',
              startDate: userData.subscriptionStartDate?.toDate(),
              endDate: userData.subscriptionEndDate?.toDate(),
              stripeCustomerId: userData.stripeCustomerId,
              stripeSubscriptionId: userData.stripeSubscriptionId,
            });
          } else {
            // Create new user document with free status
            const defaultSubscription: SubscriptionStatus = {
              status: 'free',
              startDate: new Date(),
            };
            await setDoc(doc(db, 'users', user.uid), {
              email: user.email,
              uid: user.uid,
              subscriptionStatus: 'free',
              subscriptionStartDate: new Date(),
              createdAt: new Date(),
            });
            setSubscription(defaultSubscription);
          }
        } catch (error) {
          console.error('Error fetching user subscription:', error);
          setSubscription({ status: 'free', startDate: new Date() });
        }
      } else {
        setSubscription(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSubscription = async (newSubscription: SubscriptionStatus) => {
    if (!user) return;
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        subscriptionStatus: newSubscription.status,
        subscriptionStartDate: newSubscription.startDate,
        subscriptionEndDate: newSubscription.endDate,
        stripeCustomerId: newSubscription.stripeCustomerId,
        stripeSubscriptionId: newSubscription.stripeSubscriptionId,
        updatedAt: new Date(),
      }, { merge: true });
      
      setSubscription(newSubscription);
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    subscription,
    updateSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};