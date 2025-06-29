import React from 'react'

interface SheetProps {
  sheetPercentage: number
}

export function Sheet({ sheetPercentage }: SheetProps) {
  return (
    <div
      className="absolute bottom-0 left-0 w-full bg-stone-200/80 backdrop-blur-md border-t border-black/10 transition-all duration-300 ease-in-out flex items-center justify-center text-stone-800 text-2xl font-sans"
      style={{ height: `${sheetPercentage * 100}%` }}>
      {sheetPercentage > 0.05 && <div>Sheet Content</div>}
    </div>
  )
} 