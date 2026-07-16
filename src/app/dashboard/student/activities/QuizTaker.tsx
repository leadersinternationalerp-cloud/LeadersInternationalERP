'use client';

import { useState, useEffect } from 'react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizTakerProps {
  activityId: string;
  title: string;
  subject: string;
  timeLimitMinutes: number;
  questions: Question[];
  onQuizFinished: () => void;
  onCancel: () => void;
  reviewMode?: boolean;
}

export default function QuizTaker({
  activityId,
  title,
  subject,
  timeLimitMinutes,
  questions,
  onQuizFinished,
  onCancel,
  reviewMode = false
}: QuizTakerProps) {
  const [answers, setAnswers] = useState<{ [qId: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState(timeLimitMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReview, setIsLoadingReview] = useState(reviewMode);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    results: {
      questionId: string;
      questionText: string;
      options: string[];
      correctIndex: number;
      studentChoice: number;
      isCorrect: boolean;
      explanation: string;
    }[];
  } | null>(null);

  // Fetch submitted attempt if in reviewMode
  useEffect(() => {
    if (reviewMode) {
      setIsLoadingReview(true);
      fetch(`/api/activities/review?activity_id=${activityId}`)
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            setQuizResult(res.data);
          } else {
            alert(res.error || 'Failed to load review data');
          }
        })
        .catch(err => {
          console.error(err);
          alert('Network error loading review data');
        })
        .finally(() => {
          setIsLoadingReview(false);
        });
    }
  }, [reviewMode, activityId]);

  // Timer Countdown Effect
  useEffect(() => {
    if (quizResult || timeLeft <= 0) {
      if (timeLeft <= 0 && !quizResult && !isSubmitting) {
        // Auto-submit when timer expires
        handleAutoSubmit();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quizResult]);

  const selectOption = (qId: string, optionIdx: number) => {
    if (quizResult) return; // Read-only after submission
    setAnswers(prev => ({
      ...prev,
      [qId]: optionIdx
    }));
  };

  const handleAutoSubmit = () => {
    console.log('Timer expired. Auto-submitting quiz responses.');
    submitQuiz(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered) {
      alert(`Please answer all questions before submitting. You have ${unansweredCount} unanswered question(s) remaining.`);
      return;
    }
    submitQuiz(false);
  };

  const submitQuiz = async (auto = false) => {
    setIsSubmitting(true);
    const timeTaken = timeLimitMinutes * 60 - timeLeft;

    // Fill in default -1 (no selection) for any unanswered questions
    const finalAnswers = { ...answers };
    questions.forEach(q => {
      if (finalAnswers[q.id] === undefined) {
        finalAnswers[q.id] = -1;
      }
    });

    try {
      const response = await fetch('/api/activities/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          answers: finalAnswers,
          time_taken_seconds: timeTaken
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        setQuizResult(result.data);
      } else {
        alert(result.error || 'Failed to submit quiz');
      }
    } catch (err) {
      console.error(err);
      alert('Network error submitting quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const allAnswered = unansweredCount === 0;

  if (isLoadingReview) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: '750px', margin: '2rem auto', textAlign: 'center', padding: '3rem' }} className="glass-panel">
        <h3 style={{ color: 'var(--color-primary)' }}>Loading Quiz Review...</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Please wait while we retrieve your submitted answers.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: '750px', margin: '0 auto' }}>
      
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '4px' }}>
            {subject}
          </span>
          <h2 style={{ fontSize: '1.25rem', margin: '0.4rem 0 0 0', color: 'var(--color-text)' }}>{title}</h2>
        </div>
        
        {!quizResult && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>TIME REMAINING</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: timeLeft < 60 ? '#ef4444' : 'var(--color-text)' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {/* Quiz Body */}
      {!quizResult ? (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
            {questions.map((q, qIdx) => (
              <div key={q.id || qIdx} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', backgroundColor: '#fff' }}>
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 1.25rem 0', display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text)', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {qIdx + 1}
                  </span>
                  <span style={{ flex: 1 }}>{q.question}</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '2.25rem' }}>
                  {q.options.map((opt, oIdx) => {
                    const isSelected = answers[q.id] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => selectOption(q.id, oIdx)}
                        style={{
                          textAlign: 'left', padding: '0.75rem 1rem', border: '1px solid',
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : '#fff',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer', outline: 'none',
                          fontWeight: isSelected ? 600 : 500, fontSize: '0.9rem',
                          display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{
                          width: '18px', height: '18px', borderRadius: '50%', border: '2px solid',
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                          display: 'inline-block', flexShrink: 0
                        }}></span>
                        <span style={{ fontWeight: 600, color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)', marginRight: '0.25rem' }}>
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel Quiz
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !allAnswered}
              className="btn btn-primary"
              style={{
                padding: '0.5rem 2.5rem',
                fontWeight: 600,
                opacity: allAnswered ? 1 : 0.6,
                cursor: allAnswered ? 'pointer' : 'not-allowed'
              }}
            >
              {isSubmitting ? 'Submitting...' : allAnswered ? 'Submit Quiz · Auto-Mark Now' : `Answer All Questions (${answeredCount}/${questions.length})`}
            </button>
          </div>
        </form>
      ) : (
        /* Results Section */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Summary Card */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.01)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
              Quiz Finished!
            </h3>
            
            <div style={{ margin: '1.5rem 0' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: quizResult.percentage >= 70 ? '#10b981' : quizResult.percentage >= 50 ? '#f59e0b' : '#ef4444' }}>
                {quizResult.score} / {quizResult.maxScore}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--color-text)' }}>
                {quizResult.percentage}% Score
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '0 auto', maxWidth: '400px' }}>
              {quizResult.percentage >= 70 ? 'Fantastic effort! You demonstrated strong mastery of the Cambridge syllabus objectives.' : quizResult.percentage >= 50 ? 'Good work! You have a fair understanding. Review the explanations below to improve.' : 'Keep practicing! Review the detailed answers and explanations below to learn.'}
            </p>
          </div>

          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '1rem 0 0 0' }}>Detailed Answer Review</h4>

          {/* Question Review Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
            {quizResult.results.map((res, idx) => (
              <div key={res.questionId || idx} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid', borderLeftColor: res.isCorrect ? '#10b981' : '#ef4444', backgroundColor: '#fff' }}>
                
                <h5 style={{ fontSize: '1rem', margin: '0 0 1rem 0', display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, backgroundColor: res.isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: res.isCorrect ? '#10b981' : '#ef4444', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {idx + 1}
                  </span>
                  <span style={{ flex: 1 }}>{res.questionText}</span>
                </h5>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '2.25rem', marginBottom: '1rem' }}>
                  {res.options.map((opt, oIdx) => {
                    const isStudentChoice = res.studentChoice === oIdx;
                    const isCorrectAnswer = res.correctIndex === oIdx;

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
                          padding: '0.6rem 0.9rem', border, backgroundColor: bg,
                          color, borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
                          display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + oIdx)}.</span>
                        <span style={{ flex: 1 }}>{opt}</span>
                        {isCorrectAnswer && <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Correct</span>}
                        {isStudentChoice && !isCorrectAnswer && <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ Your choice</span>}
                        {isStudentChoice && isCorrectAnswer && <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Your choice</span>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ paddingLeft: '2.25rem', backgroundColor: 'rgba(0,0,0,0.01)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    EXPLANATION
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>
                    {res.explanation}
                  </p>
                </div>

              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
            <button onClick={onQuizFinished} className="btn btn-primary" style={{ padding: '0.5rem 3rem', fontWeight: 600 }}>
              Back to Activities
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
