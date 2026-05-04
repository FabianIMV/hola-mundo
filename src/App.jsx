import { useState, useEffect, useRef, useCallback } from 'react'

const GRID = 25
const CELL = 24
const W = GRID * CELL
const H = GRID * CELL
const TICK_MS = 140

const PHRASES = [
  '¡Ten un buen día!', '¡Eres increíble!', '¡La vida es bella!',
  '¡Sonríe siempre!', '¡Tú puedes!', '¡Eres genial!',
  '¡Viva la vida!', '¡Hoy es tu día!', '¡Eres lo máximo!',
  '¡Arriba el ánimo!', '¡Qué buena onda!', '¡Todo va bien!',
  '¡Eres un crack!', '¡Muy bien hecho!', '¡Qué buena vibra!',
  '¡Sigue adelante!', '¡El éxito te espera!', '¡Carpe Diem!',
  '¡Échale ganas!', '¡Qué buen juego!', '¡Feliz día!',
  '¡Tú lo lograste!', '¡Eres una estrella!', '¡Bravo campeón!',
  '¡Qué talentoso!', '¡Sigue así!', '¡Fantástico!',
  '¡Woooooo!', '¡Imparable!', '¡Qué leyenda!',
  '¡Gran jugador!', '¡Maestro del snake!', '¡10 manzanas wow!',
  '¡Eres el mejor!', '¡Qué destreza!', '¡Pura genialidad!',
  '¡Tremendo crack!', '¡A por más!', '¡Sin límites!',
  '¡Hazlo de nuevo!', '¡Modo dios ON!', '¡Monstruo del game!',
  '¡Nivel legendario!', '¡GG bien jugado!', '¡Que no pare!',
  '¡Fuera de serie!', '¡Eres el campeón!', '¡Top 1 mundial!',
  '¡Jugador élite!', '¡Nada te detiene!',
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

function getTextCells(phrase) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  let size = 88
  ctx.font = `bold ${size}px sans-serif`
  while (ctx.measureText(phrase).width > W - 24 && size > 16) {
    size -= 4
    ctx.font = `bold ${size}px sans-serif`
  }
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(phrase, W / 2, H / 2)

  const imageData = ctx.getImageData(0, 0, W, H)
  const cells = []
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const px = Math.round(gx * CELL + CELL / 2)
      const py = Math.round(gy * CELL + CELL / 2)
      const idx = (py * W + px) * 4
      if (imageData.data[idx + 3] > 64) cells.push({ x: gx, y: gy })
    }
  }
  return shuffle(cells)
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
    if (state.score >= 10) return true
    state.apple = randomApple(state.snake)
  }
  return false
}

function render(ctx, state) {
  ctx.fillStyle = '#0d0d1a'
  ctx.fillRect(0, 0, W, H)

  // Revealed text cells
  const n = Math.floor(state.textCells.length * state.score / 10)
  for (let i = 0; i < n; i++) {
    const c = state.textCells[i]
    const alpha = 0.15 + 0.25 * (state.score / 10)
    ctx.fillStyle = `rgba(80,200,255,${alpha})`
    ctx.fillRect(c.x * CELL, c.y * CELL, CELL - 1, CELL - 1)
  }

  // Apple
  const ax = state.apple.x * CELL + CELL / 2
  const ay = state.apple.y * CELL + CELL / 2
  ctx.fillStyle = '#ff4757'
  ctx.beginPath()
  ctx.arc(ax, ay, CELL / 2 - 2, 0, Math.PI * 2)
  ctx.fill()
  // apple stem
  ctx.strokeStyle = '#4a9'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(ax, ay - CELL / 2 + 3)
  ctx.lineTo(ax + 3, ay - CELL / 2 - 2)
  ctx.stroke()

  // Snake
  state.snake.forEach((seg, i) => {
    const ratio = 1 - i / state.snake.length
    const hue = 130 + i * 2
    ctx.fillStyle = `hsl(${hue}, 75%, ${35 + ratio * 20}%)`
    const pad = i === 0 ? 1 : 2
    ctx.fillRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2)
    if (i === 0) {
      // eyes
      ctx.fillStyle = '#fff'
      const ex = seg.x * CELL + (state.dir.x === 0 ? CELL / 2 - 4 : state.dir.x > 0 ? CELL - 7 : 5)
      const ey = seg.y * CELL + (state.dir.y === 0 ? CELL / 2 - 4 : state.dir.y > 0 ? CELL - 7 : 5)
      ctx.fillRect(ex, ey, 4, 4)
      ctx.fillRect(ex + (state.dir.x === 0 ? 7 : 0), ey + (state.dir.y === 0 ? 7 : 0), 4, 4)
    }
  })

  // HUD
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
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
      textCells: getTextCells(p),
      phrase: p,
    }
    setWon(false)
  }, [])

  useEffect(() => { initGame(phrase) }, []) // eslint-disable-line

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function loop(ts) {
      const s = stateRef.current
      if (s && ts - lastTickRef.current > TICK_MS) {
        lastTickRef.current = ts
        const won = tick(s)
        if (won) {
          setWon(true)
          setWinPhrase(s.phrase)
          render(ctx, { ...s, score: 10 })
          return
        }
      }
      if (s) render(ctx, s)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

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
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
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
      let d
      if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 }
      else d = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 }
      if (d.x === -cur.x && d.y === -cur.y) return
      stateRef.current.nextDir = d
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd) }
  }, [])

  function restart() {
    const next = randomPhrase(phrase)
    setPhrase(next)
    cancelAnimationFrame(rafRef.current)
    initGame(next)

    // restart loop
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    lastTickRef.current = 0
    function loop(ts) {
      const s = stateRef.current
      if (s && ts - lastTickRef.current > TICK_MS) {
        lastTickRef.current = ts
        const w = tick(s)
        if (w) { setWon(true); setWinPhrase(s.phrase); render(ctx, { ...s, score: 10 }); return }
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
      <h2 style={{ color: '#eee', margin: '0 0 6px', fontSize: 20 }}>🐍 Snake</h2>
      <p style={{ color: 'rgba(255,255,255,0.35)', marginBottom: 10, fontSize: 12 }}>
        Flechas / WASD / desliza · come 10 🍎 para ver el mensaje
      </p>

      <div style={{ position: 'relative', width: '100%', maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8, border: '1px solid rgba(80,200,255,0.2)' }}
        />

        {won && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 8, padding: 24, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
            <p style={{ fontSize: 26, fontWeight: 'bold', color: '#ffd700', textAlign: 'center', marginBottom: 6 }}>¡Ganaste!</p>
            <p style={{ fontSize: 20, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginBottom: 28, lineHeight: 1.3 }}>{winPhrase}</p>
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
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gridTemplateRows: 'repeat(3, 52px)', gap: 4 }}>
        {[
          [null, { x: 0, y: -1 }, null],
          [{ x: -1, y: 0 }, null, { x: 1, y: 0 }],
          [null, { x: 0, y: 1 }, null],
        ].flat().map((d, i) => (
          d ? (
            <button
              key={i}
              onPointerDown={e => { e.preventDefault(); setDir(d) }}
              style={{ width: 52, height: 52, background: 'rgba(80,200,255,0.15)', border: '1px solid rgba(80,200,255,0.3)', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}
            >
              {d.y === -1 ? '▲' : d.y === 1 ? '▼' : d.x === -1 ? '◀' : '▶'}
            </button>
          ) : <div key={i} />
        ))}
      </div>
    </div>
  )
}
