import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Phone, Calendar, Crown, 
  Activity, CreditCard, BookOpen, Edit, Save, X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface UserDetail {
  user_id: string;
  full_name: string;
  email?: string;
  phone_number: string;
  phone_country_code: string;
  role: string;
  account_status: string;
  is_active: boolean;
  is_premium: boolean;
  created_at: string;
  last_login_at?: string;
  last_active_at?: string;
  subscription?: {
    plan_id: string;
    plan_name: string;
    status: string;
    start_date: string;
    end_date?: string;
    tokens_used: number;
    token_limit: number;
  };
  token_usage: {
    docSathiTokensUsed: number;
    aiTutorTokensUsed: number;
    docSathiTokenLimit: number;
    aiTutorTokenLimit: number;
  };
  student_profile?: {
    current_class: string;
    board: string;
    exam_target: string;
    preferred_language: string;
  };
}

const AdminUserDetail = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user } = useAuth();
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [accountStatus, setAccountStatus] = useState('');

  useEffect(() => {
    if (user && user.role?.toLowerCase() !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (userId) {
      loadUserDetail();
    }
  }, [user, navigate, userId]);

  const loadUserDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/${userId}`);
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setUserDetail(data);
        setIsActive(data.is_active);
        setAccountStatus(data.account_status);
      }
    } catch (err: any) {
      console.error('Error loading user detail:', err);
      if (err.response?.status === 403) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/admin/users/${userId}/status`, {
        is_active: isActive,
        account_status: accountStatus
      });
      setEditing(false);
      loadUserDetail();
    } catch (err: any) {
      console.error('Error updating user:', err);
      alert('Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">User not found</p>
          <button
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Users
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{userDetail.full_name}</h1>
              <p className="text-gray-600">User ID: {userDetail.user_id}</p>
            </div>
            {editing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setIsActive(userDetail.is_active);
                    setAccountStatus(userDetail.account_status);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Full Name</label>
                  <p className="text-gray-900 font-medium">{userDetail.full_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-gray-900">{userDetail.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  <p className="text-gray-900">{userDetail.phone_country_code}{userDetail.phone_number}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Role</label>
                  <p className="text-gray-900 capitalize">{userDetail.role}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined
                  </label>
                  <p className="text-gray-900">{new Date(userDetail.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Last Login</label>
                  <p className="text-gray-900">
                    {userDetail.last_login_at 
                      ? new Date(userDetail.last_login_at).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Status
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Account Status</label>
                  {editing ? (
                    <select
                      value={accountStatus}
                      onChange={(e) => setAccountStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="expired">Expired</option>
                    </select>
                  ) : (
                    <span className={`px-3 py-1 rounded text-sm capitalize ${
                      userDetail.account_status === 'active' ? 'bg-green-100 text-green-700' :
                      userDetail.account_status === 'suspended' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {userDetail.account_status}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Active Status</label>
                  {editing ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span>User is active</span>
                    </label>
                  ) : (
                    <span className={`px-3 py-1 rounded text-sm ${
                      userDetail.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {userDetail.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Student Profile */}
            {userDetail.student_profile && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Student Profile
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Class</label>
                    <p className="text-gray-900 capitalize">Class {userDetail.student_profile.current_class}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Board</label>
                    <p className="text-gray-900 capitalize">{userDetail.student_profile.board}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Exam Target</label>
                    <p className="text-gray-900 capitalize">{userDetail.student_profile.exam_target}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Language</label>
                    <p className="text-gray-900 capitalize">{userDetail.student_profile.preferred_language}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Subscription */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Subscription
              </h2>
              {userDetail.subscription ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Plan</label>
                    <p className="text-gray-900 font-medium capitalize">{userDetail.subscription.plan_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Status</label>
                    <span className={`px-2 py-1 rounded text-xs ${
                      userDetail.subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {userDetail.subscription.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Start Date</label>
                    <p className="text-gray-900">{new Date(userDetail.subscription.start_date).toLocaleDateString()}</p>
                  </div>
                  {userDetail.subscription.end_date && (
                    <div>
                      <label className="text-sm text-gray-600">End Date</label>
                      <p className="text-gray-900">{new Date(userDetail.subscription.end_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">No active subscription</p>
              )}
            </div>

            {/* Token Usage */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Token Usage
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">DocSathi</span>
                    <span className="text-sm text-gray-900">
                      {userDetail.token_usage.docSathiTokensUsed} / {userDetail.token_usage.docSathiTokenLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(userDetail.token_usage.docSathiTokensUsed / userDetail.token_usage.docSathiTokenLimit) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">AI Tutor</span>
                    <span className="text-sm text-gray-900">
                      {userDetail.token_usage.aiTutorTokensUsed} / {userDetail.token_usage.aiTutorTokenLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${(userDetail.token_usage.aiTutorTokensUsed / userDetail.token_usage.aiTutorTokenLimit) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
                {userDetail.subscription && (
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Subscription Tokens</span>
                      <span className="text-sm text-gray-900">
                        {userDetail.subscription.tokens_used} / {userDetail.subscription.token_limit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(userDetail.subscription.tokens_used / userDetail.subscription.token_limit) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetail;

