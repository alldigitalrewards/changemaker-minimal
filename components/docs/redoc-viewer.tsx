"use client"

import { useEffect, useState } from 'react'

type RedocViewerProps = {
  /**
   * Location of the OpenAPI document relative to the site origin.
   */
  specUrl: string
  /**
   * Optional title rendered above the Redoc canvas.
   */
  title?: string
}

const REDOC_CDN = 'https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js'

export function RedocViewer({ specUrl, title }: RedocViewerProps) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${REDOC_CDN}"]`)

    function initRedoc() {
      const Redoc = (window as any).Redoc
      if (!Redoc || cancelled) return
      const container = document.getElementById('redoc-container')
      if (!container) return
      container.innerHTML = ''
      Redoc.init(
        specUrl,
        {
          hideDownloadButton: false,
          scrollYOffset: 64,
          theme: {
            colors: {
              primary: { main: '#1f2937' },
            },
          },
        },
        document.getElementById('redoc-container'),
        (redocError: unknown) => {
          if (redocError && !cancelled) {
            console.error('Redoc initialization error:', redocError)
            setError('Unable to render the API documentation. Please refresh and try again.')
          }
        }
      )
    }

    if (existing) {
      if ((window as any).Redoc) {
        initRedoc()
      } else {
        existing.addEventListener('load', initRedoc, { once: true })
      }
    } else {
      const script = document.createElement('script')
      script.src = REDOC_CDN
      script.async = true
      script.onload = initRedoc
      script.onerror = () => {
        console.error('Failed to load Redoc from CDN.')
        if (!cancelled) {
          setError('Failed to load the Redoc viewer.')
        }
      }
      document.body.appendChild(script)
    }

    return () => {
      cancelled = true
    }
  }, [specUrl])

  return (
    <div className="space-y-6 pb-12">
      {title ? (
        <header className="pt-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The reference below is generated from the latest OpenAPI specification committed to the repo.
          </p>
        </header>
      ) : null}
      {error ? (
        <div className="rounded border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <div id="redoc-container" className="min-h-[60vh] rounded border bg-background shadow-sm" />
    </div>
  )
}

export default RedocViewer
