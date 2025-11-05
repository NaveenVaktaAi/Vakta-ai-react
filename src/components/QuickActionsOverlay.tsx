import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Bookmark, List, Play, X, Plus, Eye } from 'lucide-react';
import { documentService } from '../services/documentService';
import { toast } from 'react-toastify';
import QuizGenerationModal from './QuizGenerationModal';

interface ExistingQuiz {
  quiz_id: string;
  quiz_name: string;
  level: string;
  no_of_questions: number;
  is_submitted: boolean;
  created_at?: string;
}

interface QuickActionsOverlayProps {
  documentId: string;
  documentTitle?: string;
  userId: string;
  onClose: () => void;
}

const QuickActionsOverlay = ({ documentId, documentTitle = 'Document', userId, onClose }: QuickActionsOverlayProps) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'summary' | 'notes' | 'quiz' | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);
  const [existingQuizzes, setExistingQuizzes] = useState<ExistingQuiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // Load existing quizzes when component mounts
  useEffect(() => {
    loadExistingQuizzes();
  }, [documentId]);

  const loadExistingQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const response = await documentService.getDocumentQuizzes(documentId);
      if (response.success && response.data) {
        setExistingQuizzes(response.data);
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error('Failed to load existing quizzes');
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setGenerationType('summary');
    
    try {
      toast.info('Generating summary for document...');
      const response = await documentService.generateSummary(documentId);
      
      if (response.success && response.data) {
        toast.success('Summary generated successfully!');
        // TODO: Show summary in a modal or download as PDF
        console.log('Summary data:', response.data);
      } else {
        throw new Error(response.message || 'Failed to generate summary');
      }
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast.error(error.message || 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  const handleGenerateNotes = async () => {
    setIsGenerating(true);
    setGenerationType('notes');
    
    try {
      toast.info('Generating notes for document...');
      const response = await documentService.generateNotes(documentId);
      
      if (response.success && response.data) {
        toast.success('Notes generated successfully!');
        // TODO: Show notes in a modal or download as PDF
        console.log('Notes data:', response.data);
      } else {
        throw new Error(response.message || 'Failed to generate notes');
      }
    } catch (error: any) {
      console.error('Error generating notes:', error);
      toast.error(error.message || 'Failed to generate notes');
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  const handleGenerateQuiz = () => {
    setShowQuizModal(true);
  };

  const handleQuizGenerated = (quizData: any) => {
    console.log('Quiz generated:', quizData);
    toast.success('Quiz generated successfully!');
    // Reload quizzes to show the new one
    loadExistingQuizzes();
  };

  const handleStartQuiz = (quizId: string) => {
    // Save documentId to localStorage for quiz page
    if (documentId) {
      localStorage.setItem('currentDocumentId', documentId);
    }
    // Navigate to quiz page
    navigate(`/quiz/${quizId}`);
    onClose();
  };

  const handleViewAllQuizzes = () => {
    setShowAllQuizzes(true);
  };

  const handleBackFromQuizzes = () => {
    setShowAllQuizzes(false);
  };

  const handleQuizClick = (quizId: string) => {
    // Save documentId to localStorage for quiz page
    if (documentId) {
      localStorage.setItem('currentDocumentId', documentId);
    }
    // Navigate to quiz page
    navigate(`/quiz/${quizId}`);
    onClose();
  };

  return (
    <div className="absolute top-4 right-4 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Quick Actions</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={handleGenerateSummary}
            disabled={isGenerating}
            className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 border border-blue-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating && generationType === 'summary' ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <PieChart className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Generate Summary</span>
          </button>
          
          <button
            onClick={handleGenerateNotes}
            disabled={isGenerating}
            className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-700 border border-green-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating && generationType === 'notes' ? (
              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Generate Notes</span>
          </button>
          
          {/* Show View All Quizzes if quizzes exist, otherwise show Generate Quiz */}
          {existingQuizzes.length > 0 ? (
            <div className="flex gap-2">
              <button
                onClick={handleViewAllQuizzes}
                className="flex-1 flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg transition-all"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">View All Quizzes ({existingQuizzes.length})</span>
              </button>
              <button
                onClick={handleGenerateQuiz}
                className="p-3 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-lg transition-all"
                title="Generate New Quiz"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateQuiz}
              disabled={isGenerating}
              className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-700 border border-purple-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">Generate Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* Quiz Generation Modal */}
      <QuizGenerationModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        documentId={documentId}
        documentTitle={documentTitle}
        userId={userId}
        onQuizGenerated={handleQuizGenerated}
        onStartQuiz={handleStartQuiz}
      />

      {/* View All Quizzes Modal */}
      {showAllQuizzes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">All Quizzes</h3>
              <button
                onClick={handleBackFromQuizzes}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            {/* Quiz List */}
            <div className="p-4 overflow-y-auto flex-1">
              {loadingQuizzes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-500">Loading...</span>
                </div>
              ) : existingQuizzes.length > 0 ? (
                <div className="space-y-2">
                  {existingQuizzes.map((quiz) => (
                    <div
                      key={quiz.quiz_id}
                      onClick={() => handleQuizClick(quiz.quiz_id)}
                      className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {quiz.quiz_name || 'Untitled Quiz'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              quiz.level === 'easy' ? 'bg-green-100 text-green-700' :
                              quiz.level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {quiz.level}
                            </span>
                            <span className="text-xs text-gray-500">
                              {quiz.no_of_questions} questions
                            </span>
                            {quiz.is_submitted && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                        <Play className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <List className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No quizzes found</p>
                  <p className="text-xs text-gray-400">Generate your first quiz</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActionsOverlay;

