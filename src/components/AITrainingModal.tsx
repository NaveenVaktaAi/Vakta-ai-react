import { useEffect, useState, useRef } from 'react';
import { X, Brain, Zap, CheckCircle, Sparkles, FileText, Database, Network, Cpu } from 'lucide-react';

interface AITrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  status: 'processing' | 'completed' | 'failed';
  onStatusUpdate?: (status: 'processing' | 'completed' | 'failed') => void;
}

const AITrainingModal = ({ 
  isOpen, 
  onClose, 
  documentName, 
  status,
  onStatusUpdate 
}: AITrainingModalProps) => {
  const [trainingStep, setTrainingStep] = useState(0);
  const [dataChunks, setDataChunks] = useState<Array<{ id: number; x: number; y: number; delay: number; size: number }>>([]);
  const [progress, setProgress] = useState(0);
  const hasClosedRef = useRef(false);

  const trainingSteps = [
    { icon: FileText, text: 'Analyzing document structure...', color: 'blue' },
    { icon: FileText, text: 'Extracting text content...', color: 'purple' },
    { icon: Database, text: 'Creating meaningful chunks...', color: 'pink' },
    { icon: Cpu, text: 'Generating embeddings...', color: 'cyan' },
    { icon: Database, text: 'Storing in vector database...', color: 'blue' },
    { icon: Network, text: 'Building knowledge graph...', color: 'purple' },
    { icon: CheckCircle, text: 'Finalizing training...', color: 'green' }
  ];

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      hasClosedRef.current = false; // Reset when modal opens
      console.log('[AITrainingModal] 🔓 Modal opened, reset hasClosedRef');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset hasClosedRef when status changes back to processing (in case of retry)
  useEffect(() => {
    if (status === 'processing') {
      hasClosedRef.current = false;
      console.log('[AITrainingModal] 🔄 Status is processing, reset hasClosedRef');
    }
  }, [status]);

  // Auto-close modal when training completes - SIMPLIFIED
  useEffect(() => {
    console.log('[AITrainingModal] 🔍 Status check:', { status, isOpen, hasClosed: hasClosedRef.current });
    
    // If status is completed and modal is open, close it
    if (status === 'completed' && isOpen) {
      console.log('[AITrainingModal] ✅ Status is COMPLETED - closing modal immediately');
      hasClosedRef.current = true;
      
      // Close immediately after a short delay to show success message
      const timer = setTimeout(() => {
        console.log('[AITrainingModal] 🚪 Calling onClose()');
        onClose();
      }, 2000);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [status, isOpen, onClose]);

  // Generate random data chunks flowing to brain
  useEffect(() => {
    if (isOpen && status === 'processing') {
      const chunks: Array<{ id: number; x: number; y: number; delay: number; size: number }> = [];
      for (let i = 0; i < 30; i++) {
        chunks.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: Math.random() * 3,
          size: 4 + Math.random() * 4
        });
      }
      setDataChunks(chunks);
    }
  }, [isOpen, status]);

  // Debug: Log status changes
  useEffect(() => {
    console.log('[AITrainingModal] Modal status:', { status, isOpen, documentName });
  }, [status, isOpen, documentName]);

  // Reset training step and progress when status changes
  useEffect(() => {
    console.log('[AITrainingModal] Status effect triggered:', status);
    if (status === 'processing') {
      setTrainingStep(0);
      setProgress(0);
    } else if (status === 'completed') {
      setTrainingStep(trainingSteps.length - 1);
      setProgress(100);
    }
  }, [status, trainingSteps.length]);

  // Simulate training steps and progress
  useEffect(() => {
    if (isOpen && status === 'processing') {
      const totalSteps = trainingSteps.length;
      const stepDuration = 2000; // 2 seconds per step
      
      const interval = setInterval(() => {
        setTrainingStep(prev => {
          const nextStep = prev + 1;
          if (nextStep < totalSteps) {
            setProgress((nextStep / totalSteps) * 100);
            return nextStep;
          }
          return prev;
        });
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [isOpen, status]);

  if (!isOpen) return null;

  const currentStepData = trainingSteps[trainingStep];
  const IconComponent = currentStepData?.icon || Brain;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse" />
        
        {/* Animated particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12">
        {/* Close Button - Only show when completed or failed */}
        {(status === 'completed' || status === 'failed') && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-3 hover:bg-white/10 rounded-full transition-all group"
          >
            <X className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" />
          </button>
        )}

        {/* Central Content */}
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* Document Name */}
          <div className="mb-8">
            <p className="text-white/60 text-sm sm:text-base mb-2">Training Document</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white truncate px-4">
              {documentName}
            </h1>
          </div>

          {/* Brain Visualization Area */}
          <div className="relative mb-12 h-64 sm:h-80 lg:h-96">
            {/* Central Brain Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {status === 'processing' ? (
                <div className="relative">
                  {/* Pulsing Brain */}
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48">
                    <Brain className="w-full h-full text-blue-400 animate-pulse-slow" />
                    <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-3xl animate-pulse-slow" />
                  </div>

                  {/* Rotating Rings */}
                  <div className="absolute inset-0 -m-8 sm:-m-12 lg:-m-16">
                    <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full animate-spin-slow" />
                    <div className="absolute inset-0 border-2 border-purple-500/30 rounded-full animate-spin-reverse" />
                  </div>

                  {/* Current Step Icon */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-2xl animate-bounce-slow">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              ) : status === 'completed' ? (
                <div className="relative">
                  <div className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl animate-scale-in">
                    <CheckCircle className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-green-500/30 rounded-full blur-3xl -z-10 animate-pulse" />
                </div>
              ) : (
                <div className="relative">
                  <div className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center shadow-2xl animate-scale-in">
                    <X className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-red-500/30 rounded-full blur-3xl -z-10 animate-pulse" />
                </div>
              )}
            </div>

            {/* Data Chunks Flowing */}
            {status === 'processing' && dataChunks.map((chunk) => (
              <div
                key={chunk.id}
                className="absolute rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-float-to-center shadow-lg"
                style={{
                  width: `${chunk.size}px`,
                  height: `${chunk.size}px`,
                  left: `${chunk.x}%`,
                  top: `${chunk.y}%`,
                  animationDelay: `${chunk.delay}s`,
                  animationDuration: '4s'
                }}
              >
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-50" />
              </div>
            ))}

            {/* Sparkles */}
            {status === 'processing' && (
              <>
                {[...Array(15)].map((_, i) => (
                  <Sparkles
                    key={i}
                    className="absolute text-yellow-400 animate-sparkle"
                    style={{
                      width: `${8 + Math.random() * 8}px`,
                      height: `${8 + Math.random() * 8}px`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1.5 + Math.random()}s`
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Progress Bar */}
          {status === 'processing' && (
            <div className="mb-12">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out shadow-lg"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-white/70 text-sm sm:text-base">
                {Math.round(progress)}% Complete
              </p>
            </div>
          )}

          {/* Training Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
            {trainingSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < trainingStep;
              const isCurrent = index === trainingStep && status === 'processing';
              
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-500/20 border-2 border-green-500/50 shadow-lg shadow-green-500/20'
                      : isCurrent
                      ? 'bg-blue-500/20 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20 animate-pulse'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    isCompleted
                      ? 'bg-green-500'
                      : isCurrent
                      ? 'bg-blue-500'
                      : 'bg-white/10'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <StepIcon className={`w-5 h-5 ${
                        isCurrent ? 'text-white' : 'text-white/50'
                      }`} />
                    )}
                  </div>
                  <span className={`text-sm sm:text-base flex-1 text-left ${
                    isCompleted
                      ? 'text-green-300 font-semibold'
                      : isCurrent
                      ? 'text-blue-300 font-semibold'
                      : 'text-white/50'
                  }`}>
                    {step.text}
                  </span>
                  {isCurrent && (
                    <Zap className="w-5 h-5 text-yellow-400 animate-pulse flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Status Message */}
          <div className="mt-8">
            {status === 'processing' && (
              <div className="flex items-center justify-center gap-3 text-blue-300">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-base sm:text-lg">Training in progress... Please wait</span>
              </div>
            )}
            
            {status === 'completed' && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-green-400 text-3xl sm:text-4xl font-bold flex items-center justify-center gap-3">
                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12" />
                  Training Complete!
                </div>
                <p className="text-white/80 text-lg sm:text-xl max-w-2xl mx-auto">
                  Your document is ready. You can now start chatting with AI.
                </p>
                <p className="text-white/50 text-sm">
                  Closing automatically...
                </p>
              </div>
            )}

            {status === 'failed' && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-red-400 text-3xl sm:text-4xl font-bold flex items-center justify-center gap-3">
                  <X className="w-10 h-10 sm:w-12 sm:h-12" />
                  Training Failed
                </div>
                <p className="text-white/80 text-lg sm:text-xl max-w-2xl mx-auto">
                  There was an error processing your document. Please try again.
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-lg text-lg"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }

        @keyframes float-to-center {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(calc(50% - 50%), calc(50% - 50%)) scale(0.5);
            opacity: 0.5;
          }
          100% {
            transform: translate(calc(50% - 50%), calc(50% - 50%)) scale(0);
            opacity: 0;
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
        }

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

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-to-center {
          animation: float-to-center 4s ease-in-out infinite;
        }

        .animate-sparkle {
          animation: sparkle 1.5s ease-in-out infinite;
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-spin-reverse {
          animation: spin-slow 6s linear infinite reverse;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AITrainingModal;
