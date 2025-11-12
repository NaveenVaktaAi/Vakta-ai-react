import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

interface SimpleTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  status: 'processing' | 'completed' | 'failed';
}

const SimpleTrainingModal = ({ 
  isOpen, 
  onClose, 
  documentName, 
  status 
}: SimpleTrainingModalProps) => {
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusRef = useRef<string>('');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const trainingSteps = [
    'Reading your document...',
    'Understanding the content...',
    'Learning key concepts...',
    'Building knowledge base...',
    'Almost done...'
  ];

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Simulate progress when processing
  useEffect(() => {
    // Clear any existing intervals/animations
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (status === 'processing' && isOpen) {
      setProgress(0);
      setCurrentStep(0);
      setShowCompletion(false);
      
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return 95; // Don't reach 100 until completed
          const newProgress = prev + Math.random() * 3;
          
          // Update step based on progress
          const progressPercent = newProgress / 100;
          const nextStep = Math.floor(progressPercent * trainingSteps.length);
          setCurrentStep(Math.min(nextStep, trainingSteps.length - 1));
          
          return newProgress;
        });
      }, 500);

      progressIntervalRef.current = interval;
    } else if (status === 'completed' && isOpen) {
      // Animate progress to 100% ULTRA FAST when completed
      const startProgress = progress;
      const targetProgress = 100;
      const duration = 500; // 500ms - ULTRA FAST
      const startTime = Date.now();
      
      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progressPercent = Math.min(elapsed / duration, 1);
        // Ease-out for smooth finish
        const easeOut = 1 - Math.pow(1 - progressPercent, 3);
        const newProgress = startProgress + (targetProgress - startProgress) * easeOut;
        
        setProgress(newProgress);
        setCurrentStep(trainingSteps.length - 1);
        
        if (progressPercent < 1) {
          animationFrameRef.current = requestAnimationFrame(animateProgress);
        } else {
          setProgress(100);
          // Show completion message after progress reaches 100%
          setTimeout(() => {
            setShowCompletion(true);
          }, 100);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animateProgress);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [status, isOpen]);

  // Watch for status change to 'completed' - MOST IMPORTANT
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    // Clear any existing timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    // If status JUST changed to 'completed' and modal is open
    if (status === 'completed' && isOpen && prevStatus !== 'completed') {
      // Wait for progress animation (500ms) + completion message display (1.2s) = 1.7s total
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 1700); // Close after progress animation + completion message
    }

    // Cleanup
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [status, isOpen, onClose]);

  if (!isOpen) return null;

  // Show progress bar UI if processing OR if completed but progress < 100 OR if completed but not showing completion yet
  const showProgressUI = status === 'processing' || (status === 'completed' && (!showCompletion || progress < 100));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-8 max-w-lg w-full mx-4 border border-gray-200">
        {/* Content */}
        <div className="text-center">
          {showProgressUI ? (
            <>
              {/* Vakta AI Logo with Animation */}
              <div className="relative flex justify-center mb-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-24 h-24 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-4 shadow-lg animate-pulse">
                    <img 
                      src="/Vakta.png" 
                      alt="Vakta AI" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {/* Subtle rotating ring */}
                  <div className="absolute inset-0 border-2 border-blue-200/50 rounded-2xl animate-spin opacity-40" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                AI Training in Progress
              </h2>
              <p className="text-gray-600 mb-6 text-lg">
                Teaching AI about: <span className="font-semibold text-gray-900">{documentName}</span>
              </p>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out shadow-lg"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {Math.round(Math.min(progress, 100))}% Complete
                </p>
              </div>

              {/* Current Step */}
              <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <p className="text-blue-700 font-medium">
                    {status === 'completed' && progress < 100 ? 'Finalizing...' : trainingSteps[currentStep]}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                {status === 'completed' ? 'Almost there...' : 'This may take a few moments...'}
              </p>
            </>
          ) : status === 'completed' && showCompletion ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-50 animate-pulse" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Training Complete!
              </h2>
              <p className="text-gray-600 mb-4 text-lg">
                <span className="font-semibold text-gray-900">{documentName}</span> is ready to use.
              </p>
              <p className="text-sm text-gray-500">
                You can now start chatting with AI about this document.
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-4xl">⚠️</span>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Training Failed
              </h2>
              <p className="text-gray-600 mb-6">
                There was an error processing your document.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SimpleTrainingModal;
