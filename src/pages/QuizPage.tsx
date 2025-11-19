import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, Trophy, Clock, Flag } from 'lucide-react';
import { documentService } from '../services/documentService';
import { toast } from 'react-toastify';

interface QuizQuestion {
  question_id: string;
  question_type: string;
  question_text: string;
  options: string[];
  correct_answer?: string;
  student_answer?: string | null;
  AI_explanation?: string;
}

interface QuizData {
  quiz_id: string;
  quiz_name: string;
  level: string;
  no_of_questions: number;
  is_submitted: boolean;
  created_at: string;
  updated_at: string;
  questions: QuizQuestion[];
}

interface QuizResult {
  quiz_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  not_answered?: number;
  percentage: number;
  submitted_at: string;
  questions: QuizQuestion[];
}

const QuizPage = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const hasShownToastRef = useRef(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documentId, setDocumentId] = useState<string | null>(null);

  useEffect(() => {
    // Get documentId from localStorage or query params
    const savedDocumentId = localStorage.getItem('currentDocumentId');
    if (savedDocumentId) {
      setDocumentId(savedDocumentId);
    }
    
    if (quizId && savedDocumentId) {
      loadQuiz(quizId, savedDocumentId);
    }
  }, [quizId]);

  const loadQuiz = async (quizId: string, documentId: string) => {
    try {
      const response = await documentService.getDocumentQuizzes(documentId);
      if (response.success && response.data) {
        const quiz = response.data.find((q: any) => q.quiz_id === quizId);
        if (quiz) {
          setQuizData(quiz);
          setIsSubmitted(quiz.is_submitted);
          setIsReviewMode(quiz.is_submitted);
          
          // If quiz is submitted, load results
          if (quiz.is_submitted) {
            setQuizResult({
              quiz_id: quiz.quiz_id,
              score: quiz.questions.filter((q: QuizQuestion) => q.student_answer === q.correct_answer).length,
              total_questions: quiz.questions.length,
              correct_answers: quiz.questions.filter((q: QuizQuestion) => q.student_answer === q.correct_answer).length,
              wrong_answers: quiz.questions.filter((q: QuizQuestion) => q.student_answer && q.student_answer !== q.correct_answer).length,
              not_answered: quiz.questions.filter((q: QuizQuestion) => !q.student_answer).length,
              percentage: Math.round((quiz.questions.filter((q: QuizQuestion) => q.student_answer === q.correct_answer).length / quiz.questions.length) * 100),
              submitted_at: quiz.updated_at,
              questions: quiz.questions
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string, optionIndex?: number) => {
    if (isReviewMode) return; // Don't allow changes in review mode
    
    const question = quizData?.questions.find(q => q.question_id === questionId);
    let selectedAnswer = answer;
    
    // For MCQ questions: convert to letter (A, B, C, D)
    // For True/False questions: keep as "True" or "False"
    if (question && question.question_type === 'mcq') {
      if (optionIndex !== undefined) {
        // Convert index to letter: 0 -> A, 1 -> B, 2 -> C, 3 -> D
        selectedAnswer = String.fromCharCode(65 + optionIndex); // 65 is 'A' in ASCII
      } else {
        // If answer is the full text, find its index in options
        if (question.options) {
          const index = question.options.indexOf(answer);
          if (index !== -1) {
            selectedAnswer = String.fromCharCode(65 + index); // Convert to A, B, C, D
          }
        }
      }
    } else if (question && question.question_type === 'true_false') {
      // For true/false, keep the answer as "True" or "False"
      selectedAnswer = answer; // Already "True" or "False"
    }
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: selectedAnswer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < (quizData?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quizData || !quizId || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const answerArray: any[] = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
        question_id: questionId,
        selected_answer: selectedAnswer
      }));

      const response = await documentService.submitQuiz(quizId, answerArray);
      if (response.success && response.data) {
        const result = response.data;
        
        // Update quiz data with submitted answers and results
        setQuizData(prev => {
          if (prev) {
            return {
              ...prev,
              is_submitted: true,
              questions: result.questions.map((q: QuizQuestion) => ({
                ...q,
                student_answer: q.student_answer,
                correct_answer: q.correct_answer,
                AI_explanation: q.AI_explanation
              }))
            };
          }
          return prev;
        });
        
        // Update local answers state with submitted answers
        const submittedAnswers: { [key: string]: string } = {};
        result.questions.forEach((q: QuizQuestion) => {
          if (q.student_answer) {
            submittedAnswers[q.question_id] = q.student_answer;
          }
        });
        setAnswers(submittedAnswers);
        
        // Calculate counts from actual questions data
        const actualCorrectAnswers = result.questions.filter((q: QuizQuestion) => q.student_answer && q.student_answer === q.correct_answer).length;
        const actualWrongAnswers = result.questions.filter((q: QuizQuestion) => q.student_answer && q.student_answer !== q.correct_answer).length;
        const actualNotAnswered = result.questions.filter((q: QuizQuestion) => !q.student_answer).length;
        
        // Update quizResult with actual counts
        const updatedQuizResult = {
          ...result,
          correct_answers: actualCorrectAnswers,
          wrong_answers: actualWrongAnswers,
          not_answered: actualNotAnswered,
          score: actualCorrectAnswers,
          percentage: Math.round((actualCorrectAnswers / result.total_questions) * 100)
        };
        
        setQuizResult(updatedQuizResult);
        setIsSubmitted(true);
        setIsReviewMode(true);
        
        // Prevent duplicate toast in React Strict Mode
        if (!hasShownToastRef.current) {
          toast.success(`Quiz Submitted! Score: ${actualCorrectAnswers}/${result.total_questions} (${Math.round((actualCorrectAnswers / result.total_questions) * 100)}%)`);
          hasShownToastRef.current = true;
        }
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (documentId) {
      navigate(`/docsathi/chat/${documentId}`);
    } else {
      navigate('/docsathi');
    }
  };

  const getQuestionStatus = (index: number) => {
    if (!quizData) return 'unanswered';
    const question = quizData.questions[index];
    
    if (isReviewMode || isSubmitted) {
      if (question.student_answer && question.student_answer === question.correct_answer) return 'correct';
      if (question.student_answer && question.student_answer !== question.correct_answer) return 'incorrect';
      return 'unanswered';
    }
    
    return answers[question.question_id] ? 'answered' : 'unanswered';
  };

  const getOptionStyle = (question: QuizQuestion, option: string, optionIndex: number) => {
    // For MCQ: use letter (A, B, C, D), for True/False: use option text directly
    const comparisonValue = question.question_type === 'mcq' 
      ? String.fromCharCode(65 + optionIndex) // A, B, C, D
      : option; // "True" or "False"
    
    if (!isReviewMode && !isSubmitted) {
      return answers[question.question_id] === comparisonValue 
        ? "border-blue-500 bg-blue-50 text-blue-900" 
        : "border-gray-200 hover:border-gray-300 text-gray-900";
    }

    // Review mode styles - compare using appropriate format
    const isCorrect = comparisonValue === question.correct_answer;
    const isStudentAnswer = comparisonValue === question.student_answer;
    
    if (isCorrect && isStudentAnswer) {
      return "border-green-500 bg-green-50 text-green-900";
    } else if (isCorrect && (!question.student_answer || !isStudentAnswer)) {
      return "border-green-500 bg-green-100 text-green-900";
    } else if (isStudentAnswer && !isCorrect) {
      return "border-red-500 bg-red-50 text-red-900";
    } else {
      return "border-gray-200 bg-gray-50 text-gray-900";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
          <p className="text-gray-600 mb-4">The quiz you're looking for doesn't exist.</p>
          <button onClick={handleBack} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 mx-auto">
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button 
                onClick={handleBack} 
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center gap-2 text-gray-900 font-medium"
              >
                <ArrowLeft className="w-4 h-4 text-gray-700" />
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {quizData.quiz_name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`capitalize px-3 py-1 rounded-full text-sm ${
                    quizData.level === 'easy' ? 'bg-green-50 text-green-700 border border-green-200' :
                    quizData.level === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                    'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {quizData.level}
                  </span>
                  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    {quizData.no_of_questions} questions
                  </span>
                </div>
              </div>
            </div>
            
            {isSubmitted && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsReviewMode(!isReviewMode)}
                  className={`px-4 py-2 border rounded-lg transition-all duration-200 flex items-center gap-2 font-medium ${
                    isReviewMode 
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent shadow-lg" 
                      : "border-gray-300 hover:bg-blue-50 hover:border-blue-300 text-gray-900"
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  {isReviewMode ? 'Hide Results' : 'Show Results'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Navigation */}
          <div className="lg:col-span-1">
            <div className="p-6 bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-lg">
              <h3 className="font-bold text-gray-800 mb-6 text-center">Questions</h3>
              <div className="grid grid-cols-5 gap-3">
                {quizData.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all duration-300 hover:scale-110 ${
                      index === currentQuestionIndex
                        ? 'border-blue-500 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg ring-4 ring-blue-200'
                        : getQuestionStatus(index) === 'answered' || getQuestionStatus(index) === 'correct'
                        ? 'border-green-500 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md hover:shadow-lg'
                        : getQuestionStatus(index) === 'incorrect'
                        ? 'border-red-500 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md hover:shadow-lg'
                        : getQuestionStatus(index) === 'unanswered' && (isReviewMode || isSubmitted)
                        ? 'border-gray-400 bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-md hover:shadow-lg'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              
              {isReviewMode && quizResult && (
                <div className="mt-6 pt-6 border-t border-gray-200/50">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      {quizResult.percentage}%
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Final Score</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 space-y-3 border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 font-medium">Correct:</span>
                      <span className="font-bold text-green-600 text-xl bg-green-100 px-3 py-1 rounded-full">
                        {quizResult.correct_answers}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 font-medium">Wrong:</span>
                      <span className="font-bold text-red-600 text-xl bg-red-100 px-3 py-1 rounded-full">
                        {quizResult.wrong_answers}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 font-medium">Not Answered:</span>
                      <span className="font-bold text-gray-600 text-xl bg-gray-100 px-3 py-1 rounded-full">
                        {quizResult.not_answered || (quizResult.total_questions - quizResult.correct_answers - quizResult.wrong_answers)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 font-medium">Total:</span>
                      <span className="font-bold text-gray-800 text-xl bg-gray-100 px-3 py-1 rounded-full">
                        {quizResult.total_questions}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <div className="p-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-lg">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">
                      {currentQuestionIndex + 1}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm font-medium">
                      Question {currentQuestionIndex + 1} of {quizData.questions.length}
                    </span>
                  </div>
                </div>
                
                {(isReviewMode || isSubmitted) && (
                  <div className="flex items-center gap-2">
                    {currentQuestion.student_answer === currentQuestion.correct_answer ? (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Correct
                      </span>
                    ) : currentQuestion.student_answer && currentQuestion.student_answer !== currentQuestion.correct_answer ? (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <X className="w-3 h-3" />
                        Incorrect
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Not Answered
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Question Text */}
              <h2 className="text-xl font-bold text-gray-900 mb-8 leading-relaxed">
                {currentQuestion.question_text}
              </h2>

              {/* Options */}
              <div className="space-y-4 mb-8">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(currentQuestion.question_id, option, index)}
                    disabled={isReviewMode || isSubmitted}
                    className={`w-full p-5 text-left border-2 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                      getOptionStyle(currentQuestion, option, index)
                    } ${(isReviewMode || isSubmitted) ? 'cursor-default' : 'cursor-pointer shadow-sm hover:shadow-md'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {currentQuestion.question_type === 'mcq' && (
                          <span className="font-bold text-blue-600 w-6 h-6 flex items-center justify-center bg-blue-50 rounded-full text-sm">
                            {String.fromCharCode(65 + index)}
                          </span>
                        )}
                        <span className="font-medium text-gray-900">{option}</span>
                      </div>
                      {(isReviewMode || isSubmitted) && (
                        <div className="flex items-center gap-2">
                          {(currentQuestion.question_type === 'mcq' 
                            ? String.fromCharCode(65 + index) 
                            : option) === currentQuestion.correct_answer && (
                            <span className="text-green-600 text-sm font-medium">✓ Correct Answer</span>
                          )}
                          {(currentQuestion.question_type === 'mcq' 
                            ? String.fromCharCode(65 + index) 
                            : option) === currentQuestion.student_answer && 
                           (currentQuestion.question_type === 'mcq' 
                            ? String.fromCharCode(65 + index) 
                            : option) !== currentQuestion.correct_answer && (
                            <span className="text-red-600 text-sm font-medium">✗ Your Answer</span>
                          )}
                          {(currentQuestion.question_type === 'mcq' 
                            ? String.fromCharCode(65 + index) 
                            : option) === currentQuestion.student_answer && 
                           (currentQuestion.question_type === 'mcq' 
                            ? String.fromCharCode(65 + index) 
                            : option) === currentQuestion.correct_answer && (
                            <span className="text-green-600 text-sm font-medium">✓ Your Answer</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Explanation (Review Mode) */}
              {(isReviewMode || isSubmitted) && currentQuestion.AI_explanation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">Explanation</h4>
                  <p className="text-blue-800 text-sm">{currentQuestion.AI_explanation}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {!isSubmitted && (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || Object.keys(answers).length === 0}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Flag className="w-4 h-4" />
                          Submit Quiz
                        </>
                      )}
                    </button>
                  )}
                  
                  {currentQuestionIndex < quizData.questions.length - 1 && (
                    <button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;

