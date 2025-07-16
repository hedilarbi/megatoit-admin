"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

// import { UserData } from '@/types/user';

interface AuthContextType {
  user: User | null;
  // userData: UserData | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  // userData: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  //const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // try {
        //   const userDoc = await getUserDocument(firebaseUser.uid);
        //   if (userDoc) {
        //     setUserData({
        //       uid: firebaseUser.uid,
        //       ...userDoc,
        //       email: firebaseUser.email || '',
        //     });
        //   }
        // } catch (error) {
        //   console.error('Error fetching user data:', error);
        // }
      } else {
        setUser(null);
        //setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
