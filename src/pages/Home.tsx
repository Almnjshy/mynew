import { useGameStore } from '@/store/gameStore'

export default function Home() {
  const { setScreen } = useGameStore()

  return (
    <div className="screen-container title-bg">
      <div className="flex flex-col items-center gap-8">
        <img src="/assets/trophy.png" alt="Trophy" className="trophy-img" />
        <h1 className="text-5xl font-bold gold-accent">DOMINO</h1>
        <button onClick={() => setScreen('menu')} className="game-btn game-btn-primary px-12 py-4 text-xl">
          ابدأ
        </button>
      </div>
    </div>
  )
}