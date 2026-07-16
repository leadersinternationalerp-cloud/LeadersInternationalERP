'use client';

import React, { useState } from 'react';
import QuizTaker from './QuizTaker';

export interface ClassActivity {
  id: string;
  title: string;
  subject: string;
  date: string;
  description: string;
  activity_type: string;
  questions: any[];
  time_limit_minutes: number;
  max_attempts: number;
  is_published: boolean;
  total_questions: number;
  attachment_url?: string;
  attempt?: {
    score: number;
    maxScore: number;
    percentage: number;
    submittedAt: string;
  } | null;
  reviewMode?: boolean;
}

export default function ActivitiesClient({ activities }: { activities: ClassActivity[] }) {
  const [tab, setTab] = useState<'Upcoming' | 'Past' | 'All'>('Upcoming');
  const [activeQuiz, setActiveQuiz] = useState<ClassActivity | null>(null);

  const now = new Date();

  // If a student is taking a quiz, render the QuizTaker view
  if (activeQuiz) {
    return (
      <QuizTaker
        activityId={activeQuiz.id}
        title={activeQuiz.title}
        subject={activeQuiz.subject}
        timeLimitMinutes={activeQuiz.time_limit_minutes || 15}
        questions={activeQuiz.questions}
        reviewMode={activeQuiz.reviewMode}
        onQuizFinished={() => {
          setActiveQuiz(null);
          window.location.reload(); // Refresh scores & state
        }}
        onCancel={() => setActiveQuiz(null)}
      />
    );
  }

  // Filter logic:
  // - Upcoming: Standard activities in the future, OR quizzes that have NOT been taken yet.
  // - Past: Standard activities in the past, OR quizzes that have ALREADY been taken.
  const filtered = activities.filter(a => {
    if (tab === 'All') return true;

    if (a.activity_type === 'quiz') {
      const hasTaken = !!a.attempt;
      if (tab === 'Upcoming') return !hasTaken;
      if (tab === 'Past') return hasTaken;
    }

    // Standard classwork filtering by date
    const aDate = new Date(a.date);
    if (tab === 'Upcoming') return aDate >= now;
    if (tab === 'Past') return aDate < now;
    return true;
  });

  // Sort by date (Upcoming: closest first, Past: most recent first)
  filtered.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return tab === 'Upcoming' ? da - db : db - da;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {['Upcoming', 'Past', 'All'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            style={{
              padding: '0.5rem 1rem',
              background: tab === t ? 'var(--color-surface, rgba(0,0,0,0.02))' : 'transparent',
              color: tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              fontWeight: tab === t ? 600 : 500,
              cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
            }}
          >
            {t === 'Upcoming' ? 'Active / Assigned' : t}
          </button>
        ))}
      </div>

      {/* Grid List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filtered.map(act => {
          const hasAttempt = !!act.attempt;
          const attemptData = act.attempt;

          return (
            <div
              key={act.id}
              className="glass-panel"
              style={{
                padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex',
                flexDirection: 'column', gap: '0.75rem', backgroundColor: '#fff',
                border: '1px solid var(--color-border)', position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text)', margin: 0, fontWeight: 700 }}>
                  {act.title}
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px', color: 'var(--color-secondary)' }}>
                  {act.subject}
                </span>
              </div>
              
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>📅</span> {new Date(act.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, flex: 1, lineHeight: 1.5 }}>
                {act.description}
              </p>
              
              {/* Score display for taken quizzes */}
              {act.activity_type === 'quiz' && hasAttempt && attemptData && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#065f46' }}>✓ Quiz Completed</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                    Score: {attemptData.score} / {attemptData.maxScore} ({attemptData.percentage}%)
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {act.activity_type === 'quiz' ? (
                  !hasAttempt ? (
                    <button
                      onClick={() => setActiveQuiz(act)}
                      className="btn btn-primary"
                      style={{ width: '100%', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                      📝 Start Auto-Marked Quiz ({act.time_limit_minutes || 15}m)
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveQuiz({ ...act, reviewMode: true })}
                      className="btn btn-secondary"
                      style={{ width: '100%', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                      🔍 Review Submitted Answers
                    </button>
                  )
                ) : (
                  act.attachment_url && (
                    <a
                      href={act.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ textDecoration: 'none', width: '100%', textAlign: 'center', fontWeight: 600 }}
                    >
                      📎 Download Attachment
                    </a>
                  )
                )}
              </div>
            </div>
          );
        })}
        
        {filtered.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', gridColumn: '1 / -1' }}>
            No {tab.toLowerCase()} activities or quizzes found.
          </div>
        )}
      </div>
    </div>
  );
}
