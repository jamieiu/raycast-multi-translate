import React from 'react'
import { getPreferenceValues, getSelectedText } from '@raycast/api'
import type { TranslatePreferences } from './types'
import type { LanguageCode } from './languages'

export function usePreferences() {
  return React.useMemo(() => getPreferenceValues<TranslatePreferences>(), [])
}

export function useTargetLanguages() {
  return React.useMemo(() => {
    const pref = getPreferenceValues<TranslatePreferences>()
    const langs = Object.entries(pref)
      .filter(([key]) => key.startsWith('lang'))
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .map(([_, value]) => value)
      .filter(i => i && i !== 'none' && i !== 'auto')
    return Array.from(new Set(langs)) as LanguageCode[]
  }, [])
}

export function useSystemSelection() {
  const [text, setText] = React.useState('')
  const preferences = usePreferences()

  if (preferences.getSystemSelection) {
    React.useEffect(() => {
      getSelectedText()
        .then((cbText) => {
          setText((cbText ?? '').trim())
        })
        .catch(() => {})
    }, [])
  }

  return [text, setText] as const
}

export function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
