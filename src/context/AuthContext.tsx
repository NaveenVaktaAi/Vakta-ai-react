import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { AuthContextType, User, SignupRequest, LoginRequest, SendOTPRequest } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
          } else {
            // Try to fetch user data
            await refreshUser();
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData.user || userData);
      if (userData.user) {
        localStorage.setItem('user', JSON.stringify(userData.user));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const signup = async (data: SignupRequest) => {
    try {
      const result = await authService.signup(data);
      
      // After successful signup, user is automatically logged in
      // Store user data if available
      if (result.user) {
        console.log('✅ Storing user data after signup+auto-login');
        setUser(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Store tokens if available
        if (result.access_token) {
          localStorage.setItem('access_token', result.access_token);
        }
        if (result.refresh_token) {
          localStorage.setItem('refresh_token', result.refresh_token);
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const login = async (data: LoginRequest, isFirebaseAuth: boolean = true) => {
    try {
      const response = await authService.login(data, isFirebaseAuth);
      if (response.user) {
        setUser(response.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      setUser(null);
    }
  };

  const sendOTP = async (data: SendOTPRequest) => {
    try {
      await authService.sendOTP(data);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signup,
    login: async (data: LoginRequest) => login(data, true), // Default to Firebase auth
    logout,
    sendOTP,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

