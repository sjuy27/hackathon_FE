import { useSyncExternalStore } from 'react'

const VOICE_KEY = 'golmok-host-read-questions'
const LARGE_TEXT_KEY = 'golmok-host-large-text'
const CHANGE_EVENT = 'golmok-host-preferences-change'

function readPreference(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value === null ? fallback : value === 'true'
  } catch { return fallback }
}
function subscribe(listener) {
  window.addEventListener('storage', listener)
  window.addEventListener(CHANGE_EVENT, listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener(CHANGE_EVENT, listener)
  }
}
function savePreference(key, value) {
  try { localStorage.setItem(key, String(value)) } catch { return }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
const readVoice = () => readPreference(VOICE_KEY, true)
const readLargeText = () => readPreference(LARGE_TEXT_KEY, false)

export default function useHostPreferences() {
  const readQuestions = useSyncExternalStore(subscribe, readVoice, () => true)
  const largeText = useSyncExternalStore(subscribe, readLargeText, () => false)
  return {
    readQuestions,
    largeText,
    setReadQuestions: value => savePreference(VOICE_KEY, value),
    setLargeText: value => savePreference(LARGE_TEXT_KEY, value),
  }
}
