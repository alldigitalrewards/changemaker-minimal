import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Changemaker - Transform Ideas into Impact'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(251, 146, 60, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(234, 88, 12, 0.1) 0%, transparent 50%)',
          }}
        />
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <svg
            width="80"
            height="80"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
            <path
              d="M20 6 L23.5 15 L33 15 L25.5 21 L29 30 L20 24 L11 30 L14.5 21 L7 15 L16.5 15 Z"
              fill="url(#grad)"
            />
            <circle cx="30" cy="10" r="1.5" fill="#fb923c" />
            <circle cx="32" cy="13" r="1" fill="#fb923c" />
          </svg>
        </div>
        
        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 20,
          }}
        >
          Changemaker
        </div>
        
        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: '#111827',
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          Transform Ideas into Impact
        </div>
        
        {/* Description */}
        <div
          style={{
            fontSize: 24,
            color: '#6b7280',
            textAlign: 'center',
            maxWidth: 800,
            marginTop: 20,
          }}
        >
          Join meaningful challenges that drive positive change in your community
        </div>
        
        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: 60,
            marginTop: 60,
            fontSize: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#ea580c' }}>500+</div>
            <div style={{ color: '#6b7280' }}>Active Challenges</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#ea580c' }}>10K+</div>
            <div style={{ color: '#6b7280' }}>Changemakers</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#ea580c' }}>85%</div>
            <div style={{ color: '#6b7280' }}>Success Rate</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}