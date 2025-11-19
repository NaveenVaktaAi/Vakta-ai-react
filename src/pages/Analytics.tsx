import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, XCircle, BarChart3, Calendar } from 'lucide-react';
import api from '../services/api';

interface QuizAnalytics {
  total_quizzes: number;
  submitted_quizzes: number;
  average_score: number;
  average_percentage: number;
  total_questions_attempted: number;
  total_correct_answers: number;
  total_wrong_answers: number;
  quizzes_by_level: { [key: string]: number };
  recent_quizzes: Array<{
    quiz_id: string;
    quiz_name: string;
    level: string;
    score: number;
    total_questions: number;
    percentage: number;
    submitted_at: string;
  }>;
  score_distribution: Array<{
    range: string;
    count: number;
  }>;
  improvement_trend: Array<{
    date: string;
    percentage: number;
    score: number;
    total_questions?: number;
    correct_answers?: number;
  }>;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [error, setError] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/docSathi/analytics');
      if (response.data.success && response.data.data) {
        setAnalytics(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load analytics');
      }
    } catch (err: unknown) {
      console.error('Error fetching analytics:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(errorMessage || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-lg p-8 shadow-md max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-lg p-8 shadow-md max-w-md">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Analytics Available</h2>
          <p className="text-gray-600 mb-6">You haven't completed any quizzes yet. Start taking quizzes to see your progress!</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const accuracy = analytics.total_questions_attempted > 0
    ? Math.round((analytics.total_correct_answers / analytics.total_questions_attempted) * 100)
    : 0;

  const maxDistributionCount = analytics.score_distribution && analytics.score_distribution.length > 0
    ? Math.max(...analytics.score_distribution.map(d => d.count || 0), 1)
    : 1;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Quiz Performance</h1>
              <p className="text-gray-600 text-sm">See how you're doing in your quizzes</p>
            </div>
          </div>
        </div>

        {/* Main Stats - Simple Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Average Score</div>
            <div className="text-2xl font-bold text-gray-900">{analytics.average_percentage?.toFixed(0) || 0}%</div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.submitted_quizzes} quiz{analytics.submitted_quizzes !== 1 ? 'es' : ''} completed
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Accuracy</div>
            <div className="text-2xl font-bold text-gray-900">{accuracy}%</div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.total_correct_answers} out of {analytics.total_questions_attempted} correct
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Quizzes</div>
            <div className="text-2xl font-bold text-gray-900">{analytics.submitted_quizzes}</div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.total_quizzes - analytics.submitted_quizzes} pending
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Questions Done</div>
            <div className="text-2xl font-bold text-gray-900">{analytics.total_questions_attempted}</div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.total_wrong_answers} incorrect
            </div>
          </div>
        </div>

        {/* Score Distribution - Simple */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Score Ranges
          </h2>
          <div className="space-y-3">
            {analytics.score_distribution && analytics.score_distribution.length > 0 ? analytics.score_distribution.map((item, index) => {
              const percentage = maxDistributionCount > 0 ? (item.count / maxDistributionCount) * 100 : 0;
              const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{item.range}</span>
                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`${colors[index]} h-2.5 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-500 text-center py-4 text-sm">No data available</p>
            )}
          </div>
        </div>

        {/* Improvement Trend - Line Chart for Many Quizzes */}
        {analytics.improvement_trend && analytics.improvement_trend.length > 0 && (
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Progress Over Time (Last 30 Days)
            </h2>
            
            {analytics.improvement_trend.length > 6 ? (
              // Line chart for many quizzes (10+)
              <div className="relative">
                <div className="h-64 relative" onMouseLeave={() => setHoveredPoint(null)}>
                  <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                    {/* Y-axis grid lines */}
                    <line x1="0" y1="40" x2="800" y2="40" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="0" y1="100" x2="800" y2="100" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="0" y1="160" x2="800" y2="160" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
                    
                    {/* Line chart */}
                    <polyline
                      points={analytics.improvement_trend.map((item, index) => {
                        const x = (index / (analytics.improvement_trend.length - 1)) * 800;
                        const y = 200 - ((item.percentage / 100) * 160) - 20;
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Data points with hover popups */}
                    {analytics.improvement_trend.map((item, index) => {
                      const x = (index / (analytics.improvement_trend.length - 1)) * 800;
                      const y = 200 - ((item.percentage / 100) * 160) - 20;
                      let pointColor = '#ef4444'; // red
                      if (item.percentage >= 80) pointColor = '#22c55e'; // green
                      else if (item.percentage >= 60) pointColor = '#3b82f6'; // blue
                      else if (item.percentage >= 40) pointColor = '#eab308'; // yellow
                      
                      return (
                        <g key={index}>
                          <circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill={pointColor}
                            stroke="white"
                            strokeWidth="2"
                            className="cursor-pointer transition-all hover:r-8"
                            onMouseEnter={(e) => {
                              const svg = e.currentTarget.ownerSVGElement;
                              if (svg) {
                                const rect = svg.getBoundingClientRect();
                                const svgX = (x / 800) * rect.width;
                                const svgY = (y / 200) * rect.height;
                                setHoveredPoint({ index, x: svgX, y: svgY });
                              }
                            }}
                          />
                        </g>
                      );
                    })}
                  </svg>
                  
                  {/* Popup overlay - positioned absolutely */}
                  {hoveredPoint && (() => {
                    const item = analytics.improvement_trend[hoveredPoint.index];
                    const totalQuestions = item.total_questions || (item.percentage > 0 ? Math.round((item.score / item.percentage) * 100) : 0);
                    const correctAnswers = item.correct_answers || item.score || 0;
                    const wrongAnswers = totalQuestions - correctAnswers;
                    const formattedDate = new Date(item.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    });
                    
                    return (
                      <div
                        className="absolute bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-56 z-30"
                        style={{
                          left: `${hoveredPoint.x}px`,
                          top: `${hoveredPoint.y}px`,
                          transform: 'translate(-50%, calc(-100% - 12px))'
                        }}
                      >
                        <div className="text-xs space-y-1.5">
                          <div className="font-semibold text-gray-900 border-b border-gray-200 pb-1.5 mb-1.5">
                            Quiz Details
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Date:</span>
                            <span className="font-medium text-gray-900">{formattedDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Score:</span>
                            <span className="font-medium text-gray-900">{item.percentage.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Questions:</span>
                            <span className="font-medium text-gray-900">{totalQuestions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Correct:</span>
                            <span className="font-medium text-green-600">{correctAnswers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Wrong:</span>
                            <span className="font-medium text-red-600">{wrongAnswers}</span>
                          </div>
                        </div>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-200"></div>
                      </div>
                    );
                  })()}
                  
                  {/* X-axis labels - show only some dates to avoid crowding */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                    {analytics.improvement_trend.length > 0 && (
                      <>
                        <span className="text-xs text-gray-500">
                          {new Date(analytics.improvement_trend[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {analytics.improvement_trend.length > 1 && (
                          <span className="text-xs text-gray-500">
                            {new Date(analytics.improvement_trend[Math.floor(analytics.improvement_trend.length / 2)].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(analytics.improvement_trend[analytics.improvement_trend.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Y-axis labels */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">0%</span>
                  <span className="text-xs text-gray-500">50%</span>
                  <span className="text-xs text-gray-500">100%</span>
                </div>
                
                {/* Info */}
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500">
                    Showing {analytics.improvement_trend.length} quiz{analytics.improvement_trend.length !== 1 ? 'es' : ''} from last 30 days
                  </p>
                </div>
              </div>
            ) : (
              // Bar chart for fewer quizzes (< 10)
              <div>
                <div className="h-48 flex items-end justify-between gap-1 px-2">
                  {analytics.improvement_trend.map((item, index) => {
                    const maxPercentage = Math.max(...analytics.improvement_trend.map(t => t.percentage), 100);
                    const height = maxPercentage > 0 ? (item.percentage / maxPercentage) * 100 : 0;
                    // Simple color based on percentage - consistent colors
                    let barColor = 'bg-blue-500';
                    if (item.percentage >= 80) barColor = 'bg-green-500';
                    else if (item.percentage >= 60) barColor = 'bg-blue-500';
                    else if (item.percentage >= 40) barColor = 'bg-yellow-500';
                    else barColor = 'bg-red-500';
                    
                    const totalQuestions = item.total_questions || (item.percentage > 0 ? Math.round((item.score / item.percentage) * 100) : 0);
                    const correctAnswers = item.correct_answers || item.score || 0;
                    const wrongAnswers = totalQuestions - correctAnswers;
                    const formattedDate = new Date(item.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    });
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center group relative" style={{ minWidth: '30px' }}>
                        <div className="w-full flex flex-col items-center justify-end h-full">
                          <div
                            className={`w-full ${barColor} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                            style={{ 
                              height: `${Math.max(height, item.percentage > 0 ? 5 : 0)}%`,
                              minHeight: item.percentage > 0 ? '8px' : '0px'
                            }}
                          ></div>
                          {/* Detailed Popup */}
                          <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 w-56 p-3">
                            <div className="text-xs space-y-1.5">
                              <div className="font-semibold text-gray-900 border-b border-gray-200 pb-1.5 mb-1.5">
                                Quiz Details
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Date:</span>
                                <span className="font-medium text-gray-900">{formattedDate}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Score:</span>
                                <span className="font-medium text-gray-900">{item.percentage.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total Questions:</span>
                                <span className="font-medium text-gray-900">{totalQuestions}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Correct:</span>
                                <span className="font-medium text-green-600">{correctAnswers}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Wrong:</span>
                                <span className="font-medium text-red-600">{wrongAnswers}</span>
                              </div>
                            </div>
                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-200"></div>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-500 text-center w-full" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">0%</span>
                  <span className="text-xs text-gray-500">50%</span>
                  <span className="text-xs text-gray-500">100%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Quizzes - Simple Table */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Recent Quiz Results
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Quiz Name</th>
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Level</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Score</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Percentage</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recent_quizzes && analytics.recent_quizzes.length > 0 ? analytics.recent_quizzes.map((quiz) => {
                  const percentageColor = getPercentageColor(quiz.percentage);
                  return (
                    <tr key={quiz.quiz_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 text-sm font-medium text-gray-900">{quiz.quiz_name}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getLevelColor(quiz.level)}`}>
                          {quiz.level.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-sm font-semibold text-gray-900">
                        {quiz.score}/{quiz.total_questions}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-sm font-bold ${percentageColor.split(' ')[0]}`}>
                          {quiz.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-gray-600">
                        {new Date(quiz.submitted_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                      No recent quiz results
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
