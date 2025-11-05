import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { documentService } from '../services/documentService';
import { toast } from 'react-toastify';

interface QuizGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  userId: string;
  onQuizGenerated?: (quizData: any) => void;
  onStartQuiz?: (quizId: string) => void;
}

const QuizGenerationModal = ({ 
  isOpen, 
  onClose, 
  documentId, 
  documentTitle, 
  userId,
  onQuizGenerated,
  onStartQuiz
}: QuizGenerationModalProps) => {
  const [quizName, setQuizName] = useState('');
  const [quizLevel, setQuizLevel] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);

  // Auto-close modal after 3 seconds when quiz is generated
  useEffect(() => {
    if (generatedQuiz && isOpen) {
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [generatedQuiz, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quizName.trim()) {
      return;
    }

    setIsGenerating(true);
    
    try {
      const request = {
        quiz_name: quizName,
        document_id: documentId,
        user_id: userId,
        level: quizLevel,
        number_of_questions: numberOfQuestions
      };

      toast.info('Generating quiz...');
      const response = await documentService.generateQuiz(request);

      if (response.success && response.data) {
        setGeneratedQuiz(response.data);
        setIsGenerated(true);
        onQuizGenerated?.(response.data);
        toast.success('Quiz generated successfully!');
      } else {
        throw new Error(response.message || 'Failed to generate quiz');
      }
    } catch (error: any) {
      console.error('Quiz generation error:', error);
      toast.error(error.message || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartQuiz = () => {
    console.log('Starting quiz:', generatedQuiz);
    onClose();
  };

  const handleAddMoreQuiz = () => {
    // Reset form for new quiz
    setQuizName('');
    setQuizLevel('medium');
    setNumberOfQuestions(10);
    setIsGenerated(false);
    setGeneratedQuiz(null);
  };

  const handleClose = () => {
    if (!isGenerating) {
      setQuizName('');
      setQuizLevel('medium');
      setNumberOfQuestions(10);
      setIsGenerated(false);
      setGeneratedQuiz(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Generate Quiz</h2>
                <p className="text-white/80 text-sm">
                  Create an interactive quiz from "{documentTitle}"
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="text-white hover:bg-white/20 rounded-lg p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isGenerated ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Quiz Name */}
              <div className="space-y-2">
                <label htmlFor="quizName" className="text-sm font-medium text-gray-700">
                  Quiz Name *
                </label>
                <input
                  id="quizName"
                  type="text"
                  value={quizName}
                  onChange={(e) => setQuizName(e.target.value)}
                  placeholder="Enter quiz name (e.g., 'AI Concepts Quiz')"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isGenerating}
                />
              </div>

              {/* Quiz Level */}
              <div className="space-y-2">
                <label htmlFor="quizLevel" className="text-sm font-medium text-gray-700">
                  Difficulty Level
                </label>
                <select
                  id="quizLevel"
                  value={quizLevel}
                  onChange={(e) => setQuizLevel(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  disabled={isGenerating}
                >
                  <option value="easy" className="text-gray-900">Easy - Basic concepts</option>
                  <option value="medium" className="text-gray-900">Medium - Intermediate level</option>
                  <option value="hard" className="text-gray-900">Hard - Advanced concepts</option>
                </select>
              </div>

              {/* Number of Questions */}
              <div className="space-y-2">
                <label htmlFor="numberOfQuestions" className="text-sm font-medium text-gray-700">
                  Number of Questions
                </label>
                <select
                  id="numberOfQuestions"
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  disabled={isGenerating}
                >
                  <option value="5" className="text-gray-900">5 Questions</option>
                  <option value="10" className="text-gray-900">10 Questions</option>
                  <option value="15" className="text-gray-900">15 Questions</option>
                  <option value="20" className="text-gray-900">20 Questions</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isGenerating || !quizName.trim()}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating Quiz...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Quiz</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Quiz Generated Success */
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Quiz Generated Successfully!</h3>
                <p className="text-gray-600">"{quizName}" is ready</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 space-y-3 border border-blue-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">Quiz Name:</span>
                  <span className="text-sm font-semibold text-gray-900">{quizName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">Questions:</span>
                  <span className="text-sm font-semibold text-blue-600">{numberOfQuestions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">Difficulty:</span>
                  <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                    quizLevel === 'easy' ? 'bg-green-100 text-green-700' :
                    quizLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {quizLevel}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">Source:</span>
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-48">{documentTitle}</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Quiz will appear in the existing quizzes list below
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizGenerationModal;

