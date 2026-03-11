import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type UserRole = 'worker' | 'employer' | 'admin';

export interface UserProfile {
  uid: string;
  role: UserRole;
  email: string;
  displayName?: string;
  createdAt: any;
  updatedAt: any;
  // Worker fields
  experienceYears?: number;
  currentFactory?: string;
  skills?: string[];
  machineExpertise?: string[];
  videoPortfolioUrl?: string;
  translatedCV?: string;
  status?: 'available' | 'hired' | 'inactive';
  // Employer fields
  companyName?: string;
  location?: string;
  companySize?: string;
  industry?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Create default profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              role: 'worker', // Default role, user can choose during onboarding
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
      setProfile((prev) => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, updateProfile }}>
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
