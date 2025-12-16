import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const adminEmail = 'winawathns11@gmail.com';

  const loadUserData = async (currentUser: User) => {
    try {
      // 1. จัดการเรื่อง Role ก่อนเพื่อความเร็ว
      if (currentUser.email === adminEmail) {
        setRoles(['super_admin']); 
      } else {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id);
        setRoles(data?.map((r: any) => String(r.role)) || []); 
      }

      // 2. ดึง Profile
     const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId) // เปลี่ยนจาก user_id เป็น id ตาม Error ใน Console
      .maybeSingle();
      setProfile(profileData);
    } catch (error) {
      console.error('Auth data loading error:', error);
    } finally {
      setLoading(false); // มั่นใจว่ายังไงก็ต้องเลิก Loading 
    }
  };

  useEffect(() => {
    // ดึง Session เริ่มต้น
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadUserData(currentUser);
      } else {
        setLoading(false);
      }
    });

    // ติดตามการเปลี่ยนแปลง Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);
      if (currentUser) {
        loadUserData(currentUser);
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: string) => {
    if (user?.email === adminEmail && role === 'super_admin') return true; 
    return roles.includes(role); 
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    return await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const refreshProfile = async () => {
    if (user) await loadUserData(user);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signIn, signUp, signOut, refreshProfile, hasRole }}>
      {children} 
    </AuthContext.Provider>
  );
};