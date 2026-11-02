export const PRESET_MOODS = [
  { label: 'Calm', color: '#60a5fa' },
  { label: 'Happy', color: '#4ade80' },
  { label: 'Loved', color: '#d4637f' },
  { label: 'Energetic', color: '#e07a5f' },
  { label: 'Tired', color: '#a78bfa' }
]

// Custom moods are stored as "Label||#rrggbb"
export const isCustomMood = (mood: string | null): mood is string => !!mood && mood.includes('||')

export const describeMood = (mood: string) => {
  if (isCustomMood(mood)) {
    const [label, color] = mood.split('||')
    return { label, color }
  }
  return { label: mood, color: PRESET_MOODS.find(m => m.label === mood)?.color ?? '#d4637f' }
}
