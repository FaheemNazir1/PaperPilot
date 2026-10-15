import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

const cleanEnv = (val?: string): string => {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
};

const apiKey = cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY);
const authDomain = cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
const projectId = cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID);
const storageBucket = cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
const messagingSenderId = cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
const appId = cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID);

/**
 * Returns true if valid Firebase configuration values are provided
 * via environment variables (.env.local or production environment).
 */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    apiKey &&
    !apiKey.includes('<') &&
    authDomain &&
    !authDomain.includes('<') &&
    projectId &&
    !projectId.includes('<')
  );
};

// Fallback configuration allows the app to bundle and load safely even if keys
// are momentarily pending user entry, avoiding unhandled module init crashes.
const activeConfig = isFirebaseConfigured()
  ? {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    }
  : {
      apiKey: 'AIzaSyDummyKeyForInitializationPaperPilot',
      authDomain: 'paperpilot-app.firebaseapp.com',
      projectId: 'paperpilot-app',
      storageBucket: 'paperpilot-app.appspot.com',
      messagingSenderId: '100000000000',
      appId: '1:100000000000:web:0000000000000000000000',
    };

// Initialize Firebase App
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(activeConfig);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Configure Google Auth Provider with interactive account selection
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export default app;
