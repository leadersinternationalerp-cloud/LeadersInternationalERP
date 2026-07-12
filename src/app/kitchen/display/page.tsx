import { createClient } from '@/utils/supabase/server'
import './kitchen-display.css' // We'll add some global styles for the kiosk

export const revalidate = 0 // Never cache this page, always fetch live data for the LED

export default async function KitchenDisplayPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('kitchen_display_items')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true })

  const menus = (items || []).filter(i => i.display_type === 'MENU')
  const queues = (items || []).filter(i => i.display_type === 'QUEUE')
  const announcements = (items || []).filter(i => i.display_type === 'ANNOUNCEMENT')

  return (
    <div className="kiosk-container">
      <header className="kiosk-header">
        <h1>Leaders International KITCHEN LED</h1>
        <div className="time-display">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      </header>

      <div className="kiosk-grid">
        {/* Main Menu Panel */}
        <section className="panel primary-panel">
          <h2>🍽️ Today's Menu</h2>
          <div className="menu-content">
            {menus.length > 0 ? (
              menus.map(m => (
                <div key={m.id} className="menu-item">
                  {m.content}
                </div>
              ))
            ) : (
              <div className="empty-state">Menu not yet published.</div>
            )}
          </div>
        </section>

        {/* Side Panels */}
        <div className="side-panels">
          
          <section className="panel queue-panel">
            <h2>⏳ Serving Now</h2>
            <div className="queue-content">
              {queues.length > 0 ? (
                queues.map(q => (
                  <div key={q.id} className="queue-item highlight-pulse">
                    {q.content}
                  </div>
                ))
              ) : (
                <div className="empty-state">All queues clear.</div>
              )}
            </div>
          </section>

          <section className="panel announcement-panel">
            <h2>📢 Announcements</h2>
            <div className="announcement-content">
              {announcements.length > 0 ? (
                announcements.map(a => (
                  <div key={a.id} className="announcement-item">
                    {a.content}
                  </div>
                ))
              ) : (
                <div className="empty-state">No announcements.</div>
              )}
            </div>
          </section>

        </div>
      </div>
      
      {/* Auto refresh script for the kiosk (Meta refresh or simple JS) */}
      <script dangerouslySetInnerHTML={{
        __html: `
          setTimeout(() => {
            window.location.reload();
          }, 30000); // Reload every 30 seconds
        `
      }} />
    </div>
  )
}
