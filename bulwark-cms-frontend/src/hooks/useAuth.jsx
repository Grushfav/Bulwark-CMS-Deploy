import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        const retryAfter = error.response?.data?.retryAfter || 15;
        return {
          success: false,
          error: `Too many login attempts. Please wait ${retryAfter} minutes before trying again.`,
          isRateLimited: true,
          retryAfter
        };
      }
      
      // Handle other errors
      return { 
        success: false, 
        error: error.response?.data?.error || error.response?.data?.message || 'Login failed. Please check your credentials.',
        isRateLimited: false
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user,
    isManager: user?.role === 'manager',
    isAgent: user?.role === 'agent',
    // Role-based access control utilities
    canViewAllData: false, // Managers now only see their own data
    canViewOwnData: true, // All users can view their own data
    canManageUsers: user?.role === 'manager',
    canAccessAllClients: false, // Managers now only see their own clients
    canAccessAllSales: false, // Managers now only see their own sales
    canCreateSales: true, // All users can create sales
    canViewReports: true, // All users can view reports
    // Helper functions
    hasRole: (role) => user?.role === role,
    hasAnyRole: (roles) => roles.includes(user?.role),
    isCurrentUser: (userId) => user?.id === userId,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

