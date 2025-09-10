import React from 'react'
import '@silk-hq/components/layered-styles'
import { Sheet as SilkSheet } from '@silk-hq/components'

interface SheetProps {
  sheetPercentage: number
}

export function Sheet({ sheetPercentage }: SheetProps) {
  return (
    <SilkSheet.Root license="non-commercial" defaultPresented defaultActiveDetent={0}>
      <SilkSheet.View contentPlacement="bottom" tracks="bottom" detents={["60%"]}>
        <SilkSheet.Backdrop className="bg-black/20" />
        <SilkSheet.Content className="w-full max-w-[600px] mx-auto bg-stone-50/80 backdrop-blur-md border-t border-black/10 rounded-t-xl text-stone-800 font-sans">
          <SilkSheet.Handle className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2" />
          {sheetPercentage > 0.05 && (
            <div className="p-4 text-2xl flex items-center justify-center">Sheet Content</div>
          )}
        </SilkSheet.Content>
      </SilkSheet.View>
    </SilkSheet.Root>
  )
}