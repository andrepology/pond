import React from 'react'
import '@silk-hq/components/layered-styles'
import { Sheet as SilkSheet, createComponentId } from '@silk-hq/components'

const POND_SHEET_ID = createComponentId()

interface SheetProps {
  sheetPercentage: number
}

export function Sheet({ sheetPercentage }: SheetProps) {
  const detentPercents = [0.3, 0.6, 0.9]
  const detents = ["30%", "60%", "90%"]

  // Persistent sheet: always presented, we only step detents
  const isPresented = true

  let activeDetentIndex = 1
  if (isPresented) {
    // Map to nearest detent index deterministically
    let bestIndex = 0
    let bestDistance = Infinity
    for (let i = 0; i < detentPercents.length; i++) {
      const d = Math.abs(sheetPercentage - detentPercents[i])
      if (d < bestDistance) {
        bestDistance = d
        bestIndex = i
      }
    }
    activeDetentIndex = bestIndex
  }

  return (
    <SilkSheet.Root
      license="non-commercial"
      componentId={POND_SHEET_ID}
      presented={isPresented}
      activeDetent={activeDetentIndex}
      onPresentedChange={() => {}}
      onActiveDetentChange={() => {}}
    >
      <SilkSheet.Portal>
        <SilkSheet.View
          forComponent={POND_SHEET_ID}
          contentPlacement="bottom"
          tracks="bottom"
          detents={detents}
          swipeDismissal={false}
          swipeOvershoot={false}
          swipeTrap
        >
          {/* No fade behind the sheet */}
          <SilkSheet.Backdrop className="pointer-events-none" />
          <SilkSheet.Content className="w-full max-w-[600px] mx-auto bg-white text-stone-800 font-sans border-t border-black/10 rounded-t-xl z-[1001] pointer-events-auto">
            <SilkSheet.Handle className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2" />
            <div className="p-4 text-2xl flex items-center justify-center">Sheet Content</div>
          </SilkSheet.Content>
        </SilkSheet.View>
      </SilkSheet.Portal>
    </SilkSheet.Root>
  )
}