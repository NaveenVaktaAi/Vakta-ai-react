import { useState } from "react";

interface SubjectSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (examType: string, subject: string, topic: string) => void;
  skipExamStep?: boolean; // If true, skip exam selection and start with subject
  defaultExamType?: string; // Default exam type when skipping exam step
}

// Exam Types
const examTypes = [
  { value: "IIT JEE", emoji: "🎓", color: "from-blue-500 to-indigo-600", description: "Engineering Entrance" },
  { value: "NEET", emoji: "🏥", color: "from-green-500 to-emerald-600", description: "Medical Entrance" },
  { value: "General Conversation", emoji: "💬", color: "from-purple-500 to-pink-600", description: "General Learning" },
];

// Subjects by Exam Type
const subjectsByExam: Record<string, Array<{ value: string; emoji: string; color: string }>> = {
  "IIT JEE": [
    { value: "Mathematics", emoji: "📐", color: "from-blue-500 to-cyan-500" },
    { value: "Physics", emoji: "⚛️", color: "from-purple-500 to-pink-500" },
    { value: "Chemistry", emoji: "🧪", color: "from-green-500 to-teal-500" },
  ],
  "NEET": [
    { value: "Physics", emoji: "⚛️", color: "from-purple-500 to-pink-500" },
    { value: "Chemistry", emoji: "🧪", color: "from-green-500 to-teal-500" },
    { value: "Biology", emoji: "🧬", color: "from-emerald-500 to-lime-500" },
  ],
  "General Conversation": [
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
  ],
};

// Topics by Subject (JEE specific)
const topicsBySubjectJEE: Record<string, string[]> = {
  "Mathematics": ["Algebra", "Calculus", "Geometry", "Trigonometry", "Coordinate Geometry", "Probability", "Complex Numbers", "Other"],
  "Physics": ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics", "Waves", "Kinematics", "Other"],
  "Chemistry": ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Chemical Bonding", "Equilibrium", "Thermodynamics", "Other"],
};

// Topics by Subject (NEET specific)
const topicsBySubjectNEET: Record<string, string[]> = {
  "Physics": ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics", "Waves", "Other"],
  "Chemistry": ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Biochemistry", "Chemical Bonding", "Other"],
  "Biology": ["Botany", "Zoology", "Human Physiology", "Cell Biology", "Genetics", "Ecology", "Evolution", "Other"],
};

// Topics by Subject (General)
const topicsBySubjectGeneral: Record<string, string[]> = {
  "Mathematics": ["Algebra", "Calculus", "Geometry", "Trigonometry", "Statistics", "Number Theory", "Linear Algebra", "Other"],
  "Physics": ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics", "Quantum Mechanics", "Other"],
  "Chemistry": ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Biochemistry", "Analytical Chemistry", "Other"],
  "Biology": ["Cell Biology", "Genetics", "Evolution", "Ecology", "Human Anatomy", "Microbiology", "Botany", "Other"],
  "Computer Science": ["Programming", "Data Structures", "Algorithms", "Databases", "AI/ML", "Web Development", "Networks", "Other"],
  "English": ["Grammar", "Literature", "Essay Writing", "Poetry", "Comprehension", "Vocabulary", "Speaking Skills", "Other"],
  "History": ["Ancient History", "Medieval History", "Modern History", "World Wars", "Indian History", "American History", "Other"],
  "Geography": ["Physical Geography", "Human Geography", "Maps", "Climate", "Resources", "Population", "Other"],
  "Economics": ["Microeconomics", "Macroeconomics", "Development", "International Trade", "Public Finance", "Other"],
  "Other": ["General"],
};

export function SubjectSelectionDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  skipExamStep = false,
  defaultExamType = ""
}: SubjectSelectionDialogProps) {
  const [step, setStep] = useState<'exam' | 'subject' | 'topic'>(skipExamStep ? 'subject' : 'exam');
  const [selectedExam, setSelectedExam] = useState<string>(defaultExamType || "");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleNextToSubject = () => {
    if (!selectedExam.trim()) return;
    setStep('subject');
  };

  const handleNextToTopic = () => {
    const finalSubject = selectedSubject === "Other" ? customSubject : selectedSubject;
    if (!finalSubject.trim()) return;
    setStep('topic');
  };

  const handleBackToExam = () => {
    setStep('exam');
    setSelectedSubject("");
    setCustomSubject("");
    setSelectedTopic("");
    setCustomTopic("");
  };

  const handleBackToSubject = () => {
    setStep('subject');
    setSelectedTopic("");
    setCustomTopic("");
  };

  const handleConfirm = () => {
    const finalSubject = selectedSubject === "Other" ? customSubject : selectedSubject;
    const finalTopic = customTopic.trim() || selectedTopic;
    
    // Use selectedExam or defaultExamType
    const finalExamType = selectedExam || defaultExamType;
    
    if ((!skipExamStep && !finalExamType.trim()) || !finalSubject.trim() || !finalTopic.trim()) return;
    setLoading(true);
    onConfirm(finalExamType.trim(), finalSubject.trim(), finalTopic.trim());
    setTimeout(() => {
      setStep(skipExamStep ? 'subject' : 'exam');
      setSelectedExam(defaultExamType || "");
      setSelectedSubject("");
      setCustomSubject("");
      setSelectedTopic("");
      setCustomTopic("");
      setLoading(false);
    }, 150);
  };

  const handleCancel = () => {
    setStep(skipExamStep ? 'subject' : 'exam');
    setSelectedExam(defaultExamType || "");
    setSelectedSubject("");
    setCustomSubject("");
    setSelectedTopic("");
    setCustomTopic("");
    onClose();
  };

  if (!isOpen) return null;

  // Determine which topics map to use based on exam type
  const finalExamType = selectedExam || defaultExamType;
  let topicsMap: Record<string, string[]> = topicsBySubjectGeneral;
  if (finalExamType === "IIT JEE") {
    topicsMap = topicsBySubjectJEE;
  } else if (finalExamType === "NEET") {
    topicsMap = topicsBySubjectNEET;
  }

  const selectedExamData = examTypes.find(e => e.value === finalExamType);
  const availableSubjects = subjectsByExam[finalExamType] || subjectsByExam["General Conversation"];
  const selectedSubjectData = availableSubjects.find(s => s.value === selectedSubject);
  const finalSubject = selectedSubject === "Other" ? customSubject : selectedSubject;
  const availableTopics = topicsMap[selectedSubject] || ["General", "Other"];

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
            {step === 'exam' && 'Welcome to AI Tutor!'}
            {step === 'subject' && `Select Subject for ${finalExamType || 'your exam'}`}
            {step === 'topic' && `${finalSubject} - Select Topic`}
          </h2>
          <p className="text-gray-600 mt-1.5 text-sm">
            {step === 'exam' && 'Which exam are you preparing for?'}
            {step === 'subject' && 'Choose your subject to get started'}
            {step === 'topic' && 'Select a specific topic to focus on'}
          </p>
        </div>

        {/* Step 1: Exam Selection */}
        {step === 'exam' && (
          <>
            <div className="space-y-3 mb-5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <span className="text-base">🎯</span>
                Select Exam Type
              </label>
              
              <div className="grid grid-cols-1 gap-3">
                {examTypes.map((exam) => (
                  <button
                    key={exam.value}
                    onClick={() => {
                      setSelectedExam(exam.value);
                    }}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all duration-300 group
                      ${selectedExam === exam.value 
                        ? `border-transparent bg-gradient-to-br ${exam.color} text-white shadow-lg scale-[1.02]` 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl transform group-hover:scale-110 transition-transform duration-300">
                        {exam.emoji}
                      </span>
                      <div className="flex-1 text-left">
                        <div className={`font-bold text-lg ${selectedExam === exam.value ? 'text-white' : 'text-gray-800'}`}>
                          {exam.value}
                        </div>
                        <div className={`text-xs mt-0.5 ${selectedExam === exam.value ? 'text-white/90' : 'text-gray-500'}`}>
                          {exam.description}
                        </div>
                      </div>
                      {selectedExam === exam.value && (
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                          <span className="text-green-500 text-sm">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={handleCancel}
                className="flex-1 px-5 py-2.5 rounded-xl bg-white text-gray-700 font-semibold border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleNextToSubject}
                disabled={!selectedExam}
                className={`
                  flex-1 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg text-sm
                  ${!selectedExam
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : `bg-gradient-to-r ${selectedExamData?.color || 'from-blue-600 to-purple-600'} text-white hover:shadow-xl hover:scale-105`
                  }
                `}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Next: Subject</span>
                  <span className="text-lg">→</span>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Step 2: Subject Selection */}
        {step === 'subject' && (
          <>
            <div className="space-y-3 mb-5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <span className="text-base">📖</span>
                Select Your Subject
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {availableSubjects.map((subject) => (
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
                onClick={handleBackToExam}
                className="flex-1 px-5 py-2.5 rounded-xl bg-white text-gray-700 font-semibold border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm text-sm"
                disabled={loading}
              >
                ← Back
              </button>
              <button
                onClick={handleNextToTopic}
                disabled={!selectedSubject || (selectedSubject === 'Other' && !customSubject.trim())}
                className={`
                  flex-1 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg text-sm
                  ${!selectedSubject || (selectedSubject === 'Other' && !customSubject.trim())
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : `bg-gradient-to-r ${selectedExamData?.color || 'from-blue-600 to-purple-600'} text-white hover:shadow-xl hover:scale-105`
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

        {/* Step 3: Topic Selection */}
        {step === 'topic' && (
          <>
            <div className="space-y-3 mb-5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <span className="text-base">🎯</span>
                Select Specific Topic
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {availableTopics.slice(0, -1).map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      setSelectedTopic(topic);
                      setCustomTopic("");
                    }}
                    className={`
                      relative p-3 rounded-xl border-2 transition-all duration-300 group
                      ${selectedTopic === topic
                        ? `border-transparent bg-gradient-to-br ${selectedSubjectData?.color || selectedExamData?.color || 'from-blue-500 to-purple-500'} text-white shadow-lg scale-105` 
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

            {/* Custom Topic Input */}
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
                    setSelectedTopic("Other");
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
                    : `bg-gradient-to-r ${selectedExamData?.color || 'from-blue-600 to-purple-600'} text-white hover:shadow-xl hover:scale-105`
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
          💡 Your AI tutor will adapt to {selectedExam || 'your'} preparation style
        </p>
      </div>
    </div>
  );
}
