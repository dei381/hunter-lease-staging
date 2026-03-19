import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore } from '../store/authStore';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setUser, setRole, setAuthReady } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        
        if (user) {
          // Check if user exists in Firestore
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const currentRole = userSnap.data().role;
            // Auto-upgrade the default admin if they are currently a customer
            if (user.email === 'azat.cutliahmetov@gmail.com' && currentRole !== 'admin') {
              await updateDoc(userRef, { role: 'admin', updatedAt: serverTimestamp() });
              setRole('admin');
            } else {
              setRole(currentRole as 'customer' | 'admin');
            }
          } else {
            // Create new user
            const role = user.email === 'azat.cutliahmetov@gmail.com' ? 'admin' : 'customer';
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              name: user.displayName || '',
              phone: user.phoneNumber || '',
              role,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setRole(role);
          }

          // Claim leads
          if (user.email) {
            try {
              const leadsRef = collection(db, 'leads');
              const q = query(leadsRef, where('email', '==', user.email), where('userId', '==', null));
              const querySnapshot = await getDocs(q);
              
              const updatePromises = querySnapshot.docs.map(docSnap => 
                updateDoc(docSnap.ref, { userId: user.uid })
              );
              
              if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                console.log(`Claimed ${updatePromises.length} leads for user ${user.email}`);
              }
            } catch (error) {
              console.error('Error claiming leads:', error);
            }
          }
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [setUser, setRole, setAuthReady]);

  return <>{children}</>;
};
