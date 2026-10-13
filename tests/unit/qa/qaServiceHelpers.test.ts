import { describe, test, expect } from 'vitest'
import {
  addCoachNamesToSourceCitations,
  createMetaCognition,
} from '@/src/qa/qaService'
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
// addCoachNamesToSourceCitations tests
// ============================================

describe('addCoachNamesToSourceCitations', () => {
  describe('basic citation replacement', () => {
    test('should add coach name to single citation', () => {
      // Arrange
      const answer = 'Use direct openers (source 1).'
      const chunks = [createChunk({ metadata: { coach: 'SocialStoic' } })]

      // Act
      const result = addCoachNamesToSourceCitations(answer, chunks)

      // Assert
      expect(result).toBe('Use direct openers (SocialStoic — source 1).')
    })

    test('should add coach names to multiple citations', () => {
      // Arrange
      const answer = 'Be direct (source 1) and confident (source 2).'
      const chunks = [
        createChunk({ chunkId: 'c1', metadata: { coach: 'Coach1' } }),
        createChunk({ chunkId: 'c2', metadata: { coach: 'Coach2' } }),
      ]

      // Act
      const result = addCoachNamesToSourceCitations(answer, chunks)

      // Assert
      expect(result).toContain('(Coach1 — source 1)')
      expect(result).toContain('(Coach2 — source 2)')
    })
  })

  describe('no citations', () => {
    test('should return unchanged answer when no citations present', () => {
      // Arrange
      const answer = 'Just be confident and approach directly.'
      const chunks = [createChunk()]

      // Act
      const result = addCoachNamesToSourceCitations(answer, chunks)

      // Assert
      expect(result).toBe(answer)
    })
  })

  describe('missing coach metadata', () => {
    test('should use "Unknown Coach" when coach is missing', () => {
      // Arrange
      const answer = 'Use this technique (source 1).'
      const chunks = [createChunk({ metadata: {} })]

      // Act
      const result = addCoachNamesToSourceCitations(answer, chunks)

      // Assert
      expect(result).toBe('Use this technique (Unknown Coach — source 1).')
    })
  })

  describe('citation format variations', () => {
    test('should handle citation with extra spaces', () => {
      // Arrange
      const answer = 'Use this ( source 1 ).'
      const chunks = [createChunk({ metadata: { coach: 'TestCoach' } })]

      // Act
      const result = addCoachNamesToSourceCitations(answer, chunks)

      // Assert
      expect(result).toBe('Use this (TestCoach — source 1).')
    })

    test('should handle uppercase SOURCE', () => {
      // Arrange
      const answer = 'Use this (SOURCE 1).'
      const chunks = [createChunk({ metadata: { coach: 'TestCoach' } })]

      // Act
      const result = addCoachNamesToSourceCitations(answer, chunks)

      // Assert
      expect(result).toBe('Use this (TestCoach — source 1).')
    })
  })

  describe('out of range citations', () => {
    test('should leave citation unchanged if source number exceeds chunks', () => {
      // Arrange
      const answer = 'Use this (source 5).'
      const chunks = [createChunk()]

      // Act
      const result = addCoachNamesToSourceCitations(answer, chunks)

      // Assert
      expect(result).toBe('Use this (source 5).')
    })
  })
})

// ============================================
// createMetaCognition tests
// ============================================

describe('createMetaCognition', () => {
  describe('reasoning handling', () => {
    test('should use provided reasoning when present', () => {
      // Arrange
      const reasoning = 'I used sources 1 and 2 for this answer.'
      const chunks = [createChunk()]
      const followUps: string[] = []

      // Act
      const result = createMetaCognition(reasoning, chunks, followUps)

      // Assert
      expect(result.reasoning).toBe(reasoning)
    })

    test('should generate fallback reasoning when reasoning is empty', () => {
      // Arrange
      const reasoning = ''
      const chunks = [
        createChunk({
          metadata: { coach: 'TestCoach', topic: 'openers' },
          relevanceScore: 0.85,
        }),
      ]
      const followUps: string[] = []

      // Act
      const result = createMetaCognition(reasoning, chunks, followUps)

      // Assert
      expect(result.reasoning).toContain('Built this answer')
      expect(result.reasoning).toContain('TestCoach')
    })
  })

  describe('limitations based on coaches', () => {
    test('should mention single coach perspective when only one coach', () => {
      // Arrange
      const chunks = [
        createChunk({ chunkId: 'c1', metadata: { coach: 'SocialStoic' } }),
        createChunk({ chunkId: 'c2', metadata: { coach: 'SocialStoic' } }),
      ]

      // Act
      const result = createMetaCognition('reasoning', chunks, [])

      // Assert
      expect(result.limitations).toContain("SocialStoic's approach")
      expect(result.limitations).toContain('Other coaches may have different')
    })

    test('should list multiple coaches when sources from different coaches', () => {
      // Arrange
      const chunks = [
        createChunk({ chunkId: 'c1', metadata: { coach: 'Coach1' } }),
        createChunk({ chunkId: 'c2', metadata: { coach: 'Coach2' } }),
      ]

      // Act
      const result = createMetaCognition('reasoning', chunks, [])

      // Assert
      expect(result.limitations).toContain('synthesizes advice')
      expect(result.limitations).toContain('Coach1')
      expect(result.limitations).toContain('Coach2')
    })

    test('should handle chunks with no coach metadata', () => {
      // Arrange
      const chunks = [createChunk({ metadata: {} })]

      // Act
      const result = createMetaCognition('reasoning', chunks, [])

      // Assert
      expect(result.limitations).toContain('Limited metadata')
    })
  })

  describe('suggested follow-ups', () => {
    test('should use provided follow-ups when present', () => {
      // Arrange
      const followUps = ['Question 1?', 'Question 2?']

      // Act
      const result = createMetaCognition('reasoning', [createChunk()], followUps)

      // Assert
      expect(result.suggestedFollowUps).toEqual(followUps)
    })

    test('should provide default follow-ups when none provided', () => {
      // Arrange
      const followUps: string[] = []

      // Act
      const result = createMetaCognition('reasoning', [createChunk()], followUps)

      // Assert
      expect(result.suggestedFollowUps.length).toBeGreaterThan(0)
      expect(result.suggestedFollowUps[0]).toContain('?')
    })
  })

  describe('fallback reasoning details', () => {
    test('should include relevance score in fallback reasoning', () => {
      // Arrange
      const chunks = [createChunk({ relevanceScore: 0.92 })]

      // Act
      const result = createMetaCognition('', chunks, [])

      // Assert
      expect(result.reasoning).toContain('92%')
    })

    test('should include topic in fallback reasoning when present', () => {
      // Arrange
      const chunks = [createChunk({ metadata: { coach: 'Coach1', topic: 'openers' } })]

      // Act
      const result = createMetaCognition('', chunks, [])

      // Assert
      expect(result.reasoning).toContain('openers')
    })
  })
})
