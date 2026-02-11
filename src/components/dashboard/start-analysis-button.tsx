'use client'

import { toaster } from '@/components/ui/toaster'
import { Button } from '@chakra-ui/react'

interface Props {
  disabled: boolean
}

export function StartAnalysisButton({ disabled }: Props) {
  return (
    <Button
      colorPalette="blue"
      width="full"
      size="lg"
      disabled={disabled}
      onClick={() => toaster.info({ title: 'Coming soon', description: 'Analysis will be available in Phase 2.' })}
    >
      Start analysis
    </Button>
  )
}
