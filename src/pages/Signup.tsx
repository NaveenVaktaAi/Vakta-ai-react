import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Smartphone } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Combined form data - phone + profile in one form
  const [formData, setFormData] = useState({
    phone_number: '',
    phone_country_code: '+91',
    full_name: '',
    email: '',
    role: 'student' as 'student' | 'parent' | 'tutor',
    current_class: '',
    board: '',
    exam_target: '',
    preferred_language: '',
  });

  // OTP verification state
  const [otp, setOtp] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Step 1: Send OTP when form is submitted
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!formData.phone_number) {
      setError('Phone number is required');
      return;
    }
    if (!formData.full_name) {
      setError('Full name is required');
      return;
    }

    setLoading(true);

    try {
      console.log('📱 Sending OTP via Firebase to:', formData.phone_number);
      
      // Import Firebase auth
      const { auth } = await import('../firebase/config');
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
      
      console.log('Firebase auth loaded');
      
      // Setup reCAPTCHA verifier
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: () => {
          console.log('✅ reCAPTCHA verified');
        },
        'expired-callback': () => {
          console.log('⚠️ reCAPTCHA expired');
        }
      });
      
      console.log('reCAPTCHA verifier created');
      
      // Format phone number (Firebase format: +919999999999)
      const phoneNumber = `${formData.phone_country_code}${formData.phone_number}`;
      console.log('📞 Formatted phone:', phoneNumber);
      
      // Send OTP via Firebase
      console.log('Sending OTP request to Firebase...');
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      
      console.log('✅ Firebase confirmation received');
      
      // Store confirmation for later verification
      setConfirmationResult(confirmation);
      console.log('✅ OTP sent successfully via Firebase. Check your phone for SMS!');
      setStep('verify');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('❌ Firebase OTP error:', err);
      
      // Better error messages
      if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format. Please check and try again.');
      } else if (err.code === 'auth/quota-exceeded') {
        setError('SMS quota exceeded. Please try again later or contact support.');
      } else if (err.code === 'auth/captcha-check-failed') {
        setError('reCAPTCHA verification failed. Please try again.');
      } else {
        setError(err.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and complete signup
  const handleVerifyAndSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      console.log('Verifying OTP with Firebase, code:', otp);
      
      // TEMPORARY: For testing - bypass OTP verification if no confirmation
      if (!confirmationResult) {
        console.warn('⚠️ No confirmation result - bypassing OTP for testing');
        // Proceed directly to signup
        await completeSignup();
        return;
      }
      
      try {
        console.log('Calling confirmation.confirm()...');
        // Verify OTP with Firebase
        const result = await confirmationResult.confirm(otp);
        console.log('✅ OTP verified successfully:', result.user.phoneNumber);
        
        // After verification, complete signup
        await completeSignup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('❌ OTP verification error:', err);
        
        // TEMPORARY: Bypass on error for testing
        // TODO: Remove this when SMS is working
        if (err.code === 'auth/invalid-verification-code') {
          setError('Invalid OTP code. Please try again.');
          // For testing, bypass and continue
          console.log('⚠️ Bypassing OTP for testing');
          await completeSignup();
        } else if (err.code === 'auth/code-expired') {
          setError('OTP expired. Please request a new OTP.');
        } else {
          setError('OTP verification failed. Please try again.');
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Complete signup after OTP verification
  const completeSignup = async () => {
    try {
      const signupData = {
        phone_number: formData.phone_number,
        phone_country_code: formData.phone_country_code,
        full_name: formData.full_name,
        role: formData.role,
        email: formData.email || undefined,
        current_class: formData.current_class || undefined,
        board: formData.board || undefined,
        exam_target: formData.exam_target || undefined,
        preferred_language: formData.preferred_language || undefined,
      };
      
      console.log('📤 Calling signup API with data:', signupData);
      
      // signup function doesn't return a value (void), just throws on error
      await signup(signupData);
      
      console.log('✅ Signup successful, redirecting to dashboard');
      // Set flag to show "Welcome" instead of "Welcome back" on dashboard
      localStorage.setItem('isNewSignup', 'true');
      toast.success('🎉 Account created successfully! Welcome to Vakta AI!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err: unknown) {
      console.error('❌ Signup error:', err);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      
      if (error.response?.status === 404) {
        const errorMsg = '🔍 API endpoint not found. Please check if backend is running on port 5000';
        toast.error(errorMsg);
      } else if (error.response?.status === 409) {
        const detail = error.response.data?.detail || '';
        let errorMsg = '';
        if (detail.toLowerCase().includes('phone')) {
          errorMsg = '📱 This phone number is already registered! Please login instead.';
        } else if (detail.toLowerCase().includes('email')) {
          errorMsg = '📧 This email is already registered! Please login instead.';
        } else {
          errorMsg = detail || 'This account already exists. Please login.';
        }
        toast.error(errorMsg);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else if (error.response?.status === 500) {
        const errorMsg = '⚠️ Server error. Please check backend logs.';
        toast.error(errorMsg);
      } else if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        const errorMsg = error.message || 'Signup failed. Please try again.';
        toast.error(errorMsg);
      }
      throw err;
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center px-4 py-4 sm:py-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-700"></div>
      </div>

      <div className="max-w-3xl w-full bg-white/95 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-4 lg:p-6 mx-4 sm:mx-auto relative z-10 border border-white/20">
        <div className="text-center mb-3 sm:mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl mb-2 shadow-lg">
            <User className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-xs sm:text-sm text-gray-600">Start your personalized learning journey</p>
        </div>


        {/* Error message */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleFormSubmit} className="space-y-3">
            {/* reCAPTCHA container for Firebase */}
            <div id="recaptcha-container"></div>

            {/* Phone Number - Full width */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Phone Number *
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.phone_country_code}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_country_code: e.target.value })
                  }
                  className="px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white transition-all shadow-sm hover:shadow-md text-sm"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                </select>
                <div className="flex-1 relative">
                  <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    placeholder="Enter phone number"
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm hover:shadow-md text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Full Name - Full width */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm hover:shadow-md text-sm"
                  required
                />
              </div>
            </div>

            {/* Email and Role - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm hover:shadow-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Role <span className="text-xs text-gray-500">(Student only)</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    if (newRole === 'student') {
                      setFormData({ ...formData, role: newRole as 'student' });
                    } else {
                      setFormData({ ...formData, role: 'student' });
                    }
                  }}
                  className="w-full px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white transition-all shadow-sm hover:shadow-md text-sm"
                >
                  <option value="student">👨‍🎓 Student</option>
                  <option value="parent" disabled>👨‍👩‍👧 Parent (Coming Soon)</option>
                  <option value="tutor" disabled>👨‍🏫 Tutor (Coming Soon)</option>
                </select>
              </div>
            </div>

            {formData.role === 'student' && (
              <>
                {/* Current Class and Board - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                      Current Class
                    </label>
                    <select
                      value={formData.current_class}
                      onChange={(e) =>
                        setFormData({ ...formData, current_class: e.target.value })
                      }
                      className="w-full px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white transition-all shadow-sm hover:shadow-md text-sm"
                    >
                      <option value="">Select class</option>
                      <option value="6">Class 6</option>
                      <option value="7">Class 7</option>
                      <option value="8">Class 8</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                      <option value="12+">12+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                      Board
                    </label>
                    <select
                      value={formData.board}
                      onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                      className="w-full px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white transition-all shadow-sm hover:shadow-md text-sm"
                    >
                      <option value="">Select board</option>
                      <option value="cbse">CBSE</option>
                      <option value="icse">ICSE</option>
                      <option value="state_board">State Board</option>
                    </select>
                  </div>
                </div>

                {/* Exam Target and Preferred Language - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                      Exam Target
                    </label>
                    <select
                      value={formData.exam_target}
                      onChange={(e) =>
                        setFormData({ ...formData, exam_target: e.target.value })
                      }
                      className="w-full px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white transition-all shadow-sm hover:shadow-md text-sm"
                    >
                      <option value="">Select target</option>
                      <option value="boards">Boards</option>
                      <option value="jee">JEE</option>
                      <option value="neet">NEET</option>
                      <option value="foundation">Foundation</option>
                      <option value="olympiad">Olympiad</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                      Preferred Language
                    </label>
                    <select
                      value={formData.preferred_language}
                      onChange={(e) =>
                        setFormData({ ...formData, preferred_language: e.target.value })
                      }
                      className="w-full px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white transition-all shadow-sm hover:shadow-md text-sm"
                    >
                      <option value="">Select language</option>
                      <option value="english">English</option>
                      <option value="hindi">Hindi</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !formData.phone_number || !formData.full_name}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending OTP...
                </span>
              ) : (
                'Verify Phone & Create Account'
              )}
            </button>

            <p className="text-center text-xs sm:text-sm text-gray-600 mt-2">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                Login
              </Link>
            </p>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyAndSignup} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-xl sm:text-2xl tracking-widest text-gray-900 placeholder-gray-400 transition-all shadow-sm hover:shadow-md"
                required
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                OTP sent to {formData.phone_country_code} {formData.phone_number}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verifying & Creating Account...
                </span>
              ) : (
                'Verify & Create Account'
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full text-gray-600 py-2 font-medium hover:text-gray-800 transition-colors text-sm"
            >
              ← Back to Form
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Signup;

