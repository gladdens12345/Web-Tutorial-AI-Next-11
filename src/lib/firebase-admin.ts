import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let cachedApp: any = null;
let cachedDb: any = null;

function initializeFirebaseAdmin() {
  if (cachedApp) return cachedApp;
  
  // Check if we're in a build environment (environment variables might not be available)
  if (typeof process === 'undefined' || !process.env) {
    throw new Error('Firebase Admin can only be used on the server side');
  }
  
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Missing required Firebase Admin environment variables');
  }

  if (getApps().length === 0) {
    cachedApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
    cachedApp = getApps()[0];
  }
  
  return cachedApp;
}

function getAdminDatabase() {
  if (cachedDb) return cachedDb;
  
  const app = initializeFirebaseAdmin();
  cachedDb = getFirestore(app);
  return cachedDb;
}

// Export a proxy that initializes lazily
export const adminDb = new Proxy({} as any, {
  get(target, prop) {
    // During build time, just return undefined for any property access
    try {
      const db = getAdminDatabase();
      return typeof db[prop] === 'function' ? db[prop].bind(db) : db[prop];
    } catch (error) {
      // During build time, return a mock to prevent errors
      if (prop === 'collection') {
        return () => ({
          doc: () => ({}),
          add: () => Promise.resolve({}),
          get: () => Promise.resolve({ docs: [] }),
          where: () => ({
            get: () => Promise.resolve({ docs: [] })
          })
        });
      }
      return undefined;
    }
  }
});

// Also export the app for any direct usage
export const adminApp = new Proxy({} as any, {
  get(target, prop) {
    try {
      const app = initializeFirebaseAdmin();
      return typeof app[prop] === 'function' ? app[prop].bind(app) : app[prop];
    } catch (error) {
      return undefined;
    }
  }
});