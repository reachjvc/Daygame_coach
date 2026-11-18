import { describe, expect, it } from "vitest"
import { addTile, canMove, move, newBoard, slideRow } from "@/src/quit/lab/sos/a/game2048"
import { COLS, FOOD_COUNT, FOOD_POINTS, newSnake, step, turn } from "@/src/quit/lab/sos/c/snake"
import { bump, nextIndex, pieSlices } from "@/src/quit/lab/sos/e/pie"
import { shakeDetected } from "@/src/quit/lab/sos/d/shake"
import { formatClock, holdProgress, shares } from "@/src/quit/lab/sos/shared/clock"

const fixed = (v: number) => () => v

describe("2048 rules", () => {
  it("slides and merges each pair once", () => {
    expect(slideRow([2, 2, 2, 2])).toEqual({ row: [4, 4, 0, 0], gained: 8 })
    expect(slideRow([0, 2, 0, 2])).toEqual({ row: [4, 0, 0, 0], gained: 4 })
    expect(slideRow([4, 2, 2, 0])).toEqual({ row: [4, 4, 0, 0], gained: 4 })
  })
  it("moves in all four directions and reports no-move", () => {
    const b = [
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 2],
    ]
    expect(move(b, "down").board[3][3]).toBe(4)
    expect(move(b, "up").board[0][3]).toBe(4)
    expect(move(b, "left").board[0][0]).toBe(2)
    expect(move(b, "right").moved).toBe(false)
  })
  it("adds one tile and detects a dead board", () => {
    const nb = newBoard(fixed(0.5))
    expect(nb.flat().filter((n) => n > 0)).toHaveLength(2)
    expect(addTile(nb, fixed(0.5)).flat().filter((n) => n > 0)).toHaveLength(3)
    const dead = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]
    expect(canMove(dead)).toBe(false)
  })
})

describe("snake rules", () => {
  it("cannot reverse onto itself", () => {
    expect(turn("right", "left")).toBe("right")
    expect(turn("right", "up")).toBe("up")
  })
  it("moves, eats for 25 and grows, dies on a wall", () => {
    const s0 = newSnake(fixed(0.3))
    expect(s0.food).toHaveLength(FOOD_COUNT)
    const head = s0.snake[0]
    const s1 = step({ ...s0, food: [{ x: head.x + 1, y: head.y }, ...s0.food.slice(1)] }, "right", fixed(0.3))
    expect(s1.score).toBe(FOOD_POINTS)
    expect(s1.snake).toHaveLength(s0.snake.length + 1)
    expect(s1.food).toHaveLength(FOOD_COUNT)
    const wall = step(
      {
        ...s0,
        snake: [
          { x: COLS - 1, y: 2 },
          { x: COLS - 2, y: 2 },
        ],
        food: [],
      },
      "right",
      fixed(0.3),
    )
    expect(wall.alive).toBe(false)
  })
  it("dies on its own body", () => {
    const s = {
      snake: [
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 2 },
        { x: 3, y: 1 },
      ],
      dir: "up" as const,
      food: [],
      score: 0,
      alive: true,
    }
    expect(step(s, "right", fixed(0.3)).alive).toBe(false)
  })
})

describe("clock, shares, hold and pie", () => {
  it("formats mm:ss", () => {
    expect(formatClock(1200)).toBe("20:00")
    expect(formatClock(59)).toBe("00:59")
    expect(formatClock(-3)).toBe("00:00")
  })
  it("shares of taps", () => {
    expect(shares([2, 1, 1, 1])).toEqual([40, 20, 20, 20])
    expect(shares([0, 0])).toEqual([0, 0])
  })
  it("hold progress is clamped", () => {
    expect(holdProgress(3000, 6000)).toBe(0.5)
    expect(holdProgress(9000, 6000)).toBe(1)
  })
  it("pie has a slice per non-zero count; counts never go below zero; solutions wrap", () => {
    expect(pieSlices([0, 0], 10)).toEqual([])
    expect(pieSlices([2, 0, 1], 10).map((s) => s.index)).toEqual([0, 2])
    expect(pieSlices([3], 10)).toHaveLength(1)
    expect(bump([1, 0], 1, -1)).toEqual([1, 0])
    expect(nextIndex(1, 2)).toBe(0)
  })
})

describe("shake detection", () => {
  it("fires on a strong motion once per pause, never on gravity alone or no data", () => {
    expect(shakeDetected({ x: 2, y: 9.8, z: 1 }, 5000, 0)).toBe(false)
    expect(shakeDetected({ x: 30, y: 20, z: 10 }, 5000, 0)).toBe(true)
    expect(shakeDetected({ x: 30, y: 20, z: 10 }, 5500, 5000)).toBe(false)
    expect(shakeDetected({ x: 30, y: 20, z: 10 }, 6100, 5000)).toBe(true)
    expect(shakeDetected(null, 5000, 0)).toBe(false)
    expect(shakeDetected({ x: null, y: null, z: null }, 5000, 0)).toBe(false)
  })
})
