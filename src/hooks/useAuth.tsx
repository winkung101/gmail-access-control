// src/hooks/useAuth.tsx
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any;
  loading: boolean;
  superAdminExists: boolean; // เพิ่ม: สถานะว่ามี super admin อยู่แล้วหรือไม่
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [superAdminExists, setSuperAdminExists] = useState(false); // Initial state

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  // ฟังก์ชันใหม่เพื่อตรวจสอบว่ามี super admin อยู่แล้วหรือไม่
  const checkSuperAdminExists = async () => {
    try {
      const { data, error } = await supabase.rpc('has_any_super_admin_exists');
      if (error) throw error;
      setSuperAdminExists(data);
    } catch (error) {
      console.error('Error checking super admin existence:', error);
      setSuperAdminExists(false); // Default to false on error
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
    // ควรเรียก checkSuperAdminExists ด้วยเมื่อมีการ refresh profile
    await checkSuperAdminExists();
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // ใช้ setTimeout เพื่อให้แน่ใจว่า Supabase RLS มีเวลาอัปเดต context
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
        // เรียก checkSuperAdminExists เมื่อสถานะ Auth เปลี่ยนแปลง
        checkSuperAdminExists();
      }
    );

    // Get initial session and check super admin existence
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
      // เรียก checkSuperAdminExists ในการโหลดครั้งแรกด้วย
      await checkSuperAdminExists();
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array means this runs once on mount

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSuperAdminExists(false); // Reset when signed out
  };

  const value = {
    user,
    session,
    profile,
    loading,
    superAdminExists, // เพิ่ม: ส่ง superAdminExists ผ่าน context
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};