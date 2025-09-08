import { ImageResponse } from 'next/og'

// PWA Icon 512x512
export const runtime = 'edge'
export const contentType = 'image/png'
export const size = {
  width: 512,
  height: 512,
}

export default function Icon512() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
        }}
      >
        <svg
          width="380"
          height="380"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 6 L23.5 15 L33 15 L25.5 21 L29 30 L20 24 L11 30 L14.5 21 L7 15 L16.5 15 Z"
            fill="white"
          />
          <circle cx="30" cy="10" r="1.5" fill="white" opacity="0.9" />
          <circle cx="32" cy="13" r="1" fill="white" opacity="0.9" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}