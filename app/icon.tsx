import { ImageResponse } from 'next/og'

// App icon
export const runtime = 'edge'
export const contentType = 'image/png'
export const size = {
  width: 32,
  height: 32,
}

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          <path
            d="M20 6 L23.5 15 L33 15 L25.5 21 L29 30 L20 24 L11 30 L14.5 21 L7 15 L16.5 15 Z"
            fill="url(#gradient)"
          />
          <circle cx="30" cy="10" r="1.5" fill="#fb923c" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}