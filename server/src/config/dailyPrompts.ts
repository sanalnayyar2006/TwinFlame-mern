// Moved from client/src/pages/DailyTaskPage.tsx so both partners always get the same prompt
export const DAILY_PROMPTS = [
  'What is one thing you appreciate about your partner today?',
  'What was a small moment this week that made you smile thinking of them?',
  "What is a dream you'd love for both of you to experience together this year?",
  'What is something your partner did recently that made you feel cared for?'
]

// Same date always gives the same prompt, and consecutive days never repeat
export const promptForDate = (date: string): string => {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)
  return DAILY_PROMPTS[dayNumber % DAILY_PROMPTS.length]
}
