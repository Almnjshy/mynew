import { useState, useCallback } from 'react'
import { AlertTriangle, LogOut, X } from 'lucide-react'
import { soundEngine } from '@/lib/soundEngine'

interface ExitConfirmationProps {
  isVisible: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ExitConfirmation({
  isVisible,
  title = 'الخروج من اللعبة',
  message = 'هل تريد الخروج؟ سيتم فقدان التقدم الحالي.',
  confirmText = 'خروج',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
}: ExitConfirmationProps) {
  if (!isVisible) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 flex flex-col items-center gap-4 animate-slide-down">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertTriangle size={32} className="text-red-400" />
        </div>

        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-white/70 text-center text-sm">{message}</p>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => { soundEngine.playClick(); onCancel(); }}
            className="flex-1 game-btn game-btn-secondary gap-2"
          >
            <X size={18} /> {cancelText}
          </button>
          <button
            onClick={() => { soundEngine.playClick(); onConfirm(); }}
            className="flex-1 game-btn bg-red-600 hover:bg-red-700 gap-2"
          >
            <LogOut size={18} /> {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook for exit confirmation in any screen
 */
export function useExitConfirmation() {
  const [showConfirm, setShowConfirm] = useState(false)

  const showExit = useCallback(() => {
    setShowConfirm(true)
  }, [])

  const hideExit = useCallback(() => {
    setShowConfirm(false)
  }, [])

  const confirmExit = useCallback((onConfirm: () => void) => {
    setShowConfirm(false)
    onConfirm()
  }, [])

  return {
    showConfirm,
    showExit,
    hideExit,
    confirmExit,
  }
}
