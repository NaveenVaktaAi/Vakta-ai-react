import { useState } from "react";

interface SubjectSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subject: string, topic: string) => void;  // ✅ Now includes topic
}

const predefinedSubjects = [
  { value: "Mathematics", emoji: "📐", color: "from-blue-500 to-cyan-500" },
  { value: "Physics", emoji: "⚛️", color: "from-purple-500 to-pink-500" },
  { value: "Chemistry", emoji: "🧪", color: "from-green-500 to-teal-500" },
  { value: "Biology", emoji: "🧬", color: "from-emerald-500 to-lime-500" },
  { value: "Computer Science", emoji: "💻", color: "from-indigo-500 to-blue-500" },
  { value: "English", emoji: "📚", color: "from-orange-500 to-red-500" },
  { value: "History", emoji: "🏛️", color: "from-amber-500 to-yellow-500" },
  { value: "Geography", emoji: "🌍", color: "from-teal-500 to-cyan-500" },
  { value: "Economics", emoji: "💰", color: "from-yellow-500 to-orange-500" },
  { value: "Other", emoji: "✨", color: "from-pink-500 to-rose-500" },
];

// ✅ Topic suggestions by subject
const topicsBySubject: Record<string, string[]> = {
  "Mathematics": ["Algebra", "Calculus", "Geometry", "Trigonometry", "Statistics", "Number Theory", "Linear Algebra", "Other"],
  "Physics": ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics", "Quantum Mechanics", "Other"],
  "Chemistry": ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Biochemistry", "Analytical Chemistry", "Other"],
  "Biology": ["Cell Biology", "Genetics", "Evolution", "Ecology", "Human Anatomy", "Microbiology", "Botany", "Other"],
  "Computer Science": ["Programming", "Data Structures", "Algorithms", "Databases", "AI/ML", "Web Development", "Networks", "Other"],
  "English": ["Grammar", "Literature", "Essay Writing", "Poetry", "Comprehension", "Vocabulary", "Speaking Skills", "Other"],
  "History": ["Ancient History", "Medieval History", "Modern History", "World Wars", "Indian History", "American History", "Other"],
  "Geography": ["Physical Geography", "Human Geography", "Maps", "Climate", "Resources", "Population", "Other"],
  "Economics": ["Microeconomics", "Macroeconomics", "Development", "International Trade", "Public Finance", "Other"],
  "Other": ["General"]
};

export function SubjectSelectionDialog({ isOpen, onClose, onConfirm }: SubjectSelectionDialogProps) {
  const [step, setStep] = useState<'subject' | 'topic'>('subject');  // ✅ Multi-step
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleNextToTopic = () => {
    const finalSubject = selectedSubject === "Other" ? customSubject : selectedSubject;
    if (!finalSubject.trim()) return;
    setStep('topic');  // ✅ Move to topic selection
  };

  const handleBackToSubject = () => {
    setStep('subject');
    setSelectedTopic("");
    setCustomTopic("");
  };

  const handleConfirm = () => {
    const finalSubject = selectedSubject === "Other" ? customSubject : selectedSubject;
    // ✅ If customTopic is filled, use it; otherwise use selectedTopic
    const finalTopic = customTopic.trim() || selectedTopic;
    
    if (!finalSubject.trim() || !finalTopic.trim()) return;
    setLoading(true);
    onConfirm(finalSubject.trim(), finalTopic.trim());  // ✅ Pass both subject and topic
    setTimeout(() => {
      setStep('subject');
      setSelectedSubject("");
      setCustomSubject("");
      setSelectedTopic("");
      setCustomTopic("");
      setLoading(false);
    }, 150);
  };

  const handleCancel = () => {
    setStep('subject');
    setSelectedSubject("");
    setCustomSubject("");
    setSelectedTopic("");
    setCustomTopic("");
    onClose();
  };

  if (!isOpen) return null;

  const selectedSubjectData = predefinedSubjects.find(s => s.value === selectedSubject);
  const finalSubject = selectedSubject === "Other" ? customSubject : selectedSubject;
  const availableTopics = topicsBySubject[selectedSubject] || ["General", "Other"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-3xl shadow-2xl w-[90%] max-w-xl p-6 sm:p-8 animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header with AI Tutor Avatar */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg mb-3 overflow-hidden">
            <img 
              src="/aitutor.png" 
              alt="AI Tutor" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {step === 'subject' ? 'Welcome to AI Tutor' : `${finalSubject} - Select Topic`}
          </h2>
          <p className="text-gray-600 mt-1.5 text-sm">
            {step === 'subject' 
              ? 'Choose your subject and let\'s begin your personalized learning journey'
              : 'Select a specific topic to focus on'}
          </p>
        </div>

        {/* Step 1: Subject Selection */}
        {step === 'subject' && (
          <>
            <div className="space-y-3 mb-5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <span className="text-base">📖</span>
                Select Your Subject
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {predefinedSubjects.map((subject) => (
                  <button
                    key={subject.value}
                    onClick={() => {
                      setSelectedSubject(subject.value);
                      setCustomSubject("");
                    }}
                    className={`
                      relative p-3 rounded-xl border-2 transition-all duration-300 group
                      ${selectedSubject === subject.value 
                        ? `border-transparent bg-gradient-to-br ${subject.color} text-white shadow-lg scale-105` 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-102'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300">
                        {subject.emoji}
                      </span>
                      <span className={`text-xs font-semibold ${selectedSubject === subject.value ? 'text-white' : 'text-gray-700'}`}>
                        {subject.value}
                      </span>
                    </div>
                    {selectedSubject === subject.value && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                        <span className="text-green-500 text-sm">✓</span>
                      </div>
                    )}
                  </button>
            ))}
              </div>
            </div>

          {selectedSubject === "Other" && (
              <div className="mb-5 animate-in slide-in-from-top duration-300">
                <label className="text-xs font-semibold text-gray-700 mb-2 block">
                  Enter Your Subject
                </label>
            <input
                  className="w-full border-2 border-purple-300 px-3 py-2.5 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 text-sm bg-white text-gray-900 placeholder-gray-400 transition-all duration-300"
                  placeholder="e.g., Machine Learning, Psychology, etc."
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && customSubject.trim()) {
                      handleNextToTopic();
                    }
                  }}
              autoFocus
            />
              </div>
          )}

            <div className="flex gap-2.5 mt-6">
          <button
            onClick={handleCancel}
                className="flex-1 px-5 py-2.5 rounded-xl bg-white text-gray-700 font-semibold border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm text-sm"
          >
            Cancel
          </button>
              <button
                onClick={handleNextToTopic}
                disabled={!selectedSubject || (selectedSubject === 'Other' && !customSubject.trim())}
                className={`
                  flex-1 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg text-sm
                  ${!selectedSubject || (selectedSubject === 'Other' && !customSubject.trim())
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : `bg-gradient-to-r ${selectedSubjectData?.color || 'from-blue-600 to-purple-600'} text-white hover:shadow-xl hover:scale-105`
                  }
                `}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Next: Topic</span>
                  <span className="text-lg">→</span>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Step 2: Topic Selection */}
        {step === 'topic' && (
          <>
            <div className="space-y-3 mb-5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <span className="text-base">🎯</span>
                Select Specific Topic
              </label>
              
              {/* Topic Grid - No horizontal scroll, proper wrapping */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {availableTopics.slice(0, -1).map((topic) => (  // All except "Other"
                  <button
                    key={topic}
                    onClick={() => {
                      setSelectedTopic(topic);
                      setCustomTopic("");
                    }}
                    className={`
                      relative p-3 rounded-xl border-2 transition-all duration-300 group
                      ${selectedTopic === topic
                        ? `border-transparent bg-gradient-to-br ${selectedSubjectData?.color || 'from-blue-500 to-purple-500'} text-white shadow-lg scale-105` 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-102'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <span className={`text-xs font-semibold text-center ${selectedTopic === topic ? 'text-white' : 'text-gray-700'}`}>
                        {topic}
                      </span>
                    </div>
                    {selectedTopic === topic && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                        <span className="text-green-500 text-sm">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Topic Input - Always visible */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1.5">
                <span>✏️</span>
                Or Type Your Own Topic (Optional)
              </label>
              <input
                className="w-full border-2 border-purple-300 px-3 py-2.5 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 text-sm bg-white text-gray-900 placeholder-gray-400 transition-all duration-300"
                placeholder="e.g., Vectors, Chemical Bonding, etc."
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  if (e.target.value.trim()) {
                    setSelectedTopic("Other");  // Auto-select "Other" when typing
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && customTopic.trim()) {
                    handleConfirm();
                  }
                }}
              />
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={handleBackToSubject}
                className="flex-1 px-5 py-2.5 rounded-xl bg-white text-gray-700 font-semibold border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm text-sm"
                disabled={loading}
              >
                ← Back
              </button>
          <button
            onClick={handleConfirm}
                disabled={loading || (!selectedTopic && !customTopic.trim())}
                className={`
                  flex-1 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg text-sm
                  ${loading || (!selectedTopic && !customTopic.trim())
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : `bg-gradient-to-r ${selectedSubjectData?.color || 'from-blue-600 to-purple-600'} text-white hover:shadow-xl hover:scale-105`
                  }
                `}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Start Learning</span>
                    <span className="text-lg">🚀</span>
                  </div>
                )}
          </button>
        </div>
          </>
        )}

        {/* Footer Note */}
        <p className="text-xs text-gray-500 text-center mt-4">
          💡 Your AI tutor will adapt to your learning pace and style
        </p>
      </div>
    </div>
  );
}


