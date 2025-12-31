import { FieldNote } from '../../schema'
import { formatDate } from './utils'
import { glass, text } from './theme'

export const FieldNotesView = ({ fieldNotes }: { fieldNotes: FieldNote[] }) => {
  const sorted = [...fieldNotes].sort((a, b) => b.createdAt - a.createdAt)

  if (sorted.length === 0) {
    return (
      <div style={{ color: text.tertiary, fontSize: 14 }}>
        no field notes yet
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
    </>
  )
}

