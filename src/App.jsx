import { useState, useEffect, useRef, useCallback } from 'react'

const GRID = 25
const CELL = 24
const W = GRID * CELL
const H = GRID * CELL
const TICK_MS = 140
const TOTAL_CELLS = GRID * GRID

const PHRASES = [
  '¡Ten un buen día! 🌞', '¡Eres increíble! ✨', '¡La vida es bella! 🌈',
  '¡Sonríe siempre! 😄', '¡Tú puedes! 💪', '¡Eres genial! 🎉',
  '¡Viva la vida! 🎊', '¡Hoy es tu día! 🌟', '¡Eres lo máximo! 🏆',
  '¡Arriba el ánimo! 🚀', '¡Qué buena onda! 😎', '¡Todo va bien! 👌',
  '¡Eres un crack! 🔥', '¡Muy bien hecho! 👏', '¡Qué buena vibra! ⚡',
  '¡Sigue adelante! 🏃', '¡Carpe Diem! ⏳', '¡Échale ganas! 💥',
  '¡Qué buen juego! 🎮', '¡Feliz día! ☀️', '¡Tú lo lograste! 🥇',
  '¡Eres una estrella! ⭐', '¡Bravo campeón! 🎖️', '¡Qué talentoso! 🎯',
  '¡Sigue así! 👍', '¡Fantástico! 🤩', '¡Woooooo! 🎆', '¡Imparable! ⚡',
  '¡Qué leyenda! 🦁', '¡Gran jugador! 🕹️', '¡Maestro del snake! 🐍',
  '¡Eres el mejor! 🌠', '¡Qué destreza! 🎪', '¡Pura genialidad! 🧠',
  '¡Tremendo crack! 💎', '¡A por más! 🚀', '¡Sin límites! ∞',
  '¡Hazlo de nuevo! 🔄', '¡Modo dios ON! ⚡', '¡Nivel legendario! 👑',
  '¡GG bien jugado! 🏅', '¡Que no pare! 🎶', '¡Fuera de serie! 🌟',
  '¡Eres el campeón! 🥇', '¡Top 1 mundial! 🌍', '¡Jugador élite! 💯',
  '¡Nada te detiene! 🔥', '¡Eres único! 💫', '¡Sigue brillando! ✨',
]

function randomPhrase(exclude) {
  const pool = exclude ? PHRASES.filter(p => p !== exclude) : PHRASES
  return pool[Math.floor(Math.random() * pool.length)]
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildCoverOrder() {
  const cells = []
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      cells.push({ x, y })
  return shuffle(cells)
}

function renderPhraseToCanvas(phrase) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const words = phrase.split(' ')
  const half = Math.ceil(words.length / 2)
  const lines = words.length > 2
    ? [words.slice(0, half).join(' '), words.slice(half).join(' ')]
    : [phrase]

  // Find font size so longest line fits in ~90% of width
  let size = Math.floor((H * 0.38) / lines.length)
  ctx.font = `bold ${size}px sans-serif`
  const maxW = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0)
  if (maxW > W * 0.92) size = Math.floor(size * W * 0.92 / maxW)
  size = Math.max(size, 18)
  ctx.font = `bold ${size}px sans-serif`

  const lineH = H / (lines.length + 1)
  ctx.fillStyle = 'rgba(80, 210, 255, 0.92)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => ctx.fillText(line, W / 2, lineH * (i + 1)))

  return canvas
}

function makeSnake() {
  const cx = Math.floor(GRID / 2)
  const cy = Math.floor(GRID / 2)
  return [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }]
}

function randomApple(snake) {
  const occ = new Set(snake.map(s => `${s.x},${s.y}`))
  let p
  do { p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) } }
  while (occ.has(`${p.x},${p.y}`))
  return p
}

function tick(state) {
  state.dir = state.nextDir
  const head = state.snake[0]
  const nx = (head.x + state.dir.x + GRID) % GRID
  const ny = (head.y + state.dir.y + GRID) % GRID

  if (state.snake.some(s => s.x === nx && s.y === ny)) {
    const s = makeSnake()
    state.snake = s
    state.apple = randomApple(s)
    state.dir = { x: 1, y: 0 }
    state.nextDir = { x: 1, y: 0 }
    return false
  }

  const ate = nx === state.apple.x && ny === state.apple.y
  state.snake = [{ x: nx, y: ny }, ...state.snake]
  if (!ate) {
    state.snake.pop()
  } else {
    state.score++
    state.revealCount = Math.floor(TOTAL_CELLS * state.score / 10)
    if (state.score >= 10) return true
    state.apple = randomApple(state.snake)
  }
  return false
}

function render(ctx, state) {
  // 1. Dark background
  ctx.fillStyle = '#0d0d1a'
  ctx.fillRect(0, 0, W, H)

  // 2. Phrase text (always drawn, revealed by removing cover blocks)
  if (state.phraseCanvas) ctx.drawImage(state.phraseCanvas, 0, 0)

  // 3. Cover blocks hiding unrevealed parts of the phrase
  ctx.fillStyle = '#0d0d1a'
  for (let i = state.revealCount; i < TOTAL_CELLS; i++) {
    const c = state.coverOrder[i]
    ctx.fillRect(c.x * CELL, c.y * CELL, CELL, CELL)
  }

  // 4. Grid lines (subtle, so phrase shines through)
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= GRID; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke()
  }
  for (let y = 0; y <= GRID; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke()
  }

  // 5. Apple
  const ax = state.apple.x * CELL + CELL / 2
  const ay = state.apple.y * CELL + CELL / 2
  ctx.fillStyle = '#ff4757'
  ctx.beginPath(); ctx.arc(ax, ay, CELL / 2 - 2, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#4a9'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(ax, ay - CELL / 2 + 3); ctx.lineTo(ax + 3, ay - CELL / 2 - 2); ctx.stroke()

  // 6. Snake
  state.snake.forEach((seg, i) => {
    const ratio = 1 - i / state.snake.length
    ctx.fillStyle = `hsl(${128 + i * 2}, 75%, ${35 + ratio * 22}%)`
    const pad = 2
    ctx.fillRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2)
    if (i === 0) {
      ctx.fillStyle = '#fff'
      const ex = seg.x * CELL + (state.dir.x === 0 ? CELL / 2 - 4 : state.dir.x > 0 ? CELL - 7 : 4)
      const ey = seg.y * CELL + (state.dir.y === 0 ? CELL / 2 - 4 : state.dir.y > 0 ? CELL - 7 : 4)
      ctx.fillRect(ex, ey, 4, 4)
      ctx.fillRect(ex + (state.dir.x === 0 ? 7 : 0), ey + (state.dir.y === 0 ? 7 : 0), 4, 4)
    }
  })

  // 7. HUD
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = 'bold 15px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`🍎 ${state.score} / 10`, 8, 22)
}

export default function App() {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickRef = useRef(0)
  const [won, setWon] = useState(false)
  const [winPhrase, setWinPhrase] = useState('')
  const [phrase, setPhrase] = useState(() => randomPhrase())

  const initGame = useCallback((p) => {
    const snake = makeSnake()
    stateRef.current = {
      snake,
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      apple: randomApple(snake),
      score: 0,
      revealCount: 0,
      coverOrder: buildCoverOrder(),
      phraseCanvas: renderPhraseToCanvas(p),
      phrase: p,
    }
    setWon(false)
  }, [])

  useEffect(() => { initGame(phrase) }, []) // eslint-disable-line

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function loop(ts) {
      const s = stateRef.current
      if (s && !won && ts - lastTickRef.current > TICK_MS) {
        lastTickRef.current = ts
        if (tick(s)) {
          render(ctx, { ...s, score: 10, revealCount: TOTAL_CELLS })
          setWon(true)
          setWinPhrase(s.phrase)
          return
        }
      }
      if (s) render(ctx, s)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, []) // eslint-disable-line

  // Keyboard
  useEffect(() => {
    const DIRS = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
      a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
    }
    function onKey(e) {
      const d = DIRS[e.key]
      if (!d || !stateRef.current) return
      const cur = stateRef.current.dir
      if (d.x === -cur.x && d.y === -cur.y) return
      stateRef.current.nextDir = d
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Touch swipe
  useEffect(() => {
    let tx = 0, ty = 0
    function onStart(e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY }
    function onEnd(e) {
      if (!stateRef.current) return
      const dx = e.changedTouches[0].clientX - tx
      const dy = e.changedTouches[0].clientY - ty
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      const cur = stateRef.current.dir
      const d = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 })
        : (dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 })
      if (d.x === -cur.x && d.y === -cur.y) return
      stateRef.current.nextDir = d
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [])

  function restart() {
    const next = randomPhrase(phrase)
    setPhrase(next)
    cancelAnimationFrame(rafRef.current)
    initGame(next)
    lastTickRef.current = 0

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function loop(ts) {
      const s = stateRef.current
      if (s && ts - lastTickRef.current > TICK_MS) {
        lastTickRef.current = ts
        if (tick(s)) {
          render(ctx, { ...s, score: 10, revealCount: TOTAL_CELLS })
          setWon(true)
          setWinPhrase(s.phrase)
          return
        }
      }
      if (s) render(ctx, s)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function setDir(d) {
    if (!stateRef.current) return
    const cur = stateRef.current.dir
    if (d.x === -cur.x && d.y === -cur.y) return
    stateRef.current.nextDir = d
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#08080f', fontFamily: 'sans-serif', padding: 12, boxSizing: 'border-box' }}>
      <h2 style={{ color: '#eee', margin: '0 0 4px', fontSize: 18 }}>🐍 Snake</h2>
      <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontSize: 11 }}>
        Flechas / WASD / desliza · come 10 🍎 para descubrir el mensaje
      </p>

      <div style={{ position: 'relative', width: '100%', maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8, border: '1px solid rgba(80,200,255,0.15)' }}
        />

        {won && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 8, padding: 24, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <p style={{ fontSize: 15, color: '#adf', textAlign: 'center', marginBottom: 4 }}>¡Completaste el mensaje!</p>
            <p style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 28, lineHeight: 1.4 }}>{winPhrase}</p>
            <button
              onClick={restart}
              style={{ padding: '12px 36px', fontSize: 17, fontWeight: 'bold', background: '#ff4757', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              🔄 Jugar de nuevo
            </button>
          </div>
        )}
      </div>

      {/* Mobile D-pad */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 50px)', gridTemplateRows: 'repeat(3, 50px)', gap: 4 }}>
        {[
          [null, { x: 0, y: -1 }, null],
          [{ x: -1, y: 0 }, null, { x: 1, y: 0 }],
          [null, { x: 0, y: 1 }, null],
        ].flat().map((d, i) => (
          d ? (
            <button
              key={i}
              onPointerDown={e => { e.preventDefault(); setDir(d) }}
              style={{ width: 50, height: 50, background: 'rgba(80,200,255,0.12)', border: '1px solid rgba(80,200,255,0.25)', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}
            >
              {d.y === -1 ? '▲' : d.y === 1 ? '▼' : d.x === -1 ? '◀' : '▶'}
            </button>
          ) : <div key={i} />
        ))}
      </div>
    </div>
  )
}
