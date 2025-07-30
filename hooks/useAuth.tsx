import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: { full_name?: string; role?: string } | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Computed value for admin check
  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });
    useEffect(() => {
  console.log('Current user:', user);
  console.log('Is admin:', isAdmin);
}, [user, isAdmin]);

 


    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session);
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setSession(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    console.log('Fetching user profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', userId)
        .single();
      
      console.log('User profile response:', { data, error });
      
      if (error) {
        console.error('Error fetching user profile:', error);
        // If profile doesn't exist, create one with default values
        if (error.code === 'PGRST116') { // No rows returned
          console.log('Creating default user profile...');
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert([
              {
                id: userId,
                full_name: '',
                email: session?.user?.email || '',
                role: 'user'
              }
            ]);
          
          if (!insertError) {
            setUserProfile({ full_name: '', role: 'user' });
          }
        }
      } else if (data) {
        console.log('Setting user profile:', data);
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    // If user is created and we have a full name, save it to the profile
    // New users get 'user' role by default
    if (data.user && fullName) {
      try {
        await supabase
          .from('user_profiles')
          .insert([
            {
              id: data.user.id,
              full_name: fullName,
              email: email,
              role: 'user', // Default role for new users
            }
          ]);
      } catch (profileError) {
        console.error('Error creating user profile:', profileError);
        // Don't throw here as the user account was created successfully
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  console.log('Auth state:', { session: !!session, userProfile, loading, isAdmin });

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        userProfile,
        loading,
        isAdmin,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};