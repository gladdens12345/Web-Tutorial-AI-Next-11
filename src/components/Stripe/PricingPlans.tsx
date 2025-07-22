'use client';

import React from 'react';
import { PRICING_PLANS } from '@/lib/stripe';
import { useAuth } from '@/contexts/AuthContext';

interface PricingPlansProps {
  onSelectPlan: (planId: string) => void;
}

const PricingPlans: React.FC<PricingPlansProps> = ({ onSelectPlan }) => {
  const { subscription } = useAuth();

  const isCurrentPlan = (planId: string) => {
    return subscription?.status === planId;
  };

  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Trial Card */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-400 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition"></div>
            <div className="relative bg-white rounded-3xl shadow-xl p-8 border border-orange-100 hover:border-orange-300 transition-all hover:scale-105">
              <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold rounded-full mb-4">
                MOST POPULAR
              </div>
              
              <h3 className="text-3xl font-bold mb-2">{PRICING_PLANS.trial.name}</h3>
              <p className="text-gray-600 mb-6">Experience everything risk-free</p>
              
              <div className="mb-8">
                <span className="text-5xl font-bold">${PRICING_PLANS.trial.price}</span>
                <span className="text-gray-500">/{PRICING_PLANS.trial.duration}</span>
              </div>
              
              <button
                onClick={() => onSelectPlan('trial')}
                disabled={isCurrentPlan('trial')}
                className={`block w-full py-4 rounded-2xl font-semibold transition-all ${
                  isCurrentPlan('trial')
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:shadow-lg hover:scale-105'
                }`}
              >
                {isCurrentPlan('trial') ? 'Current Plan' : 'Start Free Trial'}
              </button>
              
              <ul className="mt-8 space-y-3 text-left">
                {PRICING_PLANS.trial.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Premium Card */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition"></div>
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl shadow-xl p-8 hover:scale-105 transition-all">
              <h3 className="text-3xl font-bold mb-2">{PRICING_PLANS.premium.name}</h3>
              <p className="text-gray-300 mb-6">For power users and professionals</p>
              
              <div className="mb-8">
                <span className="text-5xl font-bold">${PRICING_PLANS.premium.price}</span>
                <span className="text-gray-400">/{PRICING_PLANS.premium.period}</span>
              </div>
              
              <button
                onClick={() => onSelectPlan('premium')}
                disabled={isCurrentPlan('premium')}
                className={`block w-full py-4 rounded-2xl font-semibold transition-all ${
                  isCurrentPlan('premium')
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                {isCurrentPlan('premium') ? 'Current Plan' : 'Subscribe Now'}
              </button>
              
              <ul className="mt-8 space-y-3 text-left">
                {PRICING_PLANS.premium.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <svg className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span>Privacy Protected</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
            <span>Cancel Anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;