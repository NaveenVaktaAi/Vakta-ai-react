import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import DocSathi from './pages/DocSathi';
import DocSathiChat from './pages/DocSathiChat';
import AiTutor from './pages/AiTutor';
import ExamConversations from './pages/ExamConversations';
import Settings from './pages/Settings';
import QuizPage from './pages/QuizPage';
import Analytics from './pages/Analytics';
import Pricing from './pages/Pricing';
import Notes from './pages/Notes';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Main App Component
function App() {
  return (
    <AuthProvider>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected routes with layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <EditProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/docsathi"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocSathi />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/docsathi/chat/:documentId"
            element={
              <ProtectedRoute>
                <DocSathiChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:quizId"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-tutor"
            element={
              <ProtectedRoute>
                <Layout>
                  <AiTutor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam-conversations/:examType"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExamConversations />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <ProtectedRoute>
                <Layout>
                  <Pricing />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <Layout>
                  <Notes />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:userId"
            element={
              <ProtectedRoute>
                <AdminUserDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
  );
}

export default App;

