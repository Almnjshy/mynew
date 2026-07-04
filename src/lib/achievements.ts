import { Achievement, AchievementId, AchievementProgress } from '@/types/achievements'

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
        if (progress.fastestWinMoves > 0 && progress.fastestWinMoves <= ach.condition.value) {
          newProgress = ach.maxProgress
        }
        break
      case 'draws':
        newProgress = Math.min(progress.totalDraws, ach.maxProgress)
        break
      case 'comeback':
        newProgress = Math.min(progress.comebacks, ach.maxProgress)
        break
    }

    if (newProgress !== ach.progress) {
      updated[i] = { ...ach, progress: newProgress }
    }

    if (newProgress >= ach.maxProgress && !ach.unlockedAt) {
      updated[i] = { ...updated[i], unlockedAt: new Date().toISOString() }
      newlyUnlocked.push(ach.id)
    }
  }

  return { updated, newlyUnlocked }
}

export const getRarityColor = (rarity: Achievement['rarity']): string => {
  switch (rarity) {
    case 'common': return 'bg-gray-500'
    case 'rare': return 'bg-blue-500'
    case 'epic': return 'bg-purple-500'
    case 'legendary': return 'bg-yellow-500'
    default: return 'bg-gray-500'
  }
}

export const getRarityBorder = (rarity: Achievement['rarity']): string => {
  switch (rarity) {
    case 'common': return 'border-gray-400'
    case 'rare': return 'border-blue-400'
    case 'epic': return 'border-purple-400'
    case 'legendary': return 'border-yellow-400'
    default: return 'border-gray-400'
  }
}

export const getRarityLabel = (rarity: Achievement['rarity']): string => {
  switch (rarity) {
    case 'common': return 'شائع'
    case 'rare': return 'نادر'
    case 'epic': return 'ملحمي'
    case 'legendary': return 'أسطوري'
    default: return ''
  }
}
