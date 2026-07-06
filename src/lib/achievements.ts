import { Achievement, AchievementId, AchievementProgress } from '@/types/game'

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    title: 'أول فوز',
    description: 'اربح مباراة واحدة',
    icon: '🏆',
    condition: { type: 'wins', value: 1 },
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    rarity: 'common',
  },
  {
    id: 'pro_player',
    title: 'المحترف',
    description: 'اربح 10 مباريات',
    icon: '🥇',
    condition: { type: 'wins', value: 10 },
    unlockedAt: null,
    progress: 0,
    maxProgress: 10,
    rarity: 'common',
  },
  {
    id: 'legend',
    title: 'الأسطورة',
    description: 'اربح 50 مباراة',
    icon: '👑',
    condition: { type: 'wins', value: 50 },
    unlockedAt: null,
    progress: 0,
    maxProgress: 50,
    rarity: 'epic',
  },
  {
    id: 'clean_win',
    title: 'الفوز النظيف',
    description: 'اربح بدون سحب من المخزون',
    icon: '💎',
    condition: { type: 'clean_win', value: 1 },
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    rarity: 'rare',
  },
  {
    id: 'crushing_win',
    title: 'الساحق',
    description: 'اربح وفي يد الخصم 0 قطع',
    icon: '⚡',
    condition: { type: 'crushing_win', value: 1 },
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    rarity: 'rare',
  },
  {
    id: 'streak_5',
    title: 'المتسلسل',
    description: 'اربح 5 مرات متتالية',
    icon: '🔥',
    condition: { type: 'streak', value: 5 },
    unlockedAt: null,
    progress: 0,
    maxProgress: 5,
    rarity: 'epic',
  },
  {
    id: 'warrior',
    title: 'المحارب',
    description: 'العب 100 مباراة',
    icon: '⚔️',
    condition: { type: 'games_played', value: 100 },
    unlockedAt: null,
    progress: 0,
    maxProgress: 100,
    rarity: 'common',
  },
  {
    id: 'speedster',
    title: 'السريع',
    description: 'اربح في أقل من 10 حركات',
    icon: '⏱️',
    condition: { type: 'moves', value: 10 },
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    rarity: 'legendary',
  },
  {
    id: 'comeback',
    title: 'العودة',
    description: 'اربح بعد أن كنت متأخراً بـ 50 نقطة',
    icon: '🔄',
    condition: { type: 'comeback', value: 1 },
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    rarity: 'epic',
  },
  {
    id: 'draw_master',
    title: 'سيد السحب',
    description: 'اسحب 20 مرة في مباراة واحدة وافز',
    icon: '🎲',
    condition: { type: 'draws', value: 20 },
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    rarity: 'rare',
  },
]

export const getRarityColor = (rarity: string): string => {
  const colors: Record<string, string> = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#eab308',
  }
  return colors[rarity] || '#9ca3af'
}

export const getRarityBorder = (rarity: string): string => {
  const borders: Record<string, string> = {
    common: 'border-gray-500',
    rare: 'border-blue-500',
    epic: 'border-purple-500',
    legendary: 'border-yellow-500',
  }
  return borders[rarity] || 'border-gray-500'
}

export const getRarityLabel = (rarity: string): string => {
  const labels: Record<string, string> = {
    common: 'شائع',
    rare: 'نادر',
    epic: 'ملحمي',
    legendary: 'أسطوري',
  }
  return labels[rarity] || rarity
}

export const checkAchievements = (
  achievements: Achievement[],
  progress: AchievementProgress
): { updated: Achievement[]; newlyUnlocked: AchievementId[] } => {
  const updated = [...achievements]
  const newlyUnlocked: AchievementId[] = []

  for (let i = 0; i < updated.length; i++) {
    const ach = updated[i]
    if (ach.unlockedAt) continue

    let newProgress = ach.progress

    switch (ach.condition.type) {
      case 'wins':
        newProgress = Math.min(progress.totalWins, ach.maxProgress)
        break
      case 'games_played':
        newProgress = Math.min(progress.totalGames, ach.maxProgress)
        break
      case 'streak':
        newProgress = Math.min(progress.currentStreak, ach.maxProgress)
        break
      case 'clean_win':
        newProgress = Math.min(progress.cleanWins, ach.maxProgress)
        break
      case 'crushing_win':
        newProgress = Math.min(progress.crushingWins, ach.maxProgress)
        break
      case 'moves':
        newProgress = progress.fastestWinMoves > 0 && progress.fastestWinMoves <= ach.condition.value ? 1 : 0
        break
      case 'draws':
        newProgress = Math.min(progress.totalDraws, ach.maxProgress)
        break
      case 'comeback':
        newProgress = Math.min(progress.comebacks, ach.maxProgress)
        break
    }

    if (newProgress >= ach.maxProgress && !ach.unlockedAt) {
      updated[i] = { ...ach, progress: newProgress, unlockedAt: new Date().toISOString() }
      newlyUnlocked.push(ach.id as AchievementId)
    } else {
      updated[i] = { ...ach, progress: newProgress }
    }
  }

  return { updated, newlyUnlocked }
}
