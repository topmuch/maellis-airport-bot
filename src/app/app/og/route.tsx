import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

/**
 * Dynamic OG Image Generator — MAELLIS Template
 * Usage: GET /api/og?title=Tableau de Bord&subtitle=Vue d'ensemble
 *
 * Renders a 1200×630 PNG with the MAELLIS brand template.
 */

export const runtime = 'edge'

const BRAND_COLORS = {
  bg: '#0B0F19',         // dark navy
  orange: '#F97316',     // MAELLIS orange
  text: '#F8FAFC',       // slate-50
  muted: '#94A3B8',      // slate-400
  accent: '#0EA5E9',     // teal/sky
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') || 'MAELLIS'
  const subtitle = searchParams.get('subtitle') || 'Aéroport Dashboard IA'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: BRAND_COLORS.bg,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient circle */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${BRAND_COLORS.orange}20 0%, transparent 70%)`,
          }}
        />
        {/* Bottom decorative bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: `linear-gradient(90deg, ${BRAND_COLORS.orange}, ${BRAND_COLORS.accent})`,
          }}
        />

        {/* MAELLIS brand mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: BRAND_COLORS.orange,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            ✈
          </div>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: BRAND_COLORS.text,
              letterSpacing: '2px',
            }}
          >
            MAELLIS
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 30 ? '52px' : '64px',
            fontWeight: 800,
            color: BRAND_COLORS.text,
            lineHeight: 1.15,
            maxWidth: '900px',
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '28px',
            color: BRAND_COLORS.muted,
            marginTop: '16px',
            fontWeight: 400,
          }}
        >
          {subtitle}
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '80px',
            fontSize: '18px',
            color: BRAND_COLORS.muted,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ color: BRAND_COLORS.orange }}>●</span>
          Système de gestion intelligente pour aéroports
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
