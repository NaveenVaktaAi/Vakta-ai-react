import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Target, BookOpen, Brain, TrendingUp, Award, Clock, Users, FileText, Shield, UserCheck, Crown, DollarSign } from 'lucide-react';
import api from '../services/api';
import { aiTutorService } from '../services/aiTutorService';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [examTarget, setExamTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [isNewSignup, setIsNewSignup] = useState(false);

  const loadAdminStats = async () => {
    try {
      setAdminLoading(true);
      const response = await api.get('/admin/dashboard');
      if (response.data) {
        setAdminStats(response.data);
      }
    } catch (err: any) {
      console.error('Error loading admin stats:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  // ✅ Check if this is a new signup
  useEffect(() => {
    const newSignupFlag = localStorage.getItem('isNewSignup');
    if (newSignupFlag === 'true') {
      setIsNewSignup(true);
      // Clear the flag after reading it
      localStorage.removeItem('isNewSignup');
    }
  }, []);

  // ✅ Fetch student exam info on mount
  useEffect(() => {
    const fetchStudentExamInfo = async () => {
      try {
        if (user?.role === 'student') {
          const response = await aiTutorService.getStudentExamInfo();
          if (response.success && response.data) {
            setExamTarget(response.data.exam_target);
            console.log('[Dashboard] Student exam target loaded:', response.data.exam_target);
          }
        }
      } catch (error) {
        console.error('[Dashboard] Failed to load student exam info:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentExamInfo();
    
    // Load admin stats if user is admin
    if (user?.role?.toLowerCase() === 'admin') {
      loadAdminStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ✅ Filter stats based on exam target
  const getFilteredStats = () => {
    const allStats = [
      { label: 'JEE Aspirants', value: '10K+', icon: Target, color: 'bg-blue-500', examTarget: 'jee' },
      { label: 'NEET Aspirants', value: '5K+', icon: Users, color: 'bg-green-500', examTarget: 'neet' },
      { label: 'Study Materials', value: '50K+', icon: BookOpen, color: 'bg-purple-500', examTarget: null },
      { label: 'AI Sessions', value: '1M+', icon: Brain, color: 'bg-orange-500', examTarget: null },
    ];

    if (!examTarget) {
      return allStats; // Show all if no exam target
    }

    // Filter: show only relevant stat + general stats
    return allStats.filter(stat => 
      stat.examTarget === null || stat.examTarget === examTarget.toLowerCase()
    );
  };

  // ✅ Filter features based on exam target
  const getFilteredFeatures = () => {
    const allFeatures = [
      {
        title: 'IIT JEE Preparation',
        description: 'Comprehensive syllabus coverage, practice tests, and AI-powered doubt solving',
        icon: Target,
        color: 'from-blue-500 to-blue-600',
        subjects: ['Physics', 'Chemistry', 'Mathematics'],
        examTarget: 'jee'
      },
      {
        title: 'NEET Preparation',
        description: 'Biology, Physics, Chemistry masterclasses with expert tutors',
        icon: Award,
        color: 'from-green-500 to-green-600',
        subjects: ['Biology', 'Physics', 'Chemistry'],
        examTarget: 'neet'
      },
      {
        title: 'School Level',
        description: 'Class 6-12 preparation for CBSE, ICSE, State Boards',
        icon: GraduationCap,
        color: 'from-purple-500 to-purple-600',
        subjects: ['All Subjects', 'Board Exams', 'Foundation'],
        examTarget: 'boards'
      },
      {
        title: 'DocSathi',
        description: 'AI-powered document intelligence - chat with your documents, generate summaries, notes, and quizzes',
        icon: FileText,
        color: 'from-orange-500 to-orange-600',
        subjects: ['Document Chat', 'Smart Summaries', 'Quiz Generation'],
        examTarget: null // Always show
      },
    ];

    if (!examTarget) {
      return allFeatures; // Show all if no exam target
    }

    const examTargetLower = examTarget.toLowerCase();
    
    // Filter: show only relevant exam preparation + AI-Powered Learning
    return allFeatures.filter(feature => 
      feature.examTarget === null || feature.examTarget === examTargetLower
    );
  };

  const stats = getFilteredStats();
  const features = getFilteredFeatures();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 mt-2 sm:mt-0">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  {isNewSignup ? (
                    <>Welcome, {user?.full_name?.split(' ')[0]}! 🎉</>
                  ) : (
                    <>Welcome back, {user?.full_name?.split(' ')[0]}! 👋</>
                  )}
                </h1>
                <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
                  {isNewSignup 
                    ? "We're excited to have you here! Let's start your learning journey."
                    : "Your personalized learning journey starts here"
                  }
                </p>
              </div>
              <div className="hidden md:block flex-shrink-0 ml-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm p-2">
                  <img 
                    src="/Vakta.png" 
                    alt="Vakta AI" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin User Management Section */}
        {user?.role?.toLowerCase() === 'admin' && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold">Admin Panel</h2>
                    <p className="text-white/90 text-sm sm:text-base">Manage users and subscriptions</p>
                  </div>
                </div>
              </div>

              {adminLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                </div>
              ) : adminStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5" />
                      <span className="text-sm text-white/80">Total Users</span>
                    </div>
                    <p className="text-2xl font-bold">{adminStats.user_stats?.total_users || 0}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5" />
                      <span className="text-sm text-white/80">Premium</span>
                    </div>
                    <p className="text-2xl font-bold">{adminStats.user_stats?.premium_users || 0}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="w-5 h-5" />
                      <span className="text-sm text-white/80">Active</span>
                    </div>
                    <p className="text-2xl font-bold">{adminStats.user_stats?.active_users || 0}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-sm text-white/80">Revenue</span>
                    </div>
                    <p className="text-2xl font-bold">₹{adminStats.subscription_stats?.monthly_revenue?.toLocaleString() || 0}</p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/admin')}
                  className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  Admin Dashboard
                </button>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold hover:bg-white/30 transition-colors border border-white/30 flex items-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  Manage Users
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className={`${stat.color} p-2 sm:p-3 rounded-lg`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-gray-600 text-xs sm:text-sm">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Main Features */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Prepare for Your Dreams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">{feature.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.subjects.map((subject, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (feature.title === 'IIT JEE Preparation') {
                        navigate(`/exam-conversations/${encodeURIComponent('IIT JEE')}`);
                      } else if (feature.title === 'NEET Preparation') {
                        navigate(`/exam-conversations/${encodeURIComponent('NEET')}`);
                      } else if (feature.title === 'DocSathi') {
                        navigate('/docsathi');
                      } else {
                        navigate('/ai-tutor');
                      }
                    }}
                    className="mt-4 w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                  >
                    Start Learning
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Study Materials</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Access 50K+ resources</p>
              </div>
            </div>
            <button className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">
              Browse Library
            </button>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">AI Tutor</h3>
                <p className="text-xs sm:text-sm text-gray-500">Get instant help</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/ai-tutor')}
              className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Chat Now
            </button>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Progress</h3>
                <p className="text-xs sm:text-sm text-gray-500">Track your journey</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/analytics')}
              className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
