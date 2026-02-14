"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"

const IMAGES_V1 = Array.from({ length: 12 }, (_, i) =>
  `/Marcus/marcus_loop_${String(i + 1).padStart(2, "0")}.png`
)

const IMAGES_V3 = Array.from({ length: 12 }, (_, i) =>
  `/marcus-test/marcus_alive4_${String(i + 1).padStart(2, "0")}.png`
)

const IMAGES_V4 = Array.from({ length: 12 }, (_, i) =>
  `/new%20new%20marcus/frame_${String(i + 1).padStart(2, "0")}.png`
)

type AnimationMode = "loop" | "pingpong" | "crossfade"
type ImageSet = "v1" | "v3" | "v4" | "both"

// Rich content for Marcus Aurelius - this is what the expanded card will show
const MARCUS_CONTENT = {
  name: "Marcus Aurelius",
  tagline: "The philosopher-king who conquered himself before conquering the world",
  category: "Warriors & Leaders",
  values: ["Discipline", "Wisdom", "Calm", "Integrity", "Self-reliance"],
  quote: "You have power over your mind – not outside events. Realize this, and you will find strength.",
  quoteSource: "Meditations",

  whyThisPerson: `Marcus Aurelius was the most powerful man in the world—ruler of the Roman Empire at its height—yet he spent his nights writing private journal entries reminding himself to stay humble, to forgive others, and to focus only on what he could control. His book "Meditations" was never meant to be published; it was his personal practice of keeping his mind right while the world demanded everything from him. He faced plagues, wars, betrayal, and the death of children, yet remained measured and kind. He's the ultimate example of someone who had every excuse to be arrogant, cruel, or checked out—and chose integrity instead.`,

  corePhilosophy: [
    "You cannot control events, only your response to them",
    "Every morning, prepare for difficult people—and choose patience anyway",
    "The obstacle in the path becomes the path",
    "Fame, pleasure, and wealth are fleeting—character is what remains",
    "Do what's right, not what's popular or easy"
  ],

  definingMoment: `During the Antonine Plague that killed millions across Rome, Marcus didn't flee the city like other elites. He sold palace furniture to fund the war effort, stayed in Rome to lead, and wrote in his journal: "It is not death that a man should fear, but he should fear never beginning to live." When his most trusted general, Avidius Cassius, declared himself emperor and raised a rebellion, Marcus refused to read intercepted letters that would reveal the traitors. He said he didn't want to know—he'd rather forgive than punish. When Cassius was killed by his own soldiers, Marcus wept for him.`,

  howThisHelpsYou: `If you're drawn to Marcus Aurelius, you value inner strength over outer validation. You want to be the man who stays calm when everything goes sideways, who doesn't need to prove himself because he knows who he is. In approaching and connecting with people, this means freedom from outcome—you engage fully while letting go of what you can't control. You treat rejection as information, not identity.`,

  additionalQuotes: [
    { text: "Waste no more time arguing about what a good man should be. Be one.", source: "Meditations" },
    { text: "The best revenge is not to be like your enemy.", source: "Meditations" },
    { text: "Accept the things to which fate binds you, and love the people with whom fate brings you together, and do so with all your heart.", source: "Meditations" }
  ]
}

export default function MarcusLoopPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fps, setFps] = useState(3)
  const [isPlaying, setIsPlaying] = useState(true)
  const [mode, setMode] = useState<AnimationMode>("loop")
  const [imageSet, setImageSet] = useState<ImageSet>("both")
  const [direction, setDirection] = useState(1) // For pingpong
  const [crossfadeProgress, setCrossfadeProgress] = useState(0)
  const [crossfadeDuration, setCrossfadeDuration] = useState(150) // ms

  const images = imageSet === "v4" ? IMAGES_V4 : imageSet === "v3" ? IMAGES_V3 : IMAGES_V1

  // Pingpong logic
  const getNextIndex = useCallback((current: number, dir: number) => {
    if (mode === "pingpong") {
      const next = current + dir
      if (next >= images.length - 1) return { index: images.length - 1, dir: -1 }
      if (next <= 0) return { index: 0, dir: 1 }
      return { index: next, dir }
    }
    return { index: (current + 1) % images.length, dir: 1 }
  }, [mode, images.length])

  // Main animation loop
  useEffect(() => {
    if (!isPlaying) return

    if (mode === "crossfade") {
      // Crossfade: smooth transition between frames
      const frameInterval = 1000 / fps
      const steps = Math.max(1, Math.floor(crossfadeDuration / 16)) // ~60fps updates
      const stepDuration = crossfadeDuration / steps
      let step = 0

      const fadeInterval = setInterval(() => {
        step++
        setCrossfadeProgress(step / steps)

        if (step >= steps) {
          step = 0
          setCrossfadeProgress(0)
          setCurrentIndex((prev) => {
            const { index, dir } = getNextIndex(prev, direction)
            setDirection(dir)
            return index
          })
        }
      }, stepDuration)

      const frameTimer = setInterval(() => {
        // Reset crossfade for next frame
      }, frameInterval)

      return () => {
        clearInterval(fadeInterval)
        clearInterval(frameTimer)
      }
    } else {
      // Hard cut or pingpong
      const interval = setInterval(() => {
        setCurrentIndex((prev) => {
          const { index, dir } = getNextIndex(prev, direction)
          setDirection(dir)
          return index
        })
      }, 1000 / fps)

      return () => clearInterval(interval)
    }
  }, [fps, isPlaying, mode, direction, getNextIndex, crossfadeDuration])

  const nextIndex = (currentIndex + 1) % images.length

  // Preload all images
  useEffect(() => {
    images.forEach((src) => {
      const img = new window.Image()
      img.src = src
    })
  }, [images])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-6 overflow-auto">
      <h1 className="text-white text-2xl font-bold mb-2">Role Model Animation Test</h1>
      <p className="text-white/50 text-sm mb-6">Testing subtle motion effects for character select</p>

      {/* Main Controls */}
      <div className="bg-zinc-900 rounded-xl p-4 mb-6 w-full max-w-3xl border border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              isPlaying
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          {/* Animation Mode */}
          <div className="flex flex-col">
            <span className="text-white/40 text-xs mb-1">Animation</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as AnimationMode)}
              className="bg-zinc-800 text-white rounded-lg px-3 py-2 border border-white/10"
            >
              <option value="crossfade">Crossfade</option>
              <option value="loop">Hard Cut</option>
              <option value="pingpong">Ping-Pong</option>
            </select>
          </div>

          {/* Image Set */}
          <div className="flex flex-col">
            <span className="text-white/40 text-xs mb-1">Image Set</span>
            <select
              value={imageSet}
              onChange={(e) => {
                setImageSet(e.target.value as ImageSet)
                setCurrentIndex(0)
              }}
              className="bg-zinc-800 text-white rounded-lg px-3 py-2 border border-white/10"
            >
              <option value="v1">Marcus v1 (Original)</option>
              <option value="v3">Marcus v3 (New)</option>
              <option value="v4">Marcus v4 (New New)</option>
              <option value="both">Compare All</option>
            </select>
          </div>

          {/* Frame Counter */}
          <div className="flex flex-col items-center justify-center bg-zinc-800/50 rounded-lg">
            <span className="text-white/40 text-xs">Frame</span>
            <span className="text-white text-xl font-mono">
              {currentIndex + 1}/{images.length}
            </span>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex flex-col">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white/60">FPS</span>
              <span className="text-amber-400 font-mono">{fps}</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>Slow</span>
              <span>Recommended: 8-15</span>
              <span>Fast</span>
            </div>
          </div>

          {mode === "crossfade" && (
            <div className="flex flex-col">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">Crossfade Duration</span>
                <span className="text-teal-400 font-mono">{crossfadeDuration}ms</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={crossfadeDuration}
                onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                className="w-full accent-teal-500"
              />
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>Snappy</span>
                <span>Smooth</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Display */}
      {imageSet === "both" ? (
        // Side by side comparison
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl justify-center">
          <ImageViewer
            images={IMAGES_V1}
            currentIndex={currentIndex}
            nextIndex={nextIndex}
            mode={mode}
            crossfadeProgress={crossfadeProgress}
            label="Version 1 (Original)"
            size={320}
          />
          <ImageViewer
            images={IMAGES_V3}
            currentIndex={currentIndex}
            nextIndex={nextIndex}
            mode={mode}
            crossfadeProgress={crossfadeProgress}
            label="Version 3 (New)"
            size={320}
          />
          <ImageViewer
            images={IMAGES_V4}
            currentIndex={currentIndex}
            nextIndex={nextIndex}
            mode={mode}
            crossfadeProgress={crossfadeProgress}
            label="Version 4 (New New)"
            size={320}
          />
        </div>
      ) : (
        // Single view
        <ImageViewer
          images={images}
          currentIndex={currentIndex}
          nextIndex={nextIndex}
          mode={mode}
          crossfadeProgress={crossfadeProgress}
          label={imageSet === "v1" ? "Version 1" : imageSet === "v3" ? "Version 3" : "Version 4 (New New)"}
          size={512}
        />
      )}

      {/* Card Preview - 5 cards side by side */}
      <div className="mt-8 mb-4 w-full">
        <h2 className="text-white/60 text-sm text-center mb-3">Card Preview (hover to preview, click to expand)</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <ExpandableCard
              key={i}
              images={imageSet === "v4" ? IMAGES_V4 : imageSet === "v3" ? IMAGES_V3 : imageSet === "v1" ? IMAGES_V1 : i < 2 ? IMAGES_V1 : i < 4 ? IMAGES_V3 : IMAGES_V4}
              currentIndex={currentIndex}
              nextIndex={nextIndex}
              mode={mode}
              crossfadeProgress={crossfadeProgress}
            />
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-zinc-900/50 rounded-lg max-w-2xl border border-white/5">
        <h3 className="text-white/80 font-medium mb-2">Testing Tips</h3>
        <ul className="text-white/50 text-sm space-y-1">
          <li>• <strong>Crossfade</strong> at 10-12 FPS with 100-150ms duration feels subtle and alive</li>
          <li>• <strong>Ping-pong</strong> avoids jarring loop reset (breath in → breath out)</li>
          <li>• <strong>Hard cut</strong> at low FPS (4-6) can feel intentionally stylized</li>
          <li>• Watch for: flickering, jumpiness, or "too much" movement</li>
          <li>• Goal: Character feels present, not obviously animated</li>
        </ul>
      </div>
    </div>
  )
}

// Reusable Image Viewer component
function ImageViewer({
  images,
  currentIndex,
  nextIndex,
  mode,
  crossfadeProgress,
  label,
  size,
}: {
  images: string[]
  currentIndex: number
  nextIndex: number
  mode: AnimationMode
  crossfadeProgress: number
  label: string
  size: number
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-white/50 text-sm mb-2">{label}</span>
      <div
        className="relative bg-black rounded-lg overflow-hidden border border-white/10"
        style={{ width: size, height: size }}
      >
        {/* Current frame */}
        <Image
          src={images[currentIndex]}
          alt={`Frame ${currentIndex + 1}`}
          fill
          className="object-cover"
          style={{
            opacity: mode === "crossfade" ? 1 - crossfadeProgress : 1,
            transition: mode === "crossfade" ? "none" : undefined
          }}
          priority
        />
        {/* Next frame (for crossfade) */}
        {mode === "crossfade" && (
          <Image
            src={images[nextIndex]}
            alt={`Frame ${nextIndex + 1}`}
            fill
            className="object-cover"
            style={{ opacity: crossfadeProgress }}
            priority
          />
        )}
      </div>
    </div>
  )
}

// Expandable Card component with rich content
function ExpandableCard({
  images,
  currentIndex,
  nextIndex,
  mode,
  crossfadeProgress,
}: {
  images: string[]
  currentIndex: number
  nextIndex: number
  mode: AnimationMode
  crossfadeProgress: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <>
      {/* Card with hover preview */}
      <div
        onClick={() => setIsExpanded(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          bg-gradient-to-b from-zinc-800/50 to-zinc-900 rounded-xl overflow-hidden
          border transition-all duration-300 cursor-pointer
          ${isHovered
            ? "w-[320px] border-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.02] z-10"
            : "w-[240px] border-white/10 hover:border-white/20"
          }
        `}
      >
        {/* Image */}
        <div className={`relative w-full transition-all duration-300 ${isHovered ? "h-[280px]" : "h-[240px]"}`}>
          <Image
            src={images[currentIndex]}
            alt={MARCUS_CONTENT.name}
            fill
            className="object-cover object-top"
            style={{
              opacity: mode === "crossfade" ? 1 - crossfadeProgress : 1,
            }}
          />
          {mode === "crossfade" && (
            <Image
              src={images[nextIndex]}
              alt={MARCUS_CONTENT.name}
              fill
              className="object-cover object-top"
              style={{ opacity: crossfadeProgress }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-900" />

          {/* Hover glow */}
          <div className={`absolute inset-0 bg-gradient-to-t transition-all duration-300 ${
            isHovered ? "from-amber-500/15 to-transparent" : "from-transparent to-transparent"
          }`} />
        </div>

        {/* Content */}
        <div className="p-4 -mt-10 relative z-10">
          <h2 className={`font-bold transition-colors duration-300 ${
            isHovered ? "text-amber-400 text-xl" : "text-white text-lg"
          }`}>
            {MARCUS_CONTENT.name}
          </h2>
          <p className="text-white/50 text-sm">{MARCUS_CONTENT.category}</p>

          {/* Tagline - only visible on hover */}
          <div className={`overflow-hidden transition-all duration-300 ${
            isHovered ? "max-h-20 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
          }`}>
            <p className="text-white/70 text-sm italic leading-snug">
              {MARCUS_CONTENT.tagline}
            </p>
          </div>

          {/* Quote */}
          <p className={`text-white/70 text-sm mt-2 italic transition-all duration-300 ${
            isHovered ? "line-clamp-3" : "line-clamp-2"
          }`}>
            "{isHovered ? MARCUS_CONTENT.quote : MARCUS_CONTENT.quote.slice(0, 50) + "..."}"
          </p>

          {/* Values */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {MARCUS_CONTENT.values.slice(0, isHovered ? 5 : 3).map((value, i) => (
              <span
                key={value}
                className={`px-2 py-1 rounded text-xs transition-all duration-300 ${
                  i === 0
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400/80"
                    : i === 1
                    ? "bg-teal-500/10 border border-teal-500/20 text-teal-400/80"
                    : "bg-white/5 border border-white/10 text-white/60"
                }`}
              >
                {value}
              </span>
            ))}
          </div>

          {/* Preview text - only on hover */}
          <div className={`overflow-hidden transition-all duration-300 ${
            isHovered ? "max-h-24 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
          }`}>
            <p className="text-white/50 text-xs leading-relaxed line-clamp-3">
              {MARCUS_CONTENT.whyThisPerson.slice(0, 180)}...
            </p>
          </div>

          {/* CTA */}
          <div className={`transition-all duration-300 ${
            isHovered ? "mt-4" : "mt-3"
          }`}>
            <p className={`text-center text-xs transition-all duration-300 ${
              isHovered
                ? "text-amber-400 font-medium"
                : "text-white/30"
            }`}>
              {isHovered ? "Click to read full profile →" : "Hover to preview"}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with image */}
            <div className="relative h-[300px]">
              <Image
                src={images[currentIndex]}
                alt={MARCUS_CONTENT.name}
                fill
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-900" />
              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 flex items-center justify-center transition-all"
              >
                ✕
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-amber-400 text-sm font-medium mb-1">{MARCUS_CONTENT.category}</p>
                <h2 className="text-white text-3xl font-bold">{MARCUS_CONTENT.name}</h2>
                <p className="text-white/60 mt-1">{MARCUS_CONTENT.tagline}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Values */}
              <div className="flex flex-wrap gap-2">
                {MARCUS_CONTENT.values.map((value) => (
                  <span
                    key={value}
                    className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-sm text-amber-400"
                  >
                    {value}
                  </span>
                ))}
              </div>

              {/* Primary Quote */}
              <blockquote className="border-l-2 border-amber-500/50 pl-4 py-2">
                <p className="text-white/90 text-lg italic">"{MARCUS_CONTENT.quote}"</p>
                <cite className="text-white/50 text-sm mt-1 block">— {MARCUS_CONTENT.quoteSource}</cite>
              </blockquote>

              {/* Why This Person */}
              <div>
                <h3 className="text-amber-400 font-semibold mb-2">Why Marcus Aurelius?</h3>
                <p className="text-white/70 leading-relaxed">{MARCUS_CONTENT.whyThisPerson}</p>
              </div>

              {/* Core Philosophy */}
              <div>
                <h3 className="text-amber-400 font-semibold mb-3">Core Philosophy</h3>
                <ul className="space-y-2">
                  {MARCUS_CONTENT.corePhilosophy.map((principle, i) => (
                    <li key={i} className="flex items-start gap-3 text-white/70">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{principle}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Defining Moment */}
              <div>
                <h3 className="text-amber-400 font-semibold mb-2">Defining Moment</h3>
                <p className="text-white/70 leading-relaxed">{MARCUS_CONTENT.definingMoment}</p>
              </div>

              {/* How This Helps You */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <h3 className="text-amber-400 font-semibold mb-2">How This Helps You</h3>
                <p className="text-white/80 leading-relaxed">{MARCUS_CONTENT.howThisHelpsYou}</p>
              </div>

              {/* Additional Quotes */}
              <div>
                <h3 className="text-amber-400 font-semibold mb-3">More Wisdom</h3>
                <div className="space-y-3">
                  {MARCUS_CONTENT.additionalQuotes.map((q, i) => (
                    <blockquote key={i} className="border-l border-white/20 pl-3 py-1">
                      <p className="text-white/60 italic">"{q.text}"</p>
                      {q.source && <cite className="text-white/40 text-sm">— {q.source}</cite>}
                    </blockquote>
                  ))}
                </div>
              </div>

              {/* Select Button */}
              <button className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all">
                Select Marcus Aurelius as Role Model
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
