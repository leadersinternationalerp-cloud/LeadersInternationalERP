'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Activity {
  id: string
  subject: string
  gradeLevel: string
  topic: string
  description: string
  created_at: string
}

export default function TeacherClassActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      subject: 'Social Studies',
      gradeLevel: 'Grade 1',
      topic: 'Zanzibar Spice Trade History',
      description: 'Explore the historical trade route of cloves and cinnamon. Create a drawing of a traditional Zanzibari Dhow boat loaded with spices.',
      created_at: new Date().toISOString()
    }
  ])

  const [subject, setSubject] = useState('Mathematics')
  const [gradeLevel, setGradeLevel] = useState('Grade 1')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Mock AI Generator
  const handleAIGenerator = () => {
    if (!topic) {
      alert('Please fill in the Topic first, so the AI can suggest a contextual activity!')
      return
    }

    setIsGenerating(true)
    
    // Simulate AI model latency
    setTimeout(() => {
      let aiDescription = ''
      
      if (subject === 'Mathematics') {
        aiDescription = `AI SUGGESTION: "Market Day in Stone Town"
Have students calculate total costs of local Zanzibar fruits (mangoes, coconuts, bananas) based on custom prices. 
Activity: Students role-play as Darajani market vendors and buyers, calculating change up to 10,000 TZS.`
      } else if (subject === 'Kiswahili') {
        aiDescription = `AI SUGGESTION: "Zanzibari Swahili Sayings & Art"
Introduce students to traditional Swahili idioms (methali) printed on Kanga clothes.
Activity: Write a short story illustrating the meaning of the methali: "Subira kwanza huleta baraka" (Patience brings blessings).`
      } else if (subject === 'Science') {
        aiDescription = `AI SUGGESTION: "Indian Ocean Coral Reef Ecosystems"
Study the marine life along the Nungwi coast.
Activity: Draw a food web diagram connecting marine algae, reef fish, sea turtles, and dolphins. Label each organism's ecological role.`
      } else {
        aiDescription = `AI SUGGESTION: "Custom Zanzibar Activity"
Topic: ${topic}
Activity: Research this topic and present a 3-minute oral report to the class using local Zanzibar historical or cultural examples.`
      }

      setDescription(aiDescription)
      setIsGenerating(false)
    }, 1500)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic || !description) return

    const newActivity: Activity = {
      id: (activities.length + 1).toString(),
      subject,
      gradeLevel,
      topic,
      description,
      created_at: new Date().toISOString()
    }

    setActivities([newActivity, ...activities])
    setTopic('')
    setDescription('')
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Class Activities Management
        </h1>
        <Link href="/dashboard/teacher" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Create Activity Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Create Class Activity</h2>
          
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="input-field" required>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English Language">English Language</option>
                  <option value="Science">Science</option>
                  <option value="Kiswahili">Kiswahili</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Grade</label>
                <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className="input-field" required>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Activity Topic</label>
              <input 
                type="text" 
                value={topic} 
                onChange={e => setTopic(e.target.value)} 
                placeholder="e.g. Stone Town Architecture or Counting Fruit..." 
                className="input-field" 
                required 
              />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Activity Description</label>
                <button
                  type="button"
                  onClick={handleAIGenerator}
                  disabled={isGenerating}
                  className="btn"
                  style={{
                    padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
                    backgroundColor: 'rgba(59, 179, 195, 0.1)', color: 'var(--color-secondary)',
                    border: '1px solid var(--color-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  {isGenerating ? 'Generating...' : '✨ Generate with AI'}
                </button>
              </div>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Write activity description or click AI helper above..." 
                className="input-field" 
                style={{ minHeight: '120px', resize: 'vertical' }}
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Publish Class Activity
            </button>
          </form>
        </div>

        {/* Activities List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Published Class Activities ({activities.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
            {activities.map((act) => (
              <div key={act.id} style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 600 }}>{act.topic}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Subject: {act.subject} • {act.gradeLevel}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {new Date(act.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {act.description}
                </p>
              </div>
            ))}

            {activities.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
                No class activities published yet.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
