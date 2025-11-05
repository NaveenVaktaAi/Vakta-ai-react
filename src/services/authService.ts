import api from './api';
import { 
  SignupRequest, 
  LoginRequest, 
  SendOTPRequest, 
  OTPVerificationRequest,
  SignupResponse,
  LoginResponse,
  OTPResponse,
  User 
} from '../types/auth';

export const authService = {
  // Send OTP for signup or login
  sendOTP: async (data: SendOTPRequest): Promise<OTPResponse> => {
    // Note: With Firebase, OTP is sent by Firebase SDK on client side
    // This endpoint is kept for backward compatibility or SMS-based OTP
    const response = await api.post('/auth/send-otp', data);
    return response.data;
  },

  // Resend OTP
  resendOTP: async (data: SendOTPRequest): Promise<OTPResponse> => {
    const response = await api.post('/auth/resend-otp', data);
    return response.data;
  },

  // Sign up a new user
  signup: async (data: SignupRequest): Promise<SignupResponse> => {
    console.log('🔵 Making signup request to: /auth/signup');
    console.log('🔵 Request data:', data);
    const response = await api.post('/auth/signup', data);
    console.log('✅ Signup response:', response.data);
    
    // Auto-login after signup (internal login without OTP)
    try {
      console.log('🔄 Auto-logging in user after signup...');
      
      // Create a mock login with Firebase verified marker
      const loginData = {
        phone_number: data.phone_number,
        phone_country_code: data.phone_country_code,
        otp: 'firebase_verified' // Bypass OTP since signup already verified
      };
      
      // Login internally to get tokens
      const loginResponse = await api.post('/auth/login', {
        phone_number: data.phone_number,
        phone_country_code: data.phone_country_code,
        otp: 'firebase_verified' // Bypass OTP since already verified during signup
      });
      
      console.log('✅ Auto-login successful:', loginResponse.data);
      
      // Return both signup and login data
      return {
        ...response.data,
        access_token: loginResponse.data.access_token,
        refresh_token: loginResponse.data.refresh_token,
        user: loginResponse.data.user
      };
    } catch (loginError) {
      console.error('⚠️ Auto-login failed, but signup succeeded:', loginError);
      // Still return signup success even if auto-login fails
      return response.data;
    }
  },

  // Login with OTP (Firebase or SMS)
  login: async (data: LoginRequest, isFirebaseAuth = true): Promise<LoginResponse> => {
    // For Firebase auth, send a marker instead of actual OTP
    const loginPayload = {
      ...data,
      otp: isFirebaseAuth ? 'firebase_verified' : data.otp, // Marker for Firebase verification
    };
    
    const response = await api.post('/auth/login', loginPayload);
    
    // Store tokens
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token || '');
      
      // Store user data
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }
    
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Refresh token
  refreshToken: async (): Promise<string> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh-token', {}, {
      headers: {
        'refresh-token': refreshToken,
      },
    });

    const newAccessToken = response.data.data.access_token;
    localStorage.setItem('access_token', newAccessToken);
    
    return newAccessToken;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  // Get stored user
  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

