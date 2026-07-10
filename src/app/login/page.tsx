import Image from 'next/image'
import { LoginForm } from './LoginForm'

export const metadata = {
  title: 'Sign In | Leaders International School',
  description: 'Login to the ERP System',
}

export default function LoginPage() {
  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <div className="auth-logo">
          {/* Use standard img tag here if next/image gives trouble without height/width layout, 
              but next/image is fine with width and height */}
          <Image 
            src="/logo.png" 
            alt="Leaders International School Logo" 
            width={120} 
            height={120} 
            priority 
          />
        </div>
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>
        
        <LoginForm />
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          <p>&copy; {new Date().getFullYear()} Leaders International School.</p>
        </div>
      </div>
    </div>
  )
}
