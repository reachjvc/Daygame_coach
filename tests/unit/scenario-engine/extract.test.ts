import { describe, it, expect } from "vitest"
import {
  buildConversations,
  dedupeConversations,
  detectCareerMoments,
  detectColdReadMoments,
  extractDataset,
  labelOutcome,
  GIRL_REVEAL_RE,
  type Conversation,
  type RawChunkInput,
} from "../../../scripts/scenario-engine/lib/extract"
import { splitMoments, seededShuffle } from "../../../scripts/scenario-engine/lib/split"

function chunk(overrides: Partial<RawChunkInput> = {}): RawChunkInput {
  return {
    content: "[TYPE: infield]\nCoach: Hey, quick question.\nGirl: Okay.",
    segmentType: "INTERACTION",
    videoId: "vid00000001",
    conversationId: 1,
    conversationChunkIndex: 1,
    channel: "test_channel",
    ...overrides,
  }
}

function conv(lines: Array<[string, string]>, overrides: Partial<Conversation> = {}): Conversation {
  return {
    videoId: "vid00000001",
    convId: 1,
    channel: "test_channel",
    lines: lines.map(([label, text]) => ({
      label,
      text,
      speaker: /^(girl|woman|target)/i.test(label) ? "girl" : /^(coach|student)/i.test(label) ? "coach" : "other",
    })),
    descs: [],
    ...overrides,
  }
}

describe("buildConversations", () => {
  it("assembles ordered lines, strips headers and SUMMARY chunks", () => {
    const convs = buildConversations([
      chunk({ conversationChunkIndex: 2, content: "[TYPE: infield]\nGirl: I'm a dancer.\nCoach: What kind?" }),
      chunk({ conversationChunkIndex: 1 }),
      chunk({ content: "[SUMMARY] [TYPE: infield]\nsummary text here" }),
    ])
    expect(convs).toHaveLength(1)
    expect(convs[0].lines.map((l) => l.text)).toEqual([
      "Hey, quick question.",
      "Okay.",
      "I'm a dancer.",
      "What kind?",
    ])
  })

  it("dedupes overlap-repeated lines", () => {
    const convs = buildConversations([
      chunk({ conversationChunkIndex: 1, content: "[TYPE: infield]\nCoach: Hello there.\nGirl: Hi." }),
      chunk({ conversationChunkIndex: 2, content: "[TYPE: infield]\nGirl: Hi.\nCoach: Where are you from?" }),
    ])
    expect(convs[0].lines.map((l) => l.text)).toEqual(["Hello there.", "Hi.", "Where are you from?"])
  })

  it("maps Student label to coach role and Woman to girl", () => {
    const convs = buildConversations([
      chunk({ content: "[TYPE: infield]\nStudent: Hey.\nWoman: Hello." }),
    ])
    expect(convs[0].lines[0].speaker).toBe("coach")
    expect(convs[0].lines[1].speaker).toBe("girl")
  })
})

describe("GIRL_REVEAL_RE calibration", () => {
  it.each(["I'm a dancer", "I work in marketing", "I study law", "No, I'm an architect", "I am a nanny"])(
    "matches genuine reveal: %s",
    (text) => expect(GIRL_REVEAL_RE.test(text)).toBe(true)
  )
  it.each(["I'm a bit indecisive", "what if I'm a virgin", "I'm a devil", "I'm a big fan"])(
    "does not fire career moment on false positive: %s",
    (text) => {
      const c = conv([
        ["Girl", text],
        ["Coach", "Interesting."],
      ])
      expect(detectCareerMoments(c)).toHaveLength(0)
    }
  )
})

describe("detectCareerMoments", () => {
  it("captures girl-reveal with coach response and her reaction", () => {
    const c = conv([
      ["Coach", "So what's your deal?"],
      ["Girl", "I'm an architect."],
      ["Coach", "So you're intelligent, yeah?"],
      ["Coach", "I'm not very intelligent."],
      ["Girl", "Haha, I'm sure that's not true."],
    ])
    const [m] = detectCareerMoments(c)
    expect(m.direction).toBe("girl-reveal")
    expect(m.trigger).toContain("architect")
    expect(m.coachResponse).toEqual(["So you're intelligent, yeah?", "I'm not very intelligent."])
    expect(m.girlReaction).toEqual(["Haha, I'm sure that's not true."])
  })

  it("captures coach-ask direction", () => {
    const c = conv([
      ["Coach", "What do you do for work?"],
      ["Girl", "Bottle service in Vegas."],
    ])
    const [m] = detectCareerMoments(c)
    expect(m.direction).toBe("coach-ask")
  })

  it("emits at most one moment per conversation", () => {
    const c = conv([
      ["Girl", "I'm a dancer."],
      ["Coach", "Nice."],
      ["Girl", "I also work in a bar."],
      ["Coach", "Cool."],
    ])
    expect(detectCareerMoments(c)).toHaveLength(1)
  })
})

describe("detectColdReadMoments", () => {
  it("captures a read with confirm signal", () => {
    const c = conv([
      ["Coach", "You give me teacher vibes."],
      ["Girl", "Yes! I'm a teacher."],
      ["Coach", "So I was right!"],
    ])
    const [m] = detectColdReadMoments(c)
    expect(m.direction).toBe("coach-read")
    expect(m.readConfirmed).toBe(true)
  })

  it("ignores generic 'you seem cool' pleasantries", () => {
    const c = conv([
      ["Coach", "Well, you seem cool."],
      ["Girl", "Thanks."],
    ])
    expect(detectColdReadMoments(c)).toHaveLength(0)
  })

  it("captures a denied read", () => {
    const c = conv([
      ["Coach", "You look like a dancer or something."],
      ["Girl", "No, I'm not."],
      ["Coach", "You're not an artist of any sort?"],
    ])
    const [m] = detectColdReadMoments(c)
    expect(m.readConfirmed).toBe(false)
  })
})

describe("labelOutcome", () => {
  it("labels a number exchange in the second half as closed", () => {
    const c = conv([
      ["Coach", "Hey."],
      ["Girl", "Hi."],
      ["Coach", "You're cool."],
      ["Coach", "Pop your number in here."],
      ["Girl", "Okay."],
    ])
    expect(labelOutcome(c)).toBe("closed")
  })

  it("labels ending pleasantries without close as fizzled", () => {
    const c = conv([
      ["Coach", "Hey."],
      ["Girl", "Hi."],
      ["Girl", "I have to go."],
      ["Coach", "Nice meeting you."],
    ])
    expect(labelOutcome(c)).toBe("fizzled")
  })
})

describe("dedupeConversations", () => {
  it("drops footage duplicates across different videoIds", () => {
    const lines: Array<[string, string]> = [
      ["Coach", "This is a very specific opener about your matrix coat and analytical eyes."],
      ["Girl", "Haha thank you, that is oddly specific of you to say."],
      ["Coach", "I commit to my reads, it is part of my whole thing as a person."],
    ]
    const a = conv(lines, { videoId: "vidA" })
    const b = conv(lines, { videoId: "vidB", channel: "other_channel" })
    expect(dedupeConversations([a, b])).toHaveLength(1)
  })

  it("drops near-duplicates with different clip start points and ASR variance", () => {
    const shared: Array<[string, string]> = [
      ["Coach", "You guys are close friends right, what would you say is like her whole deal"],
      ["Girl", "She's goofy, she's funny, she works at a gym near the other side of town"],
      ["Coach", "Oh you work out around like over here or where, I'm like brand new over here"],
      ["Girl", "No like closer to Doral, I don't know if you know that area at all honestly"],
    ]
    const a = conv(shared, { videoId: "vidA" })
    const b = conv(
      [["Coach", "Don't get, nah, so, okay, so let me ask a question real quick here"], ...shared],
      { videoId: "vidB", channel: "other_channel" }
    )
    expect(dedupeConversations([a, b])).toHaveLength(1)
  })

  it("never dedupes conversations within the same video (compilation of one script on many girls)", () => {
    const script: Array<[string, string]> = [
      ["Coach", "Excuse me excuse me I just want to say you look expensive like a Bugatti"],
      ["Coach", "I will pick you up in my Bugatti tomorrow at eight in the evening sharp"],
    ]
    const a = conv([...script, ["Girl", "Haha what, who even are you"]], { videoId: "vidX", convId: 1 })
    const b = conv([...script, ["Girl", "Okay that is actually really funny"]], { videoId: "vidX", convId: 2 })
    expect(dedupeConversations([a, b])).toHaveLength(2)
  })

  it("keeps short distinct conversations", () => {
    const a = conv([["Coach", "Hi."]], { videoId: "vidA" })
    const b = conv([["Coach", "Hello."]], { videoId: "vidB" })
    expect(dedupeConversations([a, b])).toHaveLength(2)
  })
})

describe("extractDataset", () => {
  it("includes full transcripts for every conversation with a moment", () => {
    const c = conv([
      ["Coach", "You give me teacher vibes."],
      ["Girl", "Ha, maybe."],
      ["Coach", "Definitely teacher vibes."],
      ["Girl", "Okay yes, I'm a teacher!"],
      ["Coach", "So I was right."],
    ])
    const ds = extractDataset([c], "2026-07-25T00:00:00Z")
    const key = `${c.videoId}#${c.convId}`
    expect(ds.transcripts[key]).toBeDefined()
    // full transcript retains the setup line that precedes the payoff
    expect(ds.transcripts[key][0]).toContain("teacher vibes")
    expect(ds.transcripts[key]).toHaveLength(5)
  })

  it("produces stats and confirm rate", () => {
    const c1 = conv([
      ["Coach", "You give me teacher vibes."],
      ["Girl", "Yes, I'm a teacher!"],
      ["Coach", "So I was right."],
    ])
    const c2 = conv(
      [
        ["Coach", "You look like a model."],
        ["Girl", "No, not at all."],
        ["Coach", "Well you should be."],
      ],
      { videoId: "vid2" }
    )
    const ds = extractDataset([c1, c2], "2026-07-25T00:00:00Z")
    expect(ds.coldread).toHaveLength(2)
    expect(ds.stats.coldReadConfirmRate).toBe(0.5)
  })
})

describe("splitMoments", () => {
  const moments = (channel: string, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const c = conv([["Girl", `I'm a dancer number ${i}.`], ["Coach", "Nice."]], {
        videoId: `${channel}-v${i}`,
        channel,
      })
      return detectCareerMoments(c)[0]
    })

  it("is deterministic and keeps every multi-moment channel in both splits", () => {
    const all = [...moments("chanA", 5), ...moments("chanB", 3), ...moments("chanC", 1)]
    const s1 = splitMoments(all, 0.3, "seed1")
    const s2 = splitMoments(all, 0.3, "seed1")
    expect(s1).toEqual(s2)
    expect(s1.train.length + s1.test.length).toBe(9)
    // single-moment channel goes to train
    expect(s1.train.some((id) => id.startsWith("chanC"))).toBe(true)
    // multi channels appear in both
    for (const ch of ["chanA", "chanB"]) {
      expect(s1.train.some((id) => id.startsWith(ch))).toBe(true)
      expect(s1.test.some((id) => id.startsWith(ch))).toBe(true)
    }
  })

  it("seededShuffle is deterministic", () => {
    const arr = [1, 2, 3, 4, 5, 6]
    expect(seededShuffle(arr, "x")).toEqual(seededShuffle(arr, "x"))
    expect(seededShuffle(arr, "x")).not.toEqual(arr)
  })
})
