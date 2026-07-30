import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import supabase from '@/api/supabaseClient';

const AuthContext = createContext();

const isAdmin = (role) => role === 'admin';

const fetchProfile = async (userId) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return { profile: data, error };
};

const fetchPendingRequestCount = async () => {
  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  if (error) return 0;
  return count || 0;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Global property states
  const [propertiesList, setPropertiesList] = useState([]);
  const [selectedProperty, setSelectedPropertyState] = useState(null);

  const setSelectedProperty = (property) => {
    setSelectedPropertyState(property);
    if (property?.id) {
      localStorage.setItem('selectedPropertyId', property.id);
    } else {
      localStorage.removeItem('selectedPropertyId');
    }
  };

  const refreshProperties = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('properties').select('*');
      if (error) throw error;
      const mapped = (data || []).map(row => ({
        id: row.id,
        name: row.property_name || row.name || 'Unnamed Property',
        city: row.city || '',
        cover_image: row.cover_image || row.image_url || ''
      }));
      setPropertiesList(mapped);

      const savedId = localStorage.getItem('selectedPropertyId');
      const found = mapped.find(p => p.id === savedId);
      if (found) {
        setSelectedPropertyState(found);
      } else if (mapped.length > 0) {
        setSelectedPropertyState(mapped[0]);
      } else {
        setSelectedPropertyState(null);
      }
      return mapped;
    } catch (err) {
      console.error('Error loading properties list:', err);
      setPropertiesList([]);
      setSelectedPropertyState(null);
      return [];
    }
  }, []);

  const refreshUser = useCallback(async (session) => {
    if (!session?.user) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      setPendingRequestsCount(0);
      setPropertiesList([]);
      setSelectedPropertyState(null);
      return;
    }

    const sessionUser = session.user;
    const { profile, error } = await fetchProfile(sessionUser.id);

    if (error || !profile) {
      setAuthError({
        type: 'user_not_registered',
        message: 'Your user profile could not be found. Please contact an administrator.',
      });
      setIsAuthenticated(false);
      setUser(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    if (profile.status === 'pending') {
      setAuthError({
        type: 'pending_approval',
        message: 'Your account is pending approval. Administrator approval required.',
      });
      setIsAuthenticated(false);
      setUser(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    if (profile.status === 'rejected') {
      setAuthError({
        type: 'rejected',
        message: 'Your request has been rejected.',
      });
      setIsAuthenticated(false);
      setUser(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    if (profile.status === 'suspended') {
      setAuthError({
        type: 'suspended',
        message: 'Your account has been suspended. Please contact an administrator.',
      });
      setIsAuthenticated(false);
      setUser(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    setUser({
      id: sessionUser.id,
      email: sessionUser.email,
      full_name: profile.full_name,
      role: profile.role,
      status: profile.status,
      phone: profile.phone || '',
      address: profile.address || '',
    });
    setIsAuthenticated(true);
    setAuthError(null);
    setIsLoadingAuth(false);
    setAuthChecked(true);

    // Refresh properties on successful active user authentication
    await refreshProperties();

    if (isAdmin(profile.role)) {
      const pendingCount = await fetchPendingRequestCount();
      setPendingRequestsCount(pendingCount);
    } else {
      setPendingRequestsCount(0);
    }
  }, [refreshProperties]);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      setAuthError({ type: 'auth_required', message: 'Authentication required' });
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    if (!session?.user) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    await refreshUser(session);
  }, [refreshUser]);

  useEffect(() => {
    checkUserAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        refreshUser(session);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        setPendingRequestsCount(0);
        setPropertiesList([]);
        setSelectedPropertyState(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkUserAuth, refreshUser]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    setPendingRequestsCount(0);
    setPropertiesList([]);
    setSelectedPropertyState(null);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const updateProfile = async (updates) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (error) throw error;
    await checkUserAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        authError,
        authChecked,
        pendingRequestsCount,
        propertiesList,
        selectedProperty,
        setSelectedProperty,
        refreshProperties,
        updateProfile,
        logout,
        navigateToLogin,
        checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
