import React, { useState } from 'react';
import { X, Lightbulb, BookOpen, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end">
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

