'use client';

import React, { useState, useEffect } from 'react';
import { getApp } from '@firebase/app';
import { getStripePayments, getProducts } from '@invertase/firestore-stripe-payments';

const app = getApp();
const payments = getStripePayments(app, {
  productsCollection: 'products',
  customersCollection: 'customers',
});

export default function DebugStripePrices() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Fetching products from Firestore...');
      const allProducts = await getProducts(payments, {
        includePrices: true,
        activeOnly: false, // Get all products, even inactive ones
      });
      
      console.log('📦 Products found:', allProducts);
      setProducts(allProducts);
      
      if (allProducts.length === 0) {
        setError('No products found in Firestore. You may need to sync your Stripe products.');
      }
    } catch (err: any) {
      console.error('❌ Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 rounded-lg mt-8">
      <h3 className="text-lg font-semibold mb-4">🔧 Debug: Stripe Products in Firestore</h3>
      
      <button
        onClick={fetchProducts}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Refresh Products'}
      </button>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="text-sm">
          <strong>Expected Price ID:</strong> <code className="bg-gray-200 px-2 py-1 rounded">price_1Rf7n1J87O5sKhPtZ8C6dKnO</code>
        </div>
        
        <div className="text-sm">
          <strong>Products Found:</strong> {products.length}
        </div>

        {products.length > 0 ? (
          <div className="space-y-2">
            {products.map((product, index) => (
              <div key={product.id} className="p-3 bg-white rounded border">
                <div className="text-sm font-mono">
                  <div><strong>Product ID:</strong> {product.id}</div>
                  <div><strong>Name:</strong> {product.name}</div>
                  <div><strong>Active:</strong> {product.active ? '✅' : '❌'}</div>
                  <div><strong>Prices:</strong></div>
                  <div className="ml-4">
                    {product.prices?.length > 0 ? (
                      product.prices.map((price: any) => (
                        <div key={price.id} className="text-xs bg-gray-100 p-2 rounded mt-1">
                          <div><strong>Price ID:</strong> {price.id}</div>
                          <div><strong>Amount:</strong> ${(price.unit_amount / 100).toFixed(2)}</div>
                          <div><strong>Interval:</strong> {price.interval || 'one-time'}</div>
                          <div><strong>Active:</strong> {price.active ? '✅' : '❌'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">No prices found</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
              <p className="text-sm text-yellow-800">
                <strong>No products found!</strong> This means your Stripe products haven't been synced to Firestore yet.
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                The Firebase Extension should automatically sync products, but you may need to:
                <br />• Check that your Stripe webhook is working
                <br />• Manually trigger a product sync
                <br />• Verify your Stripe API key permissions
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}