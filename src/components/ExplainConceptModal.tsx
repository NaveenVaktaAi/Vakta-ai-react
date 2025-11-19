import React, { useState } from 'react';
import { X, Lightbulb, BookOpen, Loader2, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExplainConceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  explanation: string;
  subject?: string;
  topic?: string;
  isLoading?: boolean;
  title?: string;
  icon?: string;
}

export const ExplainConceptModal: React.FC<ExplainConceptModalProps> = ({
  isOpen,
  onClose,
  explanation,
  subject,
  topic,
  isLoading = false,
  title = "Concept Explanation",
  icon = "💡"
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!explanation) return;
    
    setIsDownloading(true);
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
      
      // Convert markdown to HTML using simple regex-based conversion
      let htmlContent = explanation;
      
      // Convert markdown headers
      htmlContent = htmlContent.replace(/^### (.*$)/gim, '<h3 style="color: #1e40af; margin-top: 25px; margin-bottom: 15px;">$1</h3>');
      htmlContent = htmlContent.replace(/^## (.*$)/gim, '<h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-top: 25px; margin-bottom: 15px;">$1</h2>');
      htmlContent = htmlContent.replace(/^# (.*$)/gim, '<h1 style="color: #1e40af; margin-top: 30px; margin-bottom: 20px;">$1</h1>');
      
      // Convert bold and italic
      htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e40af; font-weight: bold;">$1</strong>');
      htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      // Convert code blocks
      htmlContent = htmlContent.replace(/```([\s\S]*?)```/g, '<pre style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; overflow-x: auto; margin: 20px 0;"><code style="font-family: \'Courier New\', monospace; font-size: 0.9em; color: #7c3aed;">$1</code></pre>');
      htmlContent = htmlContent.replace(/`(.*?)`/g, '<code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: \'Courier New\', monospace; font-size: 0.9em; color: #7c3aed;">$1</code>');
      
      // Convert blockquotes
      htmlContent = htmlContent.replace(/^> (.*$)/gim, '<blockquote style="border-left: 4px solid #3b82f6; padding-left: 20px; margin: 20px 0; font-style: italic; color: #64748b;">$1</blockquote>');
      
      // Convert lists
      htmlContent = htmlContent.replace(/^\- (.*$)/gim, '<li style="margin-bottom: 8px;">$1</li>');
      htmlContent = htmlContent.replace(/^(\d+)\. (.*$)/gim, '<li style="margin-bottom: 8px;">$2</li>');
      
      // Wrap consecutive list items in ul tags
      htmlContent = htmlContent.replace(/(<li style="margin-bottom: 8px;">.*<\/li>\n?)+/g, (match) => {
        return '<ul style="margin: 15px 0; padding-left: 30px;">' + match + '</ul>';
      });
      
      // Convert line breaks to paragraphs
      const lines = htmlContent.split('\n');
      const paragraphs: string[] = [];
      let currentParagraph = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          if (currentParagraph) {
            paragraphs.push(`<p style="margin-bottom: 15px; text-align: justify;">${currentParagraph}</p>`);
            currentParagraph = '';
          }
        } else if (trimmed.startsWith('<')) {
          // Already HTML tag, add as is
          if (currentParagraph) {
            paragraphs.push(`<p style="margin-bottom: 15px; text-align: justify;">${currentParagraph}</p>`);
            currentParagraph = '';
          }
          paragraphs.push(trimmed);
        } else {
          currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
        }
      }
      if (currentParagraph) {
        paragraphs.push(`<p style="margin-bottom: 15px; text-align: justify;">${currentParagraph}</p>`);
      }
      
      htmlContent = paragraphs.join('\n');
      htmlContent = htmlContent.replace(/<p style="margin-bottom: 15px; text-align: justify;"><\/p>/g, '');

      // Create HTML structure with header and metadata
      const fullHtml = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; margin: -40px -40px 30px -40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${title}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI Tutor - Generated Content</p>
        </div>
        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          ${subject ? `<div style="margin: 8px 0; color: #64748b;"><span style="font-weight: bold; color: #1e40af;">Subject:</span> ${subject}</div>` : ''}
          ${topic ? `<div style="margin: 8px 0; color: #64748b;"><span style="font-weight: bold; color: #1e40af;">Topic:</span> ${topic}</div>` : ''}
          <div style="margin: 8px 0; color: #64748b;"><span style="font-weight: bold; color: #1e40af;">Generated:</span> ${new Date().toLocaleString()}</div>
        </div>
        <div style="font-size: 14px; line-height: 1.8;">
          ${htmlContent}
        </div>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Generated by AI Tutor • ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      `;
      
      tempDiv.innerHTML = fullHtml;
      document.body.appendChild(tempDiv);

      // Convert to canvas then to PDF with optimized settings for smaller file size
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5, // Reduced from 2 to 1.5 for smaller file size (still good quality)
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
      // Use JPEG with compression instead of PNG for much smaller file size
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // 85% quality JPEG (good balance)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // Enable PDF compression
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST'); // FAST compression
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      // Generate filename
      const filename = `${title.replace(/\s+/g, '_')}_${subject || 'AI_Tutor'}_${topic || 'Content'}_${new Date().getTime()}.pdf`;
      
      // Download PDF directly
      pdf.save(filename);

      // Clean up
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              {icon ? (
                <span className="text-2xl">{icon}</span>
              ) : (
                <Lightbulb className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              {(subject || topic) && (
                <p className="text-sm text-blue-100 mt-1">
                  {subject && <span className="font-semibold">{subject}</span>}
                  {subject && topic && <span> • </span>}
                  {topic && <span>{topic}</span>}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Generating content...</p>
              <p className="text-sm text-gray-500 mt-2">Searching the web and analyzing information</p>
            </div>
          ) : explanation ? (
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({node, ...props}) => (
                    <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-3 border-b-2 border-blue-200 pb-2" {...props} />
                  ),
                  h3: ({node, ...props}) => (
                    <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2" {...props} />
                  ),
                  p: ({node, ...props}) => (
                    <p className="text-gray-700 leading-relaxed mb-4" {...props} />
                  ),
                  ul: ({node, ...props}) => (
                    <ul className="list-disc list-inside space-y-2 mb-4 ml-4" {...props} />
                  ),
                  ol: ({node, ...props}) => (
                    <ol className="list-decimal list-inside space-y-2 mb-4 ml-4" {...props} />
                  ),
                  li: ({node, ...props}) => (
                    <li className="text-gray-700" {...props} />
                  ),
                  strong: ({node, ...props}) => (
                    <strong className="font-bold text-blue-700" {...props} />
                  ),
                  code: ({node, ...props}) => (
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-purple-700" {...props} />
                  ),
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-600 my-4" {...props} />
                  ),
                }}
              >
                {explanation}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No explanation available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-between items-center">
          <button
            onClick={handleDownloadPDF}
            disabled={isLoading || !explanation || isDownloading}
            className="px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isDownloading ? (
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
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

