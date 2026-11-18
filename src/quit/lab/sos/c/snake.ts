export type Dir = "up" | "down" | "left" | "right"
export interface Pt {
  x: number
  y: number
}
export interface SnakeState {
  /** Head first. */
  snake: Pt[]
  dir: Dir
  food: Pt[]
  /** Score of this run. */
  score: number
  alive: boolean
}

export const COLS = 14
export const ROWS = 16
export const FOOD_COUNT = 3
export const FOOD_POINTS = 25

const DELTA: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" }

/** A turn that would reverse the snake onto itself is ignored. */
export function turn(current: Dir, wanted: Dir): Dir {
  return wanted === OPPOSITE[current] ? current : wanted
}

function freeCell(snake: Pt[], food: Pt[], rnd: () => number): Pt | null {
  const taken = new Set([...snake, ...food].map((p) => `${p.x},${p.y}`))
  const free: Pt[] = []
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!taken.has(`${x},${y}`)) free.push({ x, y })
  if (free.length === 0) return null
  return free[Math.floor(rnd() * free.length) % free.length]
}

export function newSnake(rnd: () => number): SnakeState {
  const snake = [
    { x: 4, y: 8 },
    { x: 3, y: 8 },
    { x: 2, y: 8 },
  ]
  const food: Pt[] = []
  while (food.length < FOOD_COUNT) {
    const c = freeCell(snake, food, rnd)
    if (!c) break
    food.push(c)
  }
  return { snake, dir: "right", food, score: 0, alive: true }
}

/** One step: move the head; eat food (grow, +25, new food); wall or own body ends the run. */
export function step(state: SnakeState, wanted: Dir, rnd: () => number): SnakeState {
  if (!state.alive) return state
  const dir = turn(state.dir, wanted)
  const head = { x: state.snake[0].x + DELTA[dir].x, y: state.snake[0].y + DELTA[dir].y }
  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return { ...state, dir, alive: false }
  const eatenAt = state.food.findIndex((f) => f.x === head.x && f.y === head.y)
  const grown = eatenAt >= 0
  const body = grown ? state.snake : state.snake.slice(0, -1)
  if (body.some((p) => p.x === head.x && p.y === head.y)) return { ...state, dir, alive: false }
  const snake = [head, ...body]
  let food = state.food
  if (grown) {
    food = state.food.filter((_, i) => i !== eatenAt)
    const c = freeCell(snake, food, rnd)
    if (c) food = [...food, c]
  }
  return { snake, dir, food, score: state.score + (grown ? FOOD_POINTS : 0), alive: true }
}
