import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, DollarSign, TrendingUp, UserCheck, UserX, 
  Crown, Calendar, ArrowUpRight, ArrowDownRight,
  Activity, CreditCard, FileText, ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
  user_stats: {
    total_users: number;
    free_users: number;
    premium_users: number;
    active_users: number;
    inactive_users: number;
    new_users_today: number;
    new_users_this_week: number;
    new_users_this_month: number;
  };
  subscription_stats: {
    total_subscriptions: number;
    active_subscriptions: number;
    expired_subscriptions: number;
    free_trial_count: number;
    basic_plan_count: number;
    premium_plan_count: number;
    total_revenue: number;
    monthly_revenue: number;
  };
  recent_users: any[];
  recent_payments: any[];
}

// Admin Dashboard Component
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is admin
    if (user && user.role?.toLowerCase() !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/dashboard');
      if (response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.response?.data?.detail || 'Failed to load dashboard');
      if (err.response?.status === 403) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    change, 
    changeType = 'neutral',
    subtitle 
  }: {
    title: string;
    value: string | number;
    icon: any;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    subtitle?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm ${
            changeType === 'positive' ? 'text-green-600' : 
            changeType === 'negative' ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            {changeType === 'positive' ? <ArrowUpRight className="w-4 h-4" /> : 
             changeType === 'negative' ? <ArrowDownRight className="w-4 h-4" /> : null}
            <span>{change}</span>
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of your platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats.user_stats.total_users}
            icon={Users}
            change={`+${stats.user_stats.new_users_today} today`}
            changeType="positive"
          />
          <StatCard
            title="Premium Users"
            value={stats.user_stats.premium_users}
            icon={Crown}
            subtitle={`${stats.user_stats.free_users} free users`}
          />
          <StatCard
            title="Active Users"
            value={stats.user_stats.active_users}
            icon={UserCheck}
            subtitle={`${stats.user_stats.inactive_users} inactive`}
          />
          <StatCard
            title="Monthly Revenue"
            value={`₹${stats.subscription_stats.monthly_revenue.toLocaleString()}`}
            icon={DollarSign}
            subtitle={`₹${stats.subscription_stats.total_revenue.toLocaleString()} total`}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="New Users (Week)"
            value={stats.user_stats.new_users_this_week}
            icon={TrendingUp}
          />
          <StatCard
            title="New Users (Month)"
            value={stats.user_stats.new_users_this_month}
            icon={Calendar}
          />
          <StatCard
            title="Active Subscriptions"
            value={stats.subscription_stats.active_subscriptions}
            icon={Activity}
          />
          <StatCard
            title="Total Subscriptions"
            value={stats.subscription_stats.total_subscriptions}
            icon={CreditCard}
            subtitle={`${stats.subscription_stats.expired_subscriptions} expired`}
          />
        </div>

        {/* Plan Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Free Trial</span>
                </div>
                <span className="font-semibold">{stats.subscription_stats.free_trial_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Basic Plan</span>
                </div>
                <span className="font-semibold">{stats.subscription_stats.basic_plan_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700">Premium Plan</span>
                </div>
                <span className="font-semibold">{stats.subscription_stats.premium_plan_count}</span>
              </div>
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
              <button
                onClick={() => navigate('/admin/users')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {stats.recent_users.slice(0, 5).map((user: any) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-sm text-gray-600">{user.email || user.phone_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString()}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Plan</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_payments.slice(0, 10).map((payment: any) => (
                  <tr key={payment._id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-900">{payment.user_id?.slice(0, 8)}...</td>
                    <td className="py-3 px-4 text-sm text-gray-700 capitalize">{payment.plan_id}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">₹{payment.amount}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        payment.status === 'success' ? 'bg-green-100 text-green-700' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Users className="w-5 h-5" />
            Manage Users
          </button>
          <button
            onClick={loadDashboard}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

