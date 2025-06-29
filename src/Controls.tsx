import React from 'react'

interface ControlsProps {
  onPercentageChange: (percentage: number) => void
}

const percentages = [
  { label: 'Closed', value: 0 },
  { label: '30%', value: 0.3 },
  { label: '60%', value: 0.6 },
  { label: '90%', value: 0.9 }
]

export function Controls({ onPercentageChange }: ControlsProps) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 bg-black/50 p-1.5 rounded-full">
      {percentages.map(({ label, value }) => (
        <button
          key={label}
          onClick={() => onPercentageChange(value)}
          className="bg-white/90 text-stone-800 py-1 px-3 text-sm rounded-full cursor-pointer font-sans font-bold shadow-md hover:bg-white transition-colors">
          {label}
        </button>
      ))}
    </div>
  )
} 