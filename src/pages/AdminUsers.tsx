import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, Filter, Crown, UserCheck, UserX,
  Eye, Edit, ChevronLeft, ChevronRight, X, ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface User {
  _id: string;
  full_name: string;
  email?: string;
  phone_number: string;
  phone_country_code: string;
  role: string;
  account_status: string;
  is_active: boolean;
  is_premium?: boolean;
  plan_id?: string;
  created_at: string;
  last_login_at?: string;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'premium' | 'active' | 'inactive'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    if (user && user.role?.toLowerCase() !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadUsers();
  }, [user, navigate, page, filter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users', {
        params: {
          page,
          limit: 20,
          filter,
          search: search || undefined
        }
      });
      if (response.data?.success && response.data?.data) {
        setUsers(response.data.data.users || []);
        setTotal(response.data.data.total || 0);
        setTotalPages(response.data.data.total_pages || 1);
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      if (err.response?.status === 403) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== '') {
        loadUsers();
      } else {
        loadUsers();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    setPage(1);
    setShowFilterMenu(false);
  };

  const handleUserClick = (userId: string) => {
    navigate(`/admin/users/${userId}`);
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600">Manage all platform users</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-5 h-5" />
                <span className="capitalize">{filter === 'all' ? 'All Users' : filter}</span>
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 rounded-t-lg ${
                      filter === 'all' ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    All Users
                  </button>
                  <button
                    onClick={() => handleFilterChange('free')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                      filter === 'free' ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    Free Users
                  </button>
                  <button
                    onClick={() => handleFilterChange('premium')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                      filter === 'premium' ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    Premium Users
                  </button>
                  <button
                    onClick={() => handleFilterChange('active')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                      filter === 'active' ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    Active Users
                  </button>
                  <button
                    onClick={() => handleFilterChange('inactive')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-lg ${
                      filter === 'inactive' ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    Inactive Users
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">User</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Contact</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Role</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Plan</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Joined</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr 
                    key={user._id} 
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleUserClick(user._id)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-500">ID: {user._id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-900">{user.email || 'No email'}</p>
                      <p className="text-sm text-gray-500">{user.phone_country_code}{user.phone_number}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-700 capitalize">{user.role}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-xs px-2 py-1 rounded ${
                        user.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {(() => {
                        const planId = user.plan_id || (user.is_premium ? 'premium' : 'free');
                        const planName = planId === 'premium' ? 'Premium' : 
                                        planId === 'basic' ? 'Basic' : 
                                        planId === 'free_trial' ? 'Free Trial' : 'Free';
                        
                        if (planId === 'premium' || planId === 'basic') {
                          return (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-medium">
                              <Crown className="w-3 h-3" />
                              {planName}
                            </span>
                          );
                        } else if (planId === 'free_trial') {
                          return (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                              {planName}
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 font-medium">
                              {planName}
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-700">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserClick(user._id);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;

