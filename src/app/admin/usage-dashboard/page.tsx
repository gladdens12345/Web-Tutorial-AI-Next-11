'use client';

import React, { useState, useEffect } from 'react';

interface UsageStats {
  totalUsers: number;
  usersByStatus: Record<string, number>;
  dailyUsage: Record<string, number>;
  activeSessions: number;
  averageSessionTime: number;
  topUsers: Array<{
    userId: string;
    email: string;
    totalUsage: number;
    status: string;
  }>;
}

export default function UsageDashboardPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userUsageData, setUserUsageData] = useState<any>(null);

  const fetchUsageStats = async () => {
    if (!apiKey) {
      alert('Please enter your admin API key');
      return;
    }

    setIsLoading(true);
    try {
      // This would need to be implemented as a proper admin API
      const response = await fetch('/api/admin/usage-stats', {
        headers: {
          'x-api-key': apiKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        alert('Failed to fetch stats. Check your API key.');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      alert('Error fetching stats: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserUsage = async () => {
    if (!selectedUserId) {
      alert('Please enter a user ID');
      return;
    }

    try {
      const response = await fetch(`/api/usage/validate-usage?userId=${selectedUserId}`);
      
      if (response.ok) {
        const data = await response.json();
        setUserUsageData(data);
      } else {
        alert('Failed to fetch user usage data');
      }
    } catch (error) {
      console.error('Error checking user usage:', error);
      alert('Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">📊 Usage Dashboard (Admin)</h1>

      {/* API Key Input */}
      <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h2 className="text-lg font-semibold mb-2">Admin Access</h2>
        <div className="flex gap-4">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter admin API key"
            className="flex-1 px-3 py-2 border border-gray-300 rounded"
          />
          <button
            onClick={fetchUsageStats}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Fetch Stats'}
          </button>
        </div>
      </div>

      {/* Usage Statistics */}
      {stats && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
          </div>
          
          <div className="p-6 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800">Active Sessions</h3>
            <p className="text-3xl font-bold text-green-600">{stats.activeSessions}</p>
          </div>
          
          <div className="p-6 bg-purple-50 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-800">Avg Session Time</h3>
            <p className="text-3xl font-bold text-purple-600">
              {Math.round(stats.averageSessionTime / 60000)}m
            </p>
          </div>
          
          <div className="p-6 bg-orange-50 rounded-lg">
            <h3 className="text-lg font-semibold text-orange-800">Premium Users</h3>
            <p className="text-3xl font-bold text-orange-600">
              {stats.usersByStatus.premium || 0}
            </p>
          </div>
        </div>
      )}

      {/* Users by Status */}
      {stats && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Users by Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.usersByStatus).map(([status, count]) => (
              <div key={status} className="p-4 bg-gray-50 rounded">
                <div className="font-semibold capitalize">{status}</div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Lookup */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">User Usage Lookup</h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            placeholder="Enter user ID"
            className="flex-1 px-3 py-2 border border-gray-300 rounded"
          />
          <button
            onClick={checkUserUsage}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Check Usage
          </button>
        </div>

        {userUsageData && (
          <div className="p-4 bg-white border rounded">
            <h3 className="font-semibold mb-2">User Usage Data:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>User ID:</strong> {userUsageData.userId}
                <br />
                <strong>Status:</strong> {userUsageData.subscription.status}
                <br />
                <strong>Unlimited Access:</strong> {userUsageData.subscription.unlimitedAccess ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Today's Usage:</strong> {Math.round(userUsageData.dailyUsage.today / 60000)} minutes
                <br />
                <strong>Daily Limit:</strong> {userUsageData.dailyUsage.limit === -1 ? 'Unlimited' : Math.round(userUsageData.dailyUsage.limit / 60000) + ' minutes'}
                <br />
                <strong>Usage Left:</strong> {userUsageData.dailyUsage.usageLeft === -1 ? 'Unlimited' : Math.round(userUsageData.dailyUsage.usageLeft / 60000) + ' minutes'}
                <br />
                <strong>Limit Exceeded:</strong> {userUsageData.dailyUsage.limitExceeded ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Testing */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">API Testing</h2>
        <div className="p-4 bg-gray-50 rounded text-sm">
          <h3 className="font-semibold mb-2">Available APIs:</h3>
          <div className="space-y-1">
            <div><strong>Track Usage:</strong> <code>POST /api/usage/track-daily-usage</code></div>
            <div><strong>Validate Usage:</strong> <code>POST /api/usage/validate-usage</code></div>
            <div><strong>Session Tracking:</strong> <code>POST /api/usage/session</code></div>
            <div><strong>Usage Stats:</strong> <code>GET /api/usage/track-daily-usage?userId=X</code></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Test Daily Usage Tracking</h3>
            <button
              onClick={() => {
                const userId = prompt('Enter user ID:');
                const usageTime = prompt('Enter usage time (milliseconds):');
                if (userId && usageTime) {
                  fetch('/api/usage/track-daily-usage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, usageTime: parseInt(usageTime) })
                  }).then(r => r.json()).then(console.log);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Track Usage
            </button>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Test Usage Validation</h3>
            <button
              onClick={() => {
                const userId = prompt('Enter user ID:');
                if (userId) {
                  fetch('/api/usage/validate-usage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                  }).then(r => r.json()).then(console.log);
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Validate Usage
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 pt-4 border-t">
        <div className="flex gap-4">
          <a href="/debug-trial" className="text-blue-600 underline">→ Trial Debug Page</a>
          <a href="/admin" className="text-blue-600 underline">→ Admin Home</a>
          <a href="/dashboard" className="text-blue-600 underline">→ User Dashboard</a>
        </div>
      </div>
    </div>
  );
}