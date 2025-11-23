import { FieldNote } from '../../schema'
import { formatDate } from './utils'

export const FieldNotesView = ({ fieldNotes }: { fieldNotes: FieldNote[] }) => {
  const sorted = [...fieldNotes].sort((a, b) => b.createdAt - a.createdAt)

  if (sorted.length === 0) {
    return (
      <div style={{ color: '#8B7355', fontSize: 14, opacity: 0.6 }}>
        No field notes yet
      </div>
    )
  }

  return (
    <>
      {sorted.map((note, idx) => (
        <div
          key={idx}
          style={{
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 4 }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '9px',
                backgroundColor: '#8B7B7A',
                marginRight: '8px',
                marginTop: '2px',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>
                  Innio
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  {formatDate(note.createdAt)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginTop: 4 }}>
                {note.content}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

