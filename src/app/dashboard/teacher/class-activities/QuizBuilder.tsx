'use client';

import { useState } from 'react';
import { Question } from '@/lib/cambridge-syllabus';

interface ClassSubject {
  class_id: string;
  classes: {
    id: string;
    name: string;
    section: string;
  };
  subjects: {
    id: string;
    name: string;
  };
}

interface QuizBuilderProps {
  classes: { id: string; name: string; section: string }[];
  subjects: { id: string; name: string }[];
  onQuizPublished: () => void;
  onCancel: () => void;
}

export default function QuizBuilder({ classes, subjects, onQuizPublished, onCancel }: QuizBuilderProps) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.name || 'Mathematics');
  const [gradeLevel, setGradeLevel] = useState('Grade 1');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [timeLimit, setTimeLimit] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceBadge, setSourceBadge] = useState<'gemini' | 'fallback' | null>(null);
  const [generatedModel, setGeneratedModel] = useState<string | null>(null);

  // Quiz state after generation
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [cambridgeObjective, setCambridgeObjective] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);

  // Generation step trigger
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) {
      alert('Please enter a topic to guide the AI!');
      return;
    }

    setIsGenerating(true);
    setSourceBadge(null);
    setGeneratedModel(null);

    try {
      const response = await fetch('/api/ai/generate-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          gradeLevel,
          topic,
          numQuestions
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        const data = result.data;
        setQuizTitle(data.title || `Cambridge ${selectedSubject} Quiz: ${topic}`);
        setQuizDescription(data.description || `Auto-marked MCQ quiz covering ${topic}.`);
        setCambridgeObjective(data.cambridgeObjective || '');
        setQuestions(data.questions || []);
        
        if (result.source === 'gemini-api') {
          setSourceBadge('gemini');
          setGeneratedModel(result.model);
        } else {
          setSourceBadge('fallback');
        }
      } else {
        alert(result.error || 'Failed to generate quiz');
      }
    } catch (err) {
      console.error(err);
      alert('Network error generating quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  // Modify question details local state
  const handleQuestionTextChange = (index: number, val: string) => {
    const updated = [...questions];
    updated[index].question = val;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, val: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = val;
    setQuestions(updated);
  };

  const handleCorrectChoiceChange = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].correctIndex = optIndex;
    setQuestions(updated);
  };

  const handleExplanationChange = (qIndex: number, val: string) => {
    const updated = [...questions];
    updated[qIndex].explanation = val;
    setQuestions(updated);
  };

  // Publish final quiz to backend
  const handlePublish = async () => {
    if (!quizTitle || questions.length === 0) {
      alert('Please generate the quiz first!');
      return;
    }

    try {
      const response = await fetch('/api/activities/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassId,
          title: quizTitle,
          subject: selectedSubject,
          topic,
          grade_level: gradeLevel,
          activity_type: 'quiz',
          description: quizDescription + ` [Cambridge Objective: ${cambridgeObjective}]`,
          questions,
          time_limit_minutes: timeLimit,
          max_attempts: 1 // default one attempt
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('Quiz published successfully to your students!');
        onQuizPublished();
      } else {
        alert(result.error || 'Failed to publish quiz');
      }
    } catch (err) {
      console.error(err);
      alert('Network error publishing quiz');
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
          ✨ AI Cambridge MCQ Quiz Generator (Free Tier)
        </h2>

        <form onSubmit={handleGenerate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          
          <div className="form-group">
            <label className="form-label">Target Class</label>
            <select 
              value={selectedClassId} 
              onChange={e => setSelectedClassId(e.target.value)} 
              className="input-field" 
              required
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <select 
              value={selectedSubject} 
              onChange={e => setSelectedSubject(e.target.value)} 
              className="input-field" 
              required
            >
              {subjects.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Grade Level</label>
            <select 
              value={gradeLevel} 
              onChange={e => setGradeLevel(e.target.value)} 
              className="input-field" 
              required
            >
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 3">Grade 3</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Questions count</label>
            <select 
              value={numQuestions} 
              onChange={e => setNumQuestions(Number(e.target.value))} 
              className="input-field"
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={8}>8 Questions</option>
              <option value={10}>10 Questions</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Timer (Minutes)</label>
            <input 
              type="number" 
              value={timeLimit} 
              onChange={e => setTimeLimit(Number(e.target.value))} 
              min={1} 
              className="input-field" 
              required 
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Activity Topic (Be descriptive for better AI context)</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                value={topic} 
                onChange={e => setTopic(e.target.value)} 
                placeholder="e.g. Halves and Quarters using Stone Town fruit market examples" 
                className="input-field" 
                style={{ flex: 1 }}
                required 
              />
              <button 
                type="submit" 
                disabled={isGenerating} 
                className="btn btn-primary"
                style={{ minWidth: '150px' }}
              >
                {isGenerating ? 'Generating...' : '✨ Create with AI'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {isGenerating && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ border: '4px solid rgba(0,0,0,0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: 'var(--color-primary)', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p>Consulting Google Gemini AI for Cambridge syllabus guidelines...</p>
        </div>
      )}

      {/* Generated Quiz Review Panel */}
      {questions.length > 0 && !isGenerating && (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Review Quiz Contents</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0 0' }}>
                You can review, edit the questions and answer keys before publishing.
              </p>
            </div>
            <div>
              {sourceBadge === 'gemini' && (
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  🤖 Google Gemini ({generatedModel || '2.5-flash'})
                </span>
              )}
              {sourceBadge === 'fallback' && (
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontWeight: 600, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  🔌 Local Offline Template
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="form-group">
              <label className="form-label">Quiz Title</label>
              <input 
                type="text" 
                value={quizTitle} 
                onChange={e => setQuizTitle(e.target.value)} 
                className="input-field" 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Quiz Description</label>
              <textarea 
                value={quizDescription} 
                onChange={e => setQuizDescription(e.target.value)} 
                className="input-field" 
                style={{ minHeight: '60px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cambridge Objective Reference</label>
              <input 
                type="text" 
                value={cambridgeObjective} 
                onChange={e => setCambridgeObjective(e.target.value)} 
                className="input-field" 
              />
            </div>
          </div>

          <h4 style={{ fontSize: '1.05rem', margin: '0 0 1rem 0', fontWeight: 600 }}>Questions List</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {questions.map((q, qIdx) => (
              <div key={q.id || qIdx} style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'start', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, backgroundColor: 'var(--color-primary-light, #e0f2fe)', color: 'var(--color-primary)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                    {qIdx + 1}
                  </span>
                  <input 
                    type="text" 
                    value={q.question} 
                    onChange={e => handleQuestionTextChange(qIdx, e.target.value)} 
                    className="input-field" 
                    style={{ flex: 1 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingLeft: '2.5rem', marginBottom: '1rem' }}>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff' }}>
                      <input 
                        type="radio" 
                        name={`correct-${qIdx}`} 
                        checked={q.correctIndex === oIdx} 
                        onChange={() => handleCorrectChoiceChange(qIdx, oIdx)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{String.fromCharCode(65 + oIdx)}:</span>
                      <input 
                        type="text" 
                        value={opt} 
                        onChange={e => handleOptionChange(qIdx, oIdx, e.target.value)} 
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ paddingLeft: '2.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                    AI Explanation / Answer Rationale
                  </label>
                  <textarea 
                    value={q.explanation} 
                    onChange={e => handleExplanationChange(qIdx, e.target.value)} 
                    className="input-field" 
                    style={{ minHeight: '50px', fontSize: '0.85rem', resize: 'vertical' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Discard
            </button>
            <button type="button" onClick={handlePublish} className="btn btn-primary" style={{ padding: '0.5rem 2rem' }}>
              Publish Quiz to Class
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
