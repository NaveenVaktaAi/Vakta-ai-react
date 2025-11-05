export interface User {
  _id: string;
  phone_number: string;
  phone_country_code: string;
  full_name: string;
  role: 'student' | 'parent' | 'tutor' | 'admin';
  account_status: 'trial' | 'active' | 'suspended' | 'expired';
  is_active: boolean;
  is_phone_verified: boolean;
  email?: string;
  is_email_verified?: boolean;
  created_at: string;
  last_login_at?: string;
  last_active_at?: string;
}

export interface Student {
  _id: string;
  user_id: string;
  current_class: string;
  board: string;
  exam_target: string;
  preferred_language: string;
  state?: string;
  city?: string;
  created_at: string;
  updated_at: string;
}

export interface SignupRequest {
  phone_number: string;
  phone_country_code: string;
  full_name: string;
  role: 'student' | 'parent' | 'tutor';
  email?: string;
  current_class?: string;
  board?: string;
  exam_target?: string;
  preferred_language?: string;
  state?: string;
  city?: string;
  date_of_birth?: string;
}

export interface LoginRequest {
  phone_number: string;
  phone_country_code: string;
  otp: string;
}

export interface SendOTPRequest {
  phone_number: string;
  phone_country_code: string;
}

export interface OTPVerificationRequest {
  phone_number: string;
  phone_country_code: string;
  otp: string;
}

export interface SignupResponse {
  success: boolean;
  message: string;
  data?: {
    user_id: string;
    student_id?: string;
  };
  user?: User;
  verification_email_sent: boolean;
  // Auto-login fields (optional, added after signup)
  access_token?: string;
  refresh_token?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user_id: string;
    expires_in: number;
  };
  access_token?: string;
  refresh_token?: string;
  user?: User;
}

export interface OTPResponse {
  success: boolean;
  message: string;
  data: {
    expires_in: number;
  };
  otp_sent: boolean;
  expires_in: number;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signup: (data: SignupRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  sendOTP: (data: SendOTPRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
}

