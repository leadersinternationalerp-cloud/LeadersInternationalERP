'use client';

import { useState } from 'react';
import Link from 'next/link';
import QuizBuilder from './QuizBuilder';

interface Activity {
  id: string;
  class_id: string;
  title: string;
  subject: string;
  topic: string;
  grade_level: string;
  activity_type: string;
  description: string;
  date: string;
  questions: any;
  time_limit_minutes: number;
  max_attempts: number;
  is_published: boolean;
  total_questions: number;
  classes?: {
    name: string;
    section: string;
  };
}

interface ScoreRecord {
  id: string;
  studentName: string;
  studentEmail: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeTakenSeconds: number;
  submittedAt: string;
  answers?: any;
}

interface ClassActivitiesClientProps {
  initialActivities: Activity[];
  classes: { id: string; name: string; section: string }[];
  subjects: { id: string; name: string }[];
}

export default function ClassActivitiesClient({
  initialActivities,
  classes,
  subjects
}: ClassActivitiesClientProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'quizzes'>('all');
  
  // Scoreboard modal state
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [scoreboardData, setScoreboardData] = useState<ScoreRecord[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [activeReviewStudent, setActiveReviewStudent] = useState<ScoreRecord | null>(null);

  // Quiz question preview modal
  const [previewQuiz, setPreviewQuiz] = useState<Activity | null>(null);

  // Standard non-MCQ Activity form state
  const [subject, setSubject] = useState(subjects[0]?.name || 'Mathematics');
  const [gradeLevel, setGradeLevel] = useState('Grade 1');
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [isPublishingStandard, setIsPublishingStandard] = useState(false);

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activities/list-all'); // Wait, we can fetch from page route or reload
      // But instead of complex endpoint, let's just trigger a reload of the window or fetch
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuizPublished = () => {
    setShowBuilder(false);
    // Reload activities from DB by reloading the route or refreshing
    window.location.reload();
  };

  // Fetch results and open scoreboard modal
  const openScoreboard = async (activity: Activity) => {
    setSelectedActivity(activity);
    setIsLoadingScores(true);
    setScoreboardData([]);
    setActiveReviewStudent(null);

    try {
      const response = await fetch(`/api/activities/results?activity_id=${activity.id}`);
      const result = await response.json();
      if (result.success) {
        setScoreboardData(result.data || []);
      } else {
        alert(result.error || 'Failed to load scores');
      }
    } catch (err) {
      console.error(err);
      alert('Network error loading student scores');
    } finally {
      setIsLoadingScores(false);
    }
  };

  // Publish standard text activity to backend
  const handlePublishStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !description) return;

    setIsPublishingStandard(true);
    try {
      const response = await fetch('/api/activities/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassId,
          title: `Classwork: ${topic}`,
          subject,
          topic,
          grade_level: gradeLevel,
          activity_type: 'classwork',
          description,
          questions: [] // no MCQ questions
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('Activity published successfully!');
        setTopic('');
        setDescription('');
        window.location.reload();
      } else {
        alert(result.error || 'Failed to publish activity');
      }
    } catch (err) {
      console.error(err);
      alert('Network error publishing activity');
    } finally {
      setIsPublishingStandard(false);
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(act => {
    if (activeTab === 'quizzes') {
      return act.activity_type === 'quiz';
    }
    return true;
  });

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>
            Class Activities & Quizzes
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Manage lessons and generate auto-marked quizzes using Gemini AI.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowBuilder(!showBuilder)}
            className={`btn ${showBuilder ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {showBuilder ? '✕ Close Builder' : '✨ AI MCQ Quiz Builder'}
          </button>
          <Link href="/dashboard/teacher" className="btn btn-secondary" style={{ textDecoration: 'none', fontWeight: 600 }}>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {showBuilder ? (
        <QuizBuilder
          classes={classes}
          subjects={subjects}
          onQuizPublished={handleQuizPublished}
          onCancel={() => setShowBuilder(false)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Left panel: Create Standard Activity Form */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', fontWeight: 600 }}>
              Create Standard Class Activity
            </h2>
            
            <form onSubmit={handlePublishStandard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Class</label>
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
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Subject</label>
                  <select 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                    className="input-field" 
                    required
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Grade</label>
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
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Activity Type</label>
                  <select className="input-field" disabled value="classwork">
                    <option value="classwork">Classwork (Text-based)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Activity Topic</label>
                <input 
                  type="text" 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)} 
                  placeholder="e.g. Stone Town spice trade history" 
                  className="input-field" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Activity Description</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Explain instructions, student tasks, homework questions..." 
                  className="input-field" 
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={isPublishingStandard} 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem', fontWeight: 600 }}
              >
                {isPublishingStandard ? 'Publishing...' : 'Publish Class Activity'}
              </button>
            </form>
          </div>

          {/* Right panel: Published List */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
              <button
                onClick={() => setActiveTab('all')}
                style={{
                  padding: '1rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.85rem',
                  borderBottom: activeTab === 'all' ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: activeTab === 'all' ? 'var(--color-primary)' : 'var(--color-text-muted)'
                }}
              >
                All Activities ({activities.length})
              </button>
              <button
                onClick={() => setActiveTab('quizzes')}
                style={{
                  padding: '1rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.85rem',
                  borderBottom: activeTab === 'quizzes' ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: activeTab === 'quizzes' ? 'var(--color-primary)' : 'var(--color-text-muted)'
                }}
              >
                AI MCQ Quizzes ({activities.filter(a => a.activity_type === 'quiz').length})
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', maxHeight: '600px', overflowY: 'auto' }}>
              {filteredActivities.map((act) => (
                <div key={act.id} style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', position: 'relative' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: 'var(--color-text)' }}>
                        {act.title}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Subject: {act.subject} • {act.grade_level} • Class: {act.classes?.name} {act.classes?.section ? `(${act.classes.section})` : ''}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {act.activity_type === 'quiz' ? (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: 600 }}>
                          Quiz ({act.total_questions} Qs)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(75, 85, 99, 0.1)', color: '#4b5563', fontWeight: 600 }}>
                          Classwork
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', margin: '0 0 1rem 0', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {act.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span>Published: {new Date(act.date).toLocaleDateString()}</span>
                    {act.activity_type === 'quiz' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setPreviewQuiz(act)}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          👁 Preview
                        </button>
                        <button
                          onClick={() => openScoreboard(act)}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          📊 View Student Scores
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredActivities.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No published activities found for this filter.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Scoreboard Modal */}
      {selectedActivity && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '750px', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', maxHeight: '90%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                  📊 Student Scoreboard
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
                  Results for: <strong>{selectedActivity.title}</strong>
                </p>
              </div>
              <button
                onClick={() => { setSelectedActivity(null); setActiveReviewStudent(null); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            {isLoadingScores ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                <p>Loading student scores...</p>
              </div>
            ) : activeReviewStudent ? (
              /* Quiz Review Sub-view */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    Reviewing: <strong>{activeReviewStudent.studentName}</strong> (Score: {activeReviewStudent.score} / {activeReviewStudent.maxScore})
                  </span>
                  <button
                    onClick={() => setActiveReviewStudent(null)}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    ← Back to Scoreboard
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {((selectedActivity.questions as any[]) || []).map((q: any, idx: number) => {
                    const studentChoice = activeReviewStudent.answers ? activeReviewStudent.answers[q.id] : undefined;
                    const isCorrect = q.correctIndex === studentChoice;

                    return (
                      <div
                        key={q.id || idx}
                        style={{
                          padding: '1rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}`,
                          backgroundColor: '#fff'
                        }}
                      >
                        <h5 style={{ fontSize: '0.95rem', margin: '0 0 0.75rem 0', display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                          <span style={{
                            fontSize: '0.8rem', fontWeight: 700,
                            backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: isCorrect ? '#10b981' : '#ef4444',
                            width: '24px', height: '24px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ flex: 1, fontWeight: 600 }}>{q.question}</span>
                        </h5>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '2rem', marginBottom: '0.75rem' }}>
                          {((q.options as string[]) || []).map((opt: string, oIdx: number) => {
                            const isStudentChoice = studentChoice === oIdx;
                            const isCorrectAnswer = q.correctIndex === oIdx;

                            let bg = '#fff';
                            let border = '1px solid var(--color-border)';
                            let color = 'var(--color-text)';
                            
                            if (isCorrectAnswer) {
                              bg = 'rgba(16, 185, 129, 0.08)';
                              border = '1px solid #10b981';
                              color = '#065f46';
                            } else if (isStudentChoice && !isCorrectAnswer) {
                              bg = 'rgba(239, 68, 68, 0.08)';
                              border = '1px solid #ef4444';
                              color = '#991b1b';
                            }

                            return (
                              <div
                                key={oIdx}
                                style={{
                                  padding: '0.5rem 0.75rem', border, backgroundColor: bg,
                                  color, borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + oIdx)}.</span>
                                <span style={{ flex: 1 }}>{opt}</span>
                                {isCorrectAnswer && <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>✓ Correct</span>}
                                {isStudentChoice && !isCorrectAnswer && <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem' }}>✗ Student choice</span>}
                                {isStudentChoice && isCorrectAnswer && <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>✓ Student choice</span>}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div style={{ marginLeft: '2rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
                              EXPLANATION
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text)', margin: 0, lineHeight: 1.4 }}>
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Table Scoreboard View */
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Student Name</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Score</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Percentage</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Time Taken</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Submitted At</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreboardData.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{row.studentName}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)' }}>{row.studentEmail}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600 }}>
                          {row.score} / {row.maxScore}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                              backgroundColor: row.percentage >= 70 ? 'rgba(16, 185, 129, 0.1)' : row.percentage >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: row.percentage >= 70 ? '#10b981' : row.percentage >= 50 ? '#f59e0b' : '#ef4444'
                            }}
                          >
                            {row.percentage}%
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          {row.timeTakenSeconds ? `${Math.floor(row.timeTakenSeconds / 60)}m ${row.timeTakenSeconds % 60}s` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          {new Date(row.submittedAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <button
                            onClick={() => setActiveReviewStudent(row)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            👁 Review Answers
                          </button>
                        </td>
                      </tr>
                    ))}
                    {scoreboardData.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                          No attempts recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button onClick={() => { setSelectedActivity(null); setActiveReviewStudent(null); }} className="btn btn-secondary">
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quiz Preview Modal */}
      {previewQuiz && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '750px', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', maxHeight: '90%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                  👁 Quiz Preview
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
                  Previewing: <strong>{previewQuiz.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {((previewQuiz.questions as any[]) || []).map((q: any, idx: number) => (
                <div
                  key={q.id || idx}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: '#fff'
                  }}
                >
                  <h5 style={{ fontSize: '0.95rem', margin: '0 0 0.75rem 0', display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 700,
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      width: '24px', height: '24px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ flex: 1, fontWeight: 600 }}>{q.question}</span>
                  </h5>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '2rem', marginBottom: '0.75rem' }}>
                    {((q.options as string[]) || []).map((opt: string, oIdx: number) => {
                      const isCorrectAnswer = q.correctIndex === oIdx;

                      let bg = '#fff';
                      let border = '1px solid var(--color-border)';
                      let color = 'var(--color-text)';
                      
                      if (isCorrectAnswer) {
                        bg = 'rgba(16, 185, 129, 0.08)';
                        border = '1px solid #10b981';
                        color = '#065f46';
                      }

                      return (
                        <div
                          key={oIdx}
                          style={{
                            padding: '0.5rem 0.75rem', border, backgroundColor: bg,
                            color, borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + oIdx)}.</span>
                          <span style={{ flex: 1 }}>{opt}</span>
                          {isCorrectAnswer && <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>✓ Correct Option</span>}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div style={{ marginLeft: '2rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
                        EXPLANATION
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text)', margin: 0, lineHeight: 1.4 }}>
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button onClick={() => setPreviewQuiz(null)} className="btn btn-secondary">
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
