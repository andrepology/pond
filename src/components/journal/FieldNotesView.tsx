import { useState, useEffect } from 'react'
import { FieldNote } from '../../schema'
import { formatDate } from './utils'
import { glass, text } from './theme'

const CYCLED_ITEMS = [
  { text: 'meditation', icon: '◎' },
  { text: 'reflection', icon: '≈' },
  { text: 'intention setting', icon: '⚘' },
]

const CyclingText = () => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % CYCLED_ITEMS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span style={{ 
      display: 'inline-grid', 
      verticalAlign: 'text-bottom', 
      width: 'auto',
      textAlign: 'center',
      justifyItems: 'center',
    }}>
      {CYCLED_ITEMS.map((item, i) => (
        <span
          key={i}
          style={{
            gridArea: '1/1',
            opacity: i === index ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
            whiteSpace: 'nowrap',
            pointerEvents: i === index ? 'auto' : 'none',
          }}
        >
          <span style={{ color: text.primary }}>{item.text}</span>{' '}
          <span style={{ color: text.primary }}>{item.icon}</span>
        </span>
      ))}
      {/* Invisible spacer to set width to max content */}
      <span style={{ gridArea: '1/1', opacity: 0, pointerEvents: 'none', whiteSpace: 'nowrap', visibility: 'hidden' }}>
         <span style={{ color: text.primary }}>intention setting</span> <span style={{ color: text.primary }}>⚘</span>
      </span>
    </span>
  )
}

export const FieldNotesView = ({ fieldNotes }: { fieldNotes: FieldNote[] }) => {
  const sorted = [...fieldNotes].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div style={{ paddingBottom: 40 }}>
      {sorted.length === 0 ? (
        <div 
          style={{ 
            fontFamily: 'AlteHaasGroteskBold, sans-serif',
            lineHeight: '1.3',
            color: text.tertiary,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            fontSize: 21,
            letterSpacing: '-0.01em',
            textAlign: 'center',
            padding: '60px 0',
            maxWidth: '280px',
            margin: '0 auto',
          }}
        >
          this is innio's <span style={{ color: text.primary }}>field notes</span> <span style={{ color: text.primary }}>✐</span>, where he will log your shared <span style={{ color: text.primary }}>practices</span> <span style={{ color: text.primary }}>∞</span>.
          <br />
          <br />
          <br />
          <br />
          ask innio:
          <br />
          <br />
          guide me through
          <br />
          <CyclingText />
        </div>
      ) : (
        <>
          {sorted.map((note, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: text.tertiary }}>
                      Innio
                    </div>
                    <div style={{ fontSize: 11, color: text.tertiary }}>
                      {formatDate(note.createdAt)}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'white', lineHeight: 1.5, marginTop: 4 }}>
                    {note.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div 
            style={{ 
              fontFamily: 'AlteHaasGroteskBold, sans-serif',
              fontSize: 13,
              color: text.tertiary,
              textAlign: 'center',
              padding: '40px 0 0',
              opacity: 0.8,
              letterSpacing: '0.02em'
            }}
          >
            <span style={{ color: text.primary }}>observations</span> <span style={{ color: text.primary }}>✐</span> shared by <span style={{ color: text.primary }}>Innio</span> <span style={{ color: text.primary }}>♓︎</span>
          </div>
        </>
      )}
    </div>
  )
}
