import React from 'react'

interface ControlsProps {
  onPercentageChange: (detentIndex: number) => void
}

const detents = [
  { label: '15%', value: 0 },
  { label: '45%', value: 1 },
  { label: '85%', value: 2 }
]

export function Controls({ onPercentageChange }: ControlsProps) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 bg-black/5 p-1 rounded-full">
      {detents.map(({ label, value }) => (
        <button
          key={label}
          onClick={() => onPercentageChange(value)}
          className="bg-white/95 text-stone-800/60 py-1 px-3 text-sm rounded-full cursor-pointer font-sans font-bold shadow-xl hover:bg-white transition-colors">
          {label}
        </button>
      ))}
    </div>
  )
} 