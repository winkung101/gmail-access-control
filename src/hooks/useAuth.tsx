import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: string) => boolean;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      // ดึงข้อมูลบทบาทจากตาราง user_roles
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // แปลงข้อมูลจาก Enum/Array เป็น Array ของ String
      const fetchedRoles = data?.map((r: any) => String(r.role)) || [];
      console.log("Fetched roles for user:", userId, fetchedRoles);
      setRoles(fetchedRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
    }
  };

  const hasRole = (role: string) => roles.includes(role);

  useEffect(() => {
    // ตรวจสอบ Session เมื่อเริ่มต้นแอป
    const initAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await Promise.all([
          fetchProfile(currentUser.id),
          fetchRoles(currentUser.id)
        ]);
      }
      setLoading(false);
    };

    initAuth();

    // ติดตามการเปลี่ยนแปลงสถานะ Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth event:", event);
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await Promise.all([
            fetchProfile(currentUser.id),
            fetchRoles(currentUser.id)
          ]);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
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
    setRoles([]);
  };

  const value = {
    user,
    session,
    profile,
    roles,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};