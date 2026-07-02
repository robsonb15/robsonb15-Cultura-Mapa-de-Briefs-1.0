import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { handleFirestoreError, OperationType } from './error-handler';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  appConfig: any;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [appConfig, setAppConfig] = useState<any>({ adminEmails: ['robsonstudio15hd@gmail.com', 'portalseculte@gmail.com'] });

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure profile documentation exists (for redirect or popups)
        const docRef = doc(db, 'users', currentUser.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            const displayName = currentUser.displayName && currentUser.displayName.trim().length >= 3 
              ? currentUser.displayName 
              : 'Usuário';
            const newProfile = {
              uid: currentUser.uid,
              fullName: displayName,
              privateEmail: currentUser.email || '',
              miniBio: '',
              areas: [] as string[],
              acceptedTerms: {
                terms: true,
                privacy: true,
                image: true
              },
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile as any);
          } else {
            setProfile(docSnap.data() as UserProfile);
          }
        } catch (error) {
          console.error("Error with state change profile check:", error);
          await fetchProfile(currentUser.uid);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle redirect result extraction (if redirected/mobile-based authentication)
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const currentUser = result.user;
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            const displayName = currentUser.displayName && currentUser.displayName.trim().length >= 3 
              ? currentUser.displayName 
              : 'Usuário';
            const newProfile = {
              uid: currentUser.uid,
              fullName: displayName,
              privateEmail: currentUser.email || '',
              miniBio: '',
              areas: [] as string[],
              acceptedTerms: {
                terms: true,
                privacy: true,
                image: true
              },
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile as any);
          } else {
            setProfile(docSnap.data() as UserProfile);
          }
        }
      })
      .catch((error) => {
        console.error("Redirect retrieval error:", error);
      });
  }, []);

  const loginWithGoogle = async () => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, use redirect to prevent blocked pop-ups
        await signInWithRedirect(auth, googleProvider);
      } else {
        // On desktop, use popup
        const result = await signInWithPopup(auth, googleProvider);
        const currentUser = result.user;
        
        // Check if profile exists, if not create it
        const docRef = doc(db, 'users', currentUser.uid);
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          return;
        }
        
        if (!docSnap.exists()) {
          const displayName = currentUser.displayName && currentUser.displayName.trim().length >= 3 
            ? currentUser.displayName 
            : 'Usuário';
          const newProfile = {
            uid: currentUser.uid,
            fullName: displayName,
            privateEmail: currentUser.email || '',
            miniBio: '',
            areas: [] as string[],
            acceptedTerms: {
              terms: true,
              privacy: true,
              image: true
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          try {
            await setDoc(docRef, newProfile);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}`);
            return;
          }
          await fetchProfile(currentUser.uid);
        }
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, appConfig, loginWithGoogle, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
