import { useAuth } from '../context/AuthContext';
import { GraduationCap, Target, BookOpen, Brain, TrendingUp, Award, Clock, Users } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'JEE Aspirants', value: '10K+', icon: Target, color: 'bg-blue-500' },
    { label: 'NEET Aspirants', value: '5K+', icon: Users, color: 'bg-green-500' },
    { label: 'Study Materials', value: '50K+', icon: BookOpen, color: 'bg-purple-500' },
    { label: 'AI Sessions', value: '1M+', icon: Brain, color: 'bg-orange-500' },
  ];

  const features = [
    {
      title: 'IIT JEE Preparation',
      description: 'Comprehensive syllabus coverage, practice tests, and AI-powered doubt solving',
      icon: Target,
      color: 'from-blue-500 to-blue-600',
      subjects: ['Physics', 'Chemistry', 'Mathematics']
    },
    {
      title: 'NEET Preparation',
      description: 'Biology, Physics, Chemistry masterclasses with expert tutors',
      icon: Award,
      color: 'from-green-500 to-green-600',
      subjects: ['Biology', 'Physics', 'Chemistry']
    },
    {
      title: 'School Level',
      description: 'Class 6-12 preparation for CBSE, ICSE, State Boards',
      icon: GraduationCap,
      color: 'from-purple-500 to-purple-600',
      subjects: ['All Subjects', 'Board Exams', 'Foundation']
    },
    {
      title: 'AI-Powered Learning',
      description: 'Personalized study plans, instant doubt solving, and progress tracking',
      icon: Brain,
      color: 'from-orange-500 to-orange-600',
      subjects: ['24/7 Tutor', 'Smart Practice', 'Analytics']
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-4 lg:pt-0">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  Welcome back, {user?.full_name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
                  Your personalized learning journey starts here
                </p>
              </div>
              <div className="hidden md:block flex-shrink-0 ml-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Brain className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

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
                  <button className="mt-4 w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
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
            <button className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">
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
            <button className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
