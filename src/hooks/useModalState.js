import { useState } from 'react'

export function useModalState() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setSaving(false)
    setError('')
  }

  return {
    saving,
    setSaving,
    error,
    setError,
    reset,
  }
}
