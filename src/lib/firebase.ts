import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, CACHE_SIZE_UNLIMITED, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings that might help in restricted network environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
}, firebaseConfig.firestoreDatabaseId);

// CRITICAL: Validate connection to Firestore
async function testConnection() {
  try {
    // Attempt to fetch a non-existent document simply to verify connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'check'));
    console.log("Firestore connection verified.");
  } catch (error: any) {
    // 'permission-denied' means we ARE connected but rules blocked us (which is fine for a probe)
    if (error.code === 'permission-denied') {
      console.log("Firestore connection verified (Access restricted as expected).");
      return;
    }
    
    if (error.message && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration. The client is reporting as offline.");
    } else {
      console.warn("Firestore connectivity check status (possible quota limit or offline mode):", error.message || error);
    }
  }
}

testConnection();

let storageInstance: any = null;

export const getStorageSafe = () => {
  if (storageInstance) return storageInstance;
  try {
    storageInstance = getStorage(app);
    return storageInstance;
  } catch (error) {
    console.warn('Firebase Storage service is not available. Falling back to local data URLs.');
    return null;
  }
};

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

