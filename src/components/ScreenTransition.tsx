import { type ReactNode } from 'react'

interface Props {
  children: ReactNode
  isVisible: boolean
  direction?: 'left' | 'right' | 'up' | 'down'
}

export default function ScreenTransition({ children, isVisible, direction = 'right' }: Props) {
  const directionClass = {
    left: 'translate-x-[-100%]',
    right: 'translate-x-[100%]',
    up: 'translate-y-[-100%]',
    down: 'translate-y-[100%]',
  }

  return (
    <div 
      className={`
        absolute inset-0 w-full h-full
        transition-all duration-300 ease-in-out
        ${isVisible 
          ? 'opacity-100 translate-x-0 translate-y-0' 
          : `opacity-0 ${directionClass[direction]}`
        }
      `}
    >
      {children}
    </div>
  )
}
