'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Feature {
  key: string;
  name: string;
  description: string;
  requiredTier: string;
  hasAccess: boolean;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  tier: string;
  category: string;
  isBuiltIn: boolean;
  isAvailable: boolean;
  lockReason?: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  tier: string;
  category: string;
  steps: number;
  maxTokens: number;
  isBuiltIn: boolean;
  isAvailable: boolean;
  lockReason?: string;
}

export default function FeaturesPage() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<any>(null);
  const [roles, setRoles] = useState<any>(null);
  const [tasks, setTasks] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'features' | 'roles' | 'tasks'>('features');

  const fetchFeatures = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/features/check-access?userId=${user.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        setFeatures(data);
      } else {
        console.error('Failed to fetch features');
      }
    } catch (error) {
      console.error('Error fetching features:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/features/roles?userId=${user.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      } else {
        console.error('Failed to fetch roles');
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/features/tasks?userId=${user.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        console.error('Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const testFeatureAccess = async (featureKey: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/features/check-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          feature: featureKey,
          requestedAction: 'test_access'
        }),
      });

      const result = await response.json();
      alert(`Feature: ${featureKey}\nAccess: ${result.hasAccess ? 'Granted' : 'Denied'}\nReason: ${result.reason}`);
    } catch (error) {
      console.error('Error testing feature access:', error);
      alert('Error testing feature access');
    }
  };

  useEffect(() => {
    if (user) {
      fetchFeatures();
      fetchRoles();
      fetchTasks();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">🔐 Features & Premium Content</h1>
        <div className="p-4 bg-yellow-100 rounded">
          <p>Please log in to view your available features, roles, and tasks.</p>
          <a href="/login" className="text-blue-600 underline">→ Log In</a>
        </div>
      </div>
    );
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'free': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessBadgeColor = (hasAccess: boolean) => {
    return hasAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">🔐 Features & Premium Content</h1>

      {/* User Status */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Your Account Status</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>User ID:</strong> <code className="text-xs">{user.uid}</code>
          </div>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <div>
            <strong>Current Tier:</strong> 
            <span className={`ml-2 px-2 py-1 rounded text-xs ${getTierBadgeColor(features?.user?.tier || 'limited')}`}>
              {features?.user?.tier || 'Limited'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setSelectedTab('features')}
          className={`px-6 py-3 font-medium ${selectedTab === 'features' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Feature Access
        </button>
        <button
          onClick={() => setSelectedTab('roles')}
          className={`px-6 py-3 font-medium ${selectedTab === 'roles' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          AI Roles
        </button>
        <button
          onClick={() => setSelectedTab('tasks')}
          className={`px-6 py-3 font-medium ${selectedTab === 'tasks' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          AI Tasks
        </button>
      </div>

      {/* Features Tab */}
      {selectedTab === 'features' && (
        <div>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Loading features...</p>
            </div>
          ) : features ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold">Summary</h3>
                  <p>Total Features: {features.summary?.total || 0}</p>
                  <p>Accessible: {features.summary?.accessible || 0}</p>
                  <p>Premium Only: {features.summary?.premium || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold">Subscription</h3>
                  <p>Status: {features.user?.subscriptionStatus}</p>
                  <p>Tier: {features.user?.tier}</p>
                </div>
              </div>

              {Object.entries(features.features || {}).map(([category, categoryFeatures]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-xl font-semibold capitalize">{category} Features</h3>
                  <div className="grid gap-3">
                    {(categoryFeatures as Feature[]).map((feature) => (
                      <div key={feature.key} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{feature.name}</h4>
                              <span className={`px-2 py-1 rounded text-xs ${getTierBadgeColor(feature.requiredTier)}`}>
                                {feature.requiredTier}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${getAccessBadgeColor(feature.hasAccess)}`}>
                                {feature.hasAccess ? 'Accessible' : 'Locked'}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm">{feature.description}</p>
                          </div>
                          <button
                            onClick={() => testFeatureAccess(feature.key)}
                            className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Test Access
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No features data available</p>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {selectedTab === 'roles' && (
        <div>
          {roles ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold">Available Roles</h3>
                  <p className="text-2xl font-bold">{roles.roles?.available?.length || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold">Locked Roles</h3>
                  <p className="text-2xl font-bold">{roles.roles?.locked?.length || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold">Can Create Custom</h3>
                  <p className="text-2xl font-bold">{roles.capabilities?.canCreateCustomRoles ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Available Roles */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Available Roles</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {roles.roles?.available?.map((role: Role) => (
                    <div key={role.id} className="p-4 border rounded-lg bg-green-50">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{role.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${getTierBadgeColor(role.tier)}`}>
                          {role.tier}
                        </span>
                        {role.isBuiltIn && (
                          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">Built-in</span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">{role.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Category: {role.category}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Locked Roles */}
              {roles.roles?.locked?.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Locked Roles (Upgrade Required)</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {roles.roles.locked.map((role: Role) => (
                      <div key={role.id} className="p-4 border rounded-lg bg-red-50">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-600">{role.name}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${getTierBadgeColor(role.tier)}`}>
                            {role.tier}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">{role.description}</p>
                        <p className="text-red-600 text-xs mt-1">{role.lockReason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>No roles data available</p>
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {selectedTab === 'tasks' && (
        <div>
          {tasks ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold">Available Tasks</h3>
                  <p className="text-2xl font-bold">{tasks.summary?.totalAvailable || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold">Locked Tasks</h3>
                  <p className="text-2xl font-bold">{tasks.summary?.totalLocked || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold">Custom Tasks</h3>
                  <p className="text-2xl font-bold">{tasks.summary?.customTasks || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold">Max Tokens</h3>
                  <p className="text-2xl font-bold">{tasks.capabilities?.maxTokensPerTask || 0}</p>
                </div>
              </div>

              {/* Available Tasks by Category */}
              {Object.entries(tasks.categories || {}).map(([category, categoryTasks]) => {
                if (!Array.isArray(categoryTasks) || categoryTasks.length === 0) return null;
                
                return (
                  <div key={category}>
                    <h3 className="text-xl font-semibold mb-4 capitalize">{category} Tasks</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {categoryTasks.map((task: Task) => (
                        <div key={task.id} className="p-4 border rounded-lg bg-green-50">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{task.name}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${getTierBadgeColor(task.tier)}`}>
                              {task.tier}
                            </span>
                            {task.isBuiltIn && (
                              <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">Built-in</span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                          <div className="text-xs text-gray-500">
                            <span>Steps: {task.steps}</span>
                            <span className="ml-4">Max Tokens: {task.maxTokens}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Locked Tasks */}
              {tasks.tasks?.locked?.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Locked Tasks (Upgrade Required)</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {tasks.tasks.locked.map((task: Task) => (
                      <div key={task.id} className="p-4 border rounded-lg bg-red-50">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-600">{task.name}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${getTierBadgeColor(task.tier)}`}>
                            {task.tier}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                        <div className="text-xs text-gray-500 mb-2">
                          <span>Steps: {task.steps}</span>
                          <span className="ml-4">Max Tokens: {task.maxTokens}</span>
                        </div>
                        <p className="text-red-600 text-xs">{task.lockReason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>No tasks data available</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 pt-4 border-t">
        <div className="flex gap-4">
          <a href="/debug-trial" className="text-blue-600 underline">→ Trial Debug</a>
          <a href="/admin/usage-dashboard" className="text-blue-600 underline">→ Usage Dashboard</a>
          <a href="/pricing" className="text-blue-600 underline">→ Pricing</a>
          <a href="/dashboard" className="text-blue-600 underline">→ Dashboard</a>
        </div>
      </div>
    </div>
  );
}