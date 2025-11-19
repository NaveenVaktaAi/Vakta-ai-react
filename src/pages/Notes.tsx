import { useState, useEffect } from 'react';
import { FileText, Plus, Loader2, BookOpen, Target, CheckCircle, Lightbulb, X } from 'lucide-react';
import api from '../services/api';
import FormattedMessage from '../components/FormattedMessage';

interface PracticeQuestion {
  question: string;
  answer: string;
  explanation?: string;
}

interface RealLifeExample {
  title: string;
  description: string;
  application?: string;
}

interface NoteContent {
  notes: string;
  practice_questions: PracticeQuestion[];
  real_life_examples: RealLifeExample[];
  summary?: string;
}

interface Note {
  _id: string;
  notes_name: string;
  subject: string;
  topic: string;
  level: string;
  content: NoteContent;
  created_at: string;
  updated_at: string;
}

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Form state
  const [notesName, setNotesName] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notes');
      if (response.data.success) {
        setNotes(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notesName.trim() || !subject.trim() || !topic.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setGenerating(true);
      const response = await api.post('/notes/generate', {
        notes_name: notesName.trim(),
        subject: subject.trim(),
        topic: topic.trim()
      });

      if (response.data.success) {
        alert('Notes generated successfully!');
        setShowForm(false);
        setNotesName('');
        setSubject('');
        setTopic('');
        loadNotes();
      } else {
        alert(response.data.message || 'Failed to generate notes');
      }
    } catch (error: any) {
      console.error('Error generating notes:', error);
      const errorMsg = error.response?.data?.detail?.message || error.response?.data?.detail || 'Failed to generate notes';
      alert(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">My Notes</h1>
            <p className="text-gray-600 text-sm sm:text-base">Generate and manage your study notes</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Generate Notes</span>
            <span className="sm:hidden">Generate</span>
          </button>
        </div>

        {/* Generate Form */}
        {showForm && (
          <div className="mb-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate New Notes</h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes Name *
                </label>
                <input
                  type="text"
                  value={notesName}
                  onChange={(e) => setNotesName(e.target.value)}
                  placeholder="e.g., Physics - Newton's Laws"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Physics, Mathematics, Chemistry"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topic *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Newton's Laws, Calculus, Organic Chemistry"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      <span>Generate Notes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setNotesName('');
                    setSubject('');
                    setTopic('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Notes Yet</h3>
            <p className="text-gray-600 mb-6">Generate your first notes to get started!</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Generate Notes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {notes.map((note) => (
              <div
                key={note._id}
                onClick={() => setSelectedNote(note)}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{note.notes_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BookOpen className="w-4 h-4" />
                      <span>{note.subject}</span>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                    {note.level}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Target className="w-4 h-4" />
                    <span className="font-medium">Topic:</span>
                    <span>{note.topic}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>{note.content.practice_questions.length} Questions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" />
                    <span>{note.content.real_life_examples.length} Examples</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note Detail Modal */}
        {selectedNote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedNote(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedNote.notes_name}</h2>
                  <p className="text-gray-600 mt-1">{selectedNote.subject} • {selectedNote.topic} • {selectedNote.level}</p>
                </div>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Summary */}
                {selectedNote.content.summary && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
                    <div className="text-blue-800">
                      <FormattedMessage content={selectedNote.content.summary} />
                    </div>
                  </div>
                )}

                {/* Notes Content */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Notes
                  </h3>
                  <div className="text-gray-700">
                    <FormattedMessage content={selectedNote.content.notes} />
                  </div>
                </div>

                {/* Practice Questions */}
                {selectedNote.content.practice_questions.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-6 h-6" />
                      Practice Questions ({selectedNote.content.practice_questions.length})
                    </h3>
                    <div className="space-y-4">
                      {selectedNote.content.practice_questions.map((q, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="font-semibold text-gray-900 mb-2">
                            Q{idx + 1}: <FormattedMessage content={q.question} />
                          </div>
                          <div className="text-gray-700 mb-2">
                            <span className="font-medium">Answer:</span> <FormattedMessage content={q.answer} />
                          </div>
                          {q.explanation && (
                            <div className="text-sm text-gray-600 italic">
                              <span className="font-medium">Explanation:</span> <FormattedMessage content={q.explanation} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real-life Examples */}
                {selectedNote.content.real_life_examples.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-6 h-6" />
                      Real-life Examples ({selectedNote.content.real_life_examples.length})
                    </h3>
                    <div className="space-y-4">
                      {selectedNote.content.real_life_examples.map((ex, idx) => (
                        <div key={idx} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <div className="font-semibold text-gray-900 mb-2">
                            <FormattedMessage content={ex.title} />
                          </div>
                          <div className="text-gray-700 mb-2">
                            <FormattedMessage content={ex.description} />
                          </div>
                          {ex.application && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Application:</span> <FormattedMessage content={ex.application} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;

