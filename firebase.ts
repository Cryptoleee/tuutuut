import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBFn6eYlA5HKOl1XSE-KhXzsY7htHxf250",
  authDomain: "tuutuut-ce23b.firebaseapp.com",
  projectId: "tuutuut-ce23b",
  storageBucket: "tuutuut-ce23b.firebasestorage.app",
  messagingSenderId: "338164790322",
  appId: "1:338164790322:web:a154871d46c469d2d8782b",
  measurementId: "G-CB799E1DWR"
};

// Helper to check if the user has actually configured their backend
// Since we have hardcoded valid config, this is always true now.
export const isFirebaseConfigured = () => {
    return true;
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

// Legacy helpers kept for compatibility but no longer used for dynamic config
export const saveFirebaseConfig = (config: any) => {
    console.log("Config is now hardcoded.");
};

export const resetFirebaseConfig = () => {
    console.log("Config is now hardcoded.");
};