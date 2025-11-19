import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Bookmark, List, Play, X, Plus, Eye, Download, Loader2 } from 'lucide-react';
import { documentService } from '../services/documentService';
import { toast } from 'react-toastify';
import QuizGenerationModal from './QuizGenerationModal';
import TokenLimitModal from './TokenLimitModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [summary, setSummary] = useState<string | null>(null);
  const [aiNotes, setAiNotes] = useState<{ title: string; notes: string[] } | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [isDownloadingSummary, setIsDownloadingSummary] = useState(false);
  const [isDownloadingNotes, setIsDownloadingNotes] = useState(false);
  const [tokenLimitData, setTokenLimitData] = useState<any>(null);
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false);

  // Load document data and existing quizzes when component mounts
  useEffect(() => {
    loadDocumentData();
    loadExistingQuizzes();
  }, [documentId]);

  const loadDocumentData = async () => {
    setLoadingDocument(true);
    try {
      const response = await documentService.getDocumentText(documentId);
      if (response.success && response.data) {
        // Check if summary exists
        if (response.data.summary) {
          setSummary(response.data.summary);
        }
        // Check if ai_notes exists
        if (response.data.ai_notes) {
          setAiNotes(response.data.ai_notes);
        }
      }
    } catch (error) {
      console.error('Error loading document data:', error);
    } finally {
      setLoadingDocument(false);
    }
  };

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

  const handleViewSummary = () => {
    setShowSummaryModal(true);
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setGenerationType('summary');
    
    try {
      toast.info('Generating summary for document...');
      const response = await documentService.generateSummary(documentId);
      
      if (response.success && response.data) {
        toast.success('Summary generated successfully!');
        // Reload document data to get updated summary
        await loadDocumentData();
        // Show summary modal
        setShowSummaryModal(true);
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

  const handleViewNotes = () => {
    setShowNotesModal(true);
  };

  const handleGenerateNotes = async () => {
    setIsGenerating(true);
    setGenerationType('notes');
    
    try {
      const response = await documentService.generateNotes(documentId);
      
      if (response.success && response.data) {
        // Update local state with new notes
        if (response.data.notes && response.data.title) {
          setAiNotes({
            title: response.data.title,
            notes: response.data.notes
          });
        }
        // Reload document data to get updated ai_notes
        await loadDocumentData();
        // Show notes modal
        setShowNotesModal(true);
      } else {
        throw new Error(response.message || 'Failed to generate notes');
      }
    } catch (error: any) {
      console.error('Error generating notes:', error);
      
      // ✅ Check if it's a token limit error (403 with specific structure)
      if (error.response?.status === 403 && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (detail.upgradeRequired && detail.service === 'docSathi') {
          // Show popup modal instead of toast
          setTokenLimitData({
            message: detail.message || 'Your free trial credits are running low.',
            tokensRemaining: detail.tokensRemaining,
            service: detail.service || 'docSathi',
            upgradeRequired: detail.upgradeRequired
          });
          setShowTokenLimitModal(true);
        } else {
          toast.error(error.message || 'Failed to generate notes');
        }
      } else {
        toast.error(error.message || 'Failed to generate notes');
      }
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

  const handleDownloadSummaryPDF = async () => {
    if (!summary) return;
    
    setIsDownloadingSummary(true);
    try {
      // Create a temporary div to render the content for PDF generation
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '40px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.style.color = '#333';
      
      // Create HTML structure with header and content
      const fullHtml = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; margin: -40px -40px 30px -40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Document Summary</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">DocSathi - AI-Powered Document Intelligence</p>
        </div>
        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <div style="margin: 8px 0; color: #64748b;"><span style="font-weight: bold; color: #1e40af;">Document:</span> ${documentTitle}</div>
          <div style="margin: 8px 0; color: #64748b;"><span style="font-weight: bold; color: #1e40af;">Generated:</span> ${new Date().toLocaleString()}</div>
        </div>
        <div style="font-size: 14px; line-height: 1.8;">
          <p style="margin-bottom: 15px; text-align: justify; white-space: pre-wrap;">${summary.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Generated by DocSathi AI • ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      `;
      
      tempDiv.innerHTML = fullHtml;
      document.body.appendChild(tempDiv);

      // Convert to canvas then to PDF with optimized settings
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: tempDiv.scrollHeight,
        logging: false,
        imageTimeout: 0,
        removeContainer: true
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      // Generate filename
      const filename = `Summary_${documentTitle.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
      
      // Download PDF directly
      pdf.save(filename);

      // Clean up
      document.body.removeChild(tempDiv);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloadingSummary(false);
    }
  };

  const handleDownloadNotesPDF = async () => {
    if (!aiNotes) return;
    
    setIsDownloadingNotes(true);
    try {
      // Create a temporary div to render the content for PDF generation
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '40px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.style.color = '#333';
      
      // Create notes HTML
      const notesHtml = aiNotes.notes.map((note, index) => `
        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
          <p style="margin: 0; color: #333; text-align: justify;">${note.replace(/\n/g, '<br>')}</p>
        </div>
      `).join('');
      
      // Create HTML structure with header and content
      const fullHtml = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; margin: -40px -40px 30px -40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${aiNotes.title || 'Document Notes'}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">DocSathi - AI-Powered Document Intelligence</p>
        </div>
        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <div style="margin: 8px 0; color: #64748b;"><span style="font-weight: bold; color: #1e40af;">Document:</span> ${documentTitle}</div>
          <div style="margin: 8px 0; color: #64748b;"><span style="font-weight: bold; color: #1e40af;">Total Notes:</span> ${aiNotes.notes.length}</div>
          <div style="margin: 8px 0; color: #64748b;"><span style="font-weight: bold; color: #1e40af;">Generated:</span> ${new Date().toLocaleString()}</div>
        </div>
        <div style="font-size: 14px; line-height: 1.8;">
          ${notesHtml}
        </div>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Generated by DocSathi AI • ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      `;
      
      tempDiv.innerHTML = fullHtml;
      document.body.appendChild(tempDiv);

      // Convert to canvas then to PDF with optimized settings
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: tempDiv.scrollHeight,
        logging: false,
        imageTimeout: 0,
        removeContainer: true
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      // Generate filename
      const filename = `Notes_${documentTitle.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
      
      // Download PDF directly
      pdf.save(filename);

      // Clean up
      document.body.removeChild(tempDiv);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloadingNotes(false);
    }
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
          {/* Summary Button - Show View if exists, Generate otherwise */}
          {summary ? (
            <button
              onClick={handleViewSummary}
              className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 border border-blue-200 rounded-lg transition-all"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">View Summary</span>
            </button>
          ) : (
            <button
              onClick={handleGenerateSummary}
              disabled={isGenerating || loadingDocument}
              className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 border border-blue-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating && generationType === 'summary' ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PieChart className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Generate Summary</span>
            </button>
          )}
          
          {/* Notes Button - Show View if exists, Generate otherwise */}
          {aiNotes ? (
            <button
              onClick={handleViewNotes}
              className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-700 border border-green-200 rounded-lg transition-all"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">View Notes</span>
            </button>
          ) : (
            <button
              onClick={handleGenerateNotes}
              disabled={isGenerating || loadingDocument}
              className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-700 border border-green-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating && generationType === 'notes' ? (
                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Generate Notes</span>
            </button>
          )}
          
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

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Document Summary</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSummaryPDF}
                  disabled={isDownloadingSummary || !summary}
                  className="px-3 py-1.5 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm"
                >
                  {isDownloadingSummary ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download PDF
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && aiNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{aiNotes.title || 'Document Notes'}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadNotesPDF}
                  disabled={isDownloadingNotes || !aiNotes}
                  className="px-3 py-1.5 bg-white border-2 border-green-600 text-green-600 rounded-lg font-semibold hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm"
                >
                  {isDownloadingNotes ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download PDF
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-3">
                {aiNotes.notes.map((note, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-700 text-sm">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Token Limit Modal */}
      {tokenLimitData && (
        <TokenLimitModal
          isOpen={showTokenLimitModal}
          onClose={() => {
            setShowTokenLimitModal(false);
            setTokenLimitData(null);
          }}
          data={tokenLimitData}
        />
      )}
    </div>
  );
};

export default QuickActionsOverlay;

