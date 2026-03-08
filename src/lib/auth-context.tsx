import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  worker: Tables<'workers'> | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshWorker: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, worker: null, isAdmin: false, loading: true,
  signOut: async () => {}, refreshWorker: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [worker, setWorker] = useState<Tables<'workers'> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchWorkerAndRole = useCallback(async (userId: string) => {
    const [workerRes, roleRes] = await Promise.all([
      supabase.from('workers').select('*').eq('user_id', userId).maybeSingle(),
      supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
    ]);
    if (workerRes.data) setWorker(workerRes.data);
    if (roleRes.data) setIsAdmin(roleRes.data);
  }, []);

  const refreshWorker = useCallback(async () => {
    if (user) await fetchWorkerAndRole(user.id);
  }, [user, fetchWorkerAndRole]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchWorkerAndRole(session.user.id), 0);
      } else {
        setWorker(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchWorkerAndRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchWorkerAndRole]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setWorker(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, worker, isAdmin, loading, signOut, refreshWorker }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
