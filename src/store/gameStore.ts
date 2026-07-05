// Update default settings:
settings: loadFromStorage('domino_settings', {
  soundEnabled: true,
  musicEnabled: true,
  difficulty: 'medium' as Difficulty,
  showHints: false,
  gameMode: 'classic' as const,
  targetScore: 100,
  timerMode: 'off' as TimerMode,
  customTime: 120,
  aiCount: 1, // NEW: Default to 1 AI opponent
}),
