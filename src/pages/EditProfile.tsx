import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, GraduationCap, Target, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const EditProfile = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [examTarget, setExamTarget] = useState('');
  const [currentClass, setCurrentClass] = useState('');
  const [board, setBoard] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Exam target options
  const examTargetOptions = [
    { value: 'boards', label: 'Boards', emoji: '📚' },
    { value: 'jee', label: 'IIT JEE', emoji: '🎓' },
    { value: 'neet', label: 'NEET', emoji: '🏥' },
  ];

  // Class options
  const classOptions = [
    { value: '6', label: 'Class 6', emoji: '📚' },
    { value: '7', label: 'Class 7', emoji: '📖' },
    { value: '8', label: 'Class 8', emoji: '📗' },
    { value: '9', label: 'Class 9', emoji: '📘' },
    { value: '10', label: 'Class 10', emoji: '📙' },
    { value: '11', label: 'Class 11', emoji: '📕' },
    { value: '12', label: 'Class 12', emoji: '📓' },
    { value: '12+', label: '12+', emoji: '🎓' },
  ];

  // Board options
  const boardOptions = [
    { value: 'cbse', label: 'CBSE', emoji: '🏛️' },
    { value: 'icse', label: 'ICSE', emoji: '📐' },
    { value: 'state_board', label: 'State Board', emoji: '🏫' },
  ];

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const profileData = await authService.getCurrentUser();
        
        if (profileData.user) {
          setFullName(profileData.user.full_name || '');
        }
        
        if (profileData.student) {
          setExamTarget(profileData.student.exam_target || '');
          setCurrentClass(profileData.student.current_class || '');
          setBoard(profileData.student.board || '');
        }
      } catch (error: any) {
        console.error('Failed to load profile:', error);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Update user profile (full name)
      if (fullName && fullName !== user?.full_name) {
        await authService.updateUserProfile({ full_name: fullName });
      }

      // Update student profile (exam target, class, and board) if user is a student
      if (user?.role === 'student') {
        const studentUpdates: any = {};
        if (examTarget) studentUpdates.exam_target = examTarget;
        if (currentClass) studentUpdates.current_class = currentClass;
        if (board) studentUpdates.board = board;
        
        if (Object.keys(studentUpdates).length > 0) {
          await authService.updateStudentProfile(studentUpdates);
        }
      }

      // Refresh user data
      await refreshUser();
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setError(error.response?.data?.detail || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-8">
      <div className="p-4 sm:p-6 max-w-2xl w-full mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Profile</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Profile</h1>
              <p className="text-gray-600 text-sm">Update your account information</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            {/* Full Name Field */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                placeholder="Enter your full name"
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            {/* Student Fields (only if user is a student) */}
            {user?.role === 'student' && (
              <>
                {/* Exam Target Field */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    Exam Target
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {examTargetOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setExamTarget(option.value)}
                        className={`
                          relative p-4 rounded-xl border-2 transition-all duration-300 group
                          ${examTarget === option.value
                            ? 'border-purple-500 bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300">
                            {option.emoji}
                          </span>
                          <span className={`font-bold text-sm ${examTarget === option.value ? 'text-white' : 'text-gray-800'}`}>
                            {option.label}
                          </span>
                        </div>
                        {examTarget === option.value && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                            <span className="text-green-500 text-sm">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Board and Class in Same Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  {/* Board Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="text-base">🏛️</span>
                      Board
                    </label>
                    <select
                      value={board}
                      onChange={(e) => setBoard(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900 bg-white"
                    >
                      <option value="">Select board</option>
                      {boardOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.emoji} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Current Class Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-green-600" />
                      Current Class
                    </label>
                    <select
                      value={currentClass}
                      onChange={(e) => setCurrentClass(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all text-gray-900 bg-white"
                    >
                      <option value="">Select class</option>
                      {classOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.emoji} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;

