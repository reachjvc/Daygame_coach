import { describe, test, expect } from 'vitest'
import { buildSystemPrompt, buildUserPrompt, parseResponse } from '@/src/qa/prompt'
import type { RetrievedChunk } from '@/src/qa/types'

/**
 * Helper to create a mock chunk with sensible defaults
 */
function createChunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    chunkId: 'chunk-1',
    text: 'Some coaching advice text',
    metadata: {
      coach: 'TestCoach',
      topic: 'opener',
    },
    relevanceScore: 0.8,
    ...overrides,
  }
}

// ============================================
// buildUserPrompt tests
// ============================================

describe('buildUserPrompt', () => {
  test('should return trimmed question', () => {
    // Arrange
    const question = 'How do I open?'

    // Act
    const result = buildUserPrompt(question)

    // Assert
    expect(result).toBe('How do I open?')
  })

  test('should trim leading and trailing whitespace', () => {
    // Arrange
    const question = '   How do I open?   '

    // Act
    const result = buildUserPrompt(question)

    // Assert
    expect(result).toBe('How do I open?')
  })

  test('should handle empty string', () => {
    // Arrange
    const question = ''

    // Act
    const result = buildUserPrompt(question)

    // Assert
    expect(result).toBe('')
  })

  test('should preserve internal whitespace', () => {
    // Arrange
    const question = 'How do I  open with  multiple  spaces?'

    // Act
    const result = buildUserPrompt(question)

    // Assert
    expect(result).toBe('How do I  open with  multiple  spaces?')
  })
})

// ============================================
// buildSystemPrompt tests
// ============================================

describe('buildSystemPrompt', () => {
  describe('source map generation', () => {
    test('should include source map with coach name for single chunk', () => {
      // Arrange
      const chunks = [createChunk({ metadata: { coach: 'SocialStoic' } })]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('source 1 = SocialStoic')
    })

    test('should number sources sequentially for multiple chunks', () => {
      // Arrange
      const chunks = [
        createChunk({ chunkId: 'c1', metadata: { coach: 'Coach1' } }),
        createChunk({ chunkId: 'c2', metadata: { coach: 'Coach2' } }),
        createChunk({ chunkId: 'c3', metadata: { coach: 'Coach3' } }),
      ]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('source 1 = Coach1')
      expect(result).toContain('source 2 = Coach2')
      expect(result).toContain('source 3 = Coach3')
    })

    test('should include topic in source map when present', () => {
      // Arrange
      const chunks = [
        createChunk({ metadata: { coach: 'TestCoach', topic: 'openers' } }),
      ]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('source 1 = TestCoach — openers')
    })
  })

  describe('missing metadata handling', () => {
    test('should use "Unknown Coach" when coach metadata is missing', () => {
      // Arrange
      const chunks = [createChunk({ metadata: {} })]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('Unknown Coach')
    })

    test('should omit topic when not present in metadata', () => {
      // Arrange
      const chunks = [createChunk({ metadata: { coach: 'TestCoach' } })]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('source 1 = TestCoach')
      expect(result).not.toContain('source 1 = TestCoach —')
    })
  })

  describe('chunk text truncation', () => {
    test('should truncate chunk text longer than 2200 characters', () => {
      // Arrange
      const longText = 'A'.repeat(2500)
      const chunks = [createChunk({ text: longText })]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('...[truncated for prompt]...')
      expect(result).not.toContain('A'.repeat(2500))
    })

    test('should not truncate chunk text under 2200 characters', () => {
      // Arrange
      const shortText = 'A'.repeat(2000)
      const chunks = [createChunk({ text: shortText })]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).not.toContain('...[truncated for prompt]...')
      expect(result).toContain(shortText)
    })
  })

  describe('script intent detection', () => {
    test('should add NOTE for "what should i say" questions', () => {
      // Arrange
      const chunks = [createChunk()]
      const question = 'what should i say to her?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('NOTE: User intent is SCRIPT')
    })

    test('should add NOTE for "what do i say" questions', () => {
      // Arrange
      const chunks = [createChunk()]
      const question = 'What do I say after opening?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('NOTE: User intent is SCRIPT')
    })

    test('should add NOTE for "what should i text" questions', () => {
      // Arrange
      const chunks = [createChunk()]
      const question = 'what should i text her?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('NOTE: User intent is SCRIPT')
    })

    test('should add NOTE for "how do i respond" questions', () => {
      // Arrange
      const chunks = [createChunk()]
      const question = 'how do i respond to this?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('NOTE: User intent is SCRIPT')
    })

    test('should NOT add NOTE for general questions', () => {
      // Arrange
      const chunks = [createChunk()]
      const question = 'How do I approach women in bookstores?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).not.toContain('NOTE: User intent is SCRIPT')
    })
  })

  describe('security markers', () => {
    test('should include UNTRUSTED DATA markers around chunk content', () => {
      // Arrange
      const chunks = [createChunk({ text: 'Coaching advice here' })]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('---BEGIN UNTRUSTED TRAINING DATA---')
      expect(result).toContain('---END UNTRUSTED TRAINING DATA---')
    })

    test('should include SECURITY NOTICE', () => {
      // Arrange
      const chunks = [createChunk()]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('SECURITY NOTICE')
      expect(result).toContain('UNTRUSTED content')
    })
  })

  describe('chunk metadata in context', () => {
    test('should include relevance score when present', () => {
      // Arrange
      const chunks = [createChunk({ relevanceScore: 0.85 })]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('score: 0.850')
    })

    test('should include chunkId in context', () => {
      // Arrange
      const chunks = [createChunk({ chunkId: 'chunk-abc-123' })]
      const question = 'How do I open?'

      // Act
      const result = buildSystemPrompt(chunks, question)

      // Assert
      expect(result).toContain('chunkId: chunk-abc-123')
    })
  })
})

// ============================================
// parseResponse tests
// ============================================

describe('parseResponse', () => {
  describe('full valid response', () => {
    test('should extract all sections from well-formed response', () => {
      // Arrange
      const response = `RETRIEVAL NOTES
Used sources 1 and 2 for opener advice.

ANSWER
Here is some coaching advice about openers.

SUGGESTED FOLLOW-UPS
How do I transition?
What body language should I use?
How do I close?`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.reasoning).toBe('Used sources 1 and 2 for opener advice.')
      expect(result.answer).toContain('ANSWER:')
      expect(result.answer).toContain('coaching advice about openers')
      expect(result.suggestedFollowUps).toHaveLength(3)
    })
  })

  describe('missing sections', () => {
    test('should return empty reasoning when RETRIEVAL NOTES is missing', () => {
      // Arrange
      const response = `ANSWER
Here is the advice.

SUGGESTED FOLLOW-UPS
Follow up question`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.reasoning).toBe('')
    })

    test('should return empty array when SUGGESTED FOLLOW-UPS is missing', () => {
      // Arrange
      const response = `RETRIEVAL NOTES
Some notes here.

ANSWER
Here is the advice.`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.suggestedFollowUps).toEqual([])
    })

    test('should handle response with only ANSWER section', () => {
      // Arrange
      const response = `ANSWER
Just the answer, nothing else.`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.reasoning).toBe('')
      expect(result.answer).toContain('Just the answer')
      expect(result.suggestedFollowUps).toEqual([])
    })
  })

  describe('answer prefix handling', () => {
    test('should remove duplicate ANSWER: prefix from body', () => {
      // Arrange
      const response = `ANSWER
ANSWER: Here is the actual advice.`

      // Act
      const result = parseResponse(response)

      // Assert
      // Should have exactly one ANSWER: prefix, not two
      const answerColonCount = (result.answer.match(/ANSWER:/g) || []).length
      expect(answerColonCount).toBe(1)
    })

    test('should handle ANSWER with markdown heading', () => {
      // Arrange
      const response = `ANSWER
## Here is the advice

Some content here.`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.answer).not.toContain('##')
      expect(result.answer).toContain('Here is the advice')
    })
  })

  describe('leaked sections cleanup', () => {
    test('should strip leaked SUGGESTED FOLLOW-UPS from answer', () => {
      // Arrange
      const response = `ANSWER
Here is my advice.

Suggested Follow-ups:
- Question 1
- Question 2`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.answer).not.toContain('Suggested Follow-ups')
      expect(result.answer).toContain('Here is my advice')
    })

    test('should strip leaked GUIDELINES from answer', () => {
      // Arrange
      const response = `ANSWER
Here is my advice.

Guidelines:
1. Be confident
2. Make eye contact`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.answer).not.toContain('Guidelines:')
    })

    test('should strip leaked ANTI-PATTERNS from answer', () => {
      // Arrange
      const response = `ANSWER
Here is my advice.

Anti-patterns to avoid:
- Being needy
- Over-complimenting`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.answer).not.toContain('Anti-patterns')
    })
  })

  describe('follow-ups parsing', () => {
    test('should remove bullet points from follow-ups', () => {
      // Arrange
      const response = `ANSWER
Advice here.

SUGGESTED FOLLOW-UPS
- First question?
- Second question?
* Third question?`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.suggestedFollowUps[0]).toBe('First question?')
      expect(result.suggestedFollowUps[1]).toBe('Second question?')
      expect(result.suggestedFollowUps[2]).toBe('Third question?')
    })

    test('should truncate to maximum 3 follow-ups', () => {
      // Arrange
      const response = `ANSWER
Advice here.

SUGGESTED FOLLOW-UPS
Question 1
Question 2
Question 3
Question 4
Question 5`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.suggestedFollowUps).toHaveLength(3)
    })

    test('should filter out empty lines from follow-ups', () => {
      // Arrange
      const response = `ANSWER
Advice here.

SUGGESTED FOLLOW-UPS
Question 1

Question 2

Question 3`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.suggestedFollowUps).toEqual([
        'Question 1',
        'Question 2',
        'Question 3',
      ])
    })
  })

  describe('edge cases', () => {
    test('should handle empty response', () => {
      // Arrange
      const response = ''

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.reasoning).toBe('')
      expect(result.answer).toBe('ANSWER:')
      expect(result.suggestedFollowUps).toEqual([])
    })

    test('should handle response with INTERNAL ANALYSIS (legacy format)', () => {
      // Arrange
      const response = `INTERNAL ANALYSIS
Legacy reasoning format.

ANSWER
The advice here.`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.reasoning).toBe('Legacy reasoning format.')
    })

    test('should handle response with COACHING ANSWER (legacy format)', () => {
      // Arrange
      const response = `COACHING ANSWER
Legacy answer format.`

      // Act
      const result = parseResponse(response)

      // Assert
      expect(result.answer).toContain('Legacy answer format')
    })
  })
})
