export type Board = number[][]
export type Dir = "left" | "right" | "up" | "down"

export const SIZE = 4

export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0))
}

/** Slides one row to the left: tiles close up, equal neighbours merge once. */
export function slideRow(row: number[]): { row: number[]; gained: number } {
  const tiles = row.filter((n) => n !== 0)
  const out: number[] = []
  let gained = 0
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      out.push(tiles[i] * 2)
      gained += tiles[i] * 2
      i++
    } else out.push(tiles[i])
  }
  while (out.length < row.length) out.push(0)
  return { row: out, gained }
}

const transpose = (b: Board): Board => b[0].map((_, c) => b.map((r) => r[c]))
const flip = (b: Board): Board => b.map((r) => [...r].reverse())

/** One move; `moved` is false when nothing changed. */
export function move(board: Board, dir: Dir): { board: Board; gained: number; moved: boolean } {
  let work = board
  if (dir === "up" || dir === "down") work = transpose(work)
  if (dir === "right" || dir === "down") work = flip(work)
  let gained = 0
  work = work.map((r) => {
    const s = slideRow(r)
    gained += s.gained
    return s.row
  })
  if (dir === "right" || dir === "down") work = flip(work)
  if (dir === "up" || dir === "down") work = transpose(work)
  const moved = work.some((r, y) => r.some((n, x) => n !== board[y][x]))
  return { board: work, gained, moved }
}

/** A new 2 (one time in ten a 4) on a random empty square; `rnd` returns 0..1. */
export function addTile(board: Board, rnd: () => number): Board {
  const empty: [number, number][] = []
  board.forEach((r, y) => r.forEach((n, x) => n === 0 && empty.push([y, x])))
  if (empty.length === 0) return board
  const [y, x] = empty[Math.floor(rnd() * empty.length) % empty.length]
  const next = board.map((r) => [...r])
  next[y][x] = rnd() < 0.1 ? 4 : 2
  return next
}

export function newBoard(rnd: () => number): Board {
  return addTile(addTile(emptyBoard(), rnd), rnd)
}

export function canMove(board: Board): boolean {
  return (["left", "right", "up", "down"] as Dir[]).some((d) => move(board, d).moved)
}
