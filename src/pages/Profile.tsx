import { LogOut, User, Phone, Mail, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl shadow-lg">
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Manage your account information</p>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Profile Header */}
          <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 px-4 sm:px-8 py-8 sm:py-12 lg:py-16 overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC01LjUyMy00LjQ3Ny0xMC0xMC0xMHMtMTAgNC40NzctMTAgMTAgNC40NzcgMTAgMTAgMTAgMTAtNC40NzcgMTAtMTB6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>
            
            <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 relative z-10">
              <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-white rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white/30">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-white text-center md:text-left flex-1">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3">{user.full_name}</h2>
                <p className="text-blue-100 text-base sm:text-lg lg:text-xl capitalize mb-3 sm:mb-4">{user.role}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                    {user.is_phone_verified ? '✅ Phone Verified' : '⏳ Pending'}
                  </span>
                  <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium capitalize border border-white/30">
                    {user.account_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-4 sm:p-6 lg:p-10">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
              Account Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl sm:rounded-2xl border border-blue-200 hover:shadow-lg transition-all hover:scale-[1.02]">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Full Name</p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{user.full_name}</p>
                </div>
              </div>

              <div className="group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl sm:rounded-2xl border border-green-200 hover:shadow-lg transition-all hover:scale-[1.02]">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Phone Number</p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                    {user.phone_country_code} {user.phone_number}
                  </p>
                </div>
              </div>

              {user.email && (
                <div className="group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl sm:rounded-2xl border border-purple-200 hover:shadow-lg transition-all hover:scale-[1.02]">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
                    <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 break-all">{user.email}</p>
                  </div>
                </div>
              )}

              <div className="group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl sm:rounded-2xl border border-orange-200 hover:shadow-lg transition-all hover:scale-[1.02]">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Role</p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 capitalize">{user.role}</p>
                </div>
              </div>

              <div className="group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl sm:rounded-2xl border border-indigo-200 hover:shadow-lg transition-all hover:scale-[1.02]">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <span className="text-xl sm:text-2xl block">🎓</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Account Status</p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 capitalize">
                    {user.account_status}
                  </p>
                </div>
              </div>

              <div className="group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl sm:rounded-2xl border border-teal-200 hover:shadow-lg transition-all hover:scale-[1.02]">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <span className="text-xl sm:text-2xl block">🔐</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Verification</p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                    {user.is_phone_verified ? '✅ Verified' : '❌ Pending'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 sm:mt-8 lg:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button 
                onClick={() => navigate('/edit-profile')}
                className="flex-1 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-2 border-red-500 text-red-600 rounded-xl hover:bg-red-50 transition-all font-semibold transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

