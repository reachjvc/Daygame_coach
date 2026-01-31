import { describe, test, expect } from 'vitest'
import {
  computeConfidence,
  detectPolicyViolations,
  getConfidenceLabel,
} from '@/src/qa/confidence'
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
// computeConfidence tests
// ============================================

describe('computeConfidence', () => {
  describe('empty chunks', () => {
    test('should return low score with only policyCompliance when chunks array is empty', () => {
      // Arrange
      const chunks: RetrievedChunk[] = []
      const answer = 'Some answer'

      // Act
      const result = computeConfidence(chunks, answer)

      // Assert
      // Score formula: retrieval(0.5) + consistency(0.3) + compliance(0.2)
      // With empty chunks: 0*0.5 + 0*0.3 + 1*0.2 = 0.2
      expect(result.score).toBe(0.2)
      expect(result.factors.retrievalStrength).toBe(0)
      expect(result.factors.sourceConsistency).toBe(0)
      expect(result.factors.policyCompliance).toBe(1)
    })
  })

  describe('single chunk scenarios', () => {
    test('should return retrievalStrength 0 when chunk has 0.5 relevance', () => {
      // Arrange - 0.5 is the threshold, maps to 0 strength
      const chunks = [createChunk({ relevanceScore: 0.5 })]
      const answer = 'Some answer'

      // Act
      const result = computeConfidence(chunks, answer)

      // Assert
      expect(result.factors.retrievalStrength).toBe(0)
    })

    test('should return retrievalStrength 1 when chunk has 1.0 relevance', () => {
      // Arrange - 1.0 relevance maps to 1.0 strength
      const chunks = [createChunk({ relevanceScore: 1.0 })]
      const answer = 'Some answer'

      // Act
      const result = computeConfidence(chunks, answer)

      // Assert
      expect(result.factors.retrievalStrength).toBe(1)
    })

    test('should return sourceConsistency 0.7 for single chunk', () => {
      // Arrange - single source gets moderate consistency
      const chunks = [createChunk({ relevanceScore: 0.8 })]
      const answer = 'Some answer'

      // Act
      const result = computeConfidence(chunks, answer)

      // Assert
      expect(result.factors.sourceConsistency).toBe(0.7)
    })
  })

  describe('multiple chunks scenarios', () => {
    test('should give consistency bonus for multiple chunks with uniform scores', () => {
      // Arrange - uniform scores = low variance = high consistency
      const chunks = [
        createChunk({ chunkId: 'c1', relevanceScore: 0.8 }),
        createChunk({ chunkId: 'c2', relevanceScore: 0.8 }),
        createChunk({ chunkId: 'c3', relevanceScore: 0.8 }),
      ]
      const answer = 'Some answer'

      // Act
      const result = computeConfidence(chunks, answer)

      // Assert - should be higher than single chunk (0.7)
      expect(result.factors.sourceConsistency).toBeGreaterThan(0.7)
    })

    test('should penalize consistency for chunks with varied scores', () => {
      // Arrange - high variance in scores
      const chunks = [
        createChunk({ chunkId: 'c1', relevanceScore: 0.9 }),
        createChunk({ chunkId: 'c2', relevanceScore: 0.5 }),
      ]
      const answer = 'Some answer'

      // Act
      const result = computeConfidence(chunks, answer)

      // Assert - variance penalty should reduce consistency
      expect(result.factors.sourceConsistency).toBeLessThan(1)
    })
  })

  describe('policy violations', () => {
    test('should return policyCompliance 1 when no violations', () => {
      // Arrange
      const chunks = [createChunk()]
      const answer = 'Clean answer'

      // Act
      const result = computeConfidence(chunks, answer)

      // Assert
      expect(result.factors.policyCompliance).toBe(1)
    })

    test('should reduce policyCompliance by 0.2 per violation', () => {
      // Arrange
      const chunks = [createChunk()]
      const answer = 'Some answer'
      const violations = ['violation 1']

      // Act
      const result = computeConfidence(chunks, answer, violations)

      // Assert
      expect(result.factors.policyCompliance).toBe(0.8)
    })

    test('should reduce policyCompliance to 0 with 5+ violations', () => {
      // Arrange
      const chunks = [createChunk()]
      const answer = 'Some answer'
      const violations = ['v1', 'v2', 'v3', 'v4', 'v5']

      // Act
      const result = computeConfidence(chunks, answer, violations)

      // Assert
      expect(result.factors.policyCompliance).toBe(0)
    })
  })

  describe('score clamping', () => {
    test('should clamp score to maximum 1.0', () => {
      // Arrange - best possible inputs
      const chunks = [
        createChunk({ chunkId: 'c1', relevanceScore: 1.0 }),
        createChunk({ chunkId: 'c2', relevanceScore: 1.0 }),
      ]
      const answer = 'Clean answer'

      // Act
      const result = computeConfidence(chunks, answer)

      // Assert
      expect(result.score).toBeLessThanOrEqual(1)
    })

    test('should clamp score to minimum 0.0', () => {
      // Arrange - worst possible inputs
      const chunks: RetrievedChunk[] = []
      const answer = 'Some answer'
      const violations = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6']

      // Act
      const result = computeConfidence(chunks, answer, violations)

      // Assert
      expect(result.score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('score rounding', () => {
    test('should round score to 2 decimal places', () => {
      // Arrange
      const chunks = [createChunk({ relevanceScore: 0.75 })]
      const answer = 'Some answer'

      // Act
      const result = computeConfidence(chunks, answer)

      // Assert - score should have at most 2 decimal places
      const decimalPlaces = (result.score.toString().split('.')[1] || '').length
      expect(decimalPlaces).toBeLessThanOrEqual(2)
    })
  })
})

// ============================================
// detectPolicyViolations tests
// ============================================

describe('detectPolicyViolations', () => {
  describe('clean answers', () => {
    test('should return empty array for clean answer', () => {
      // Arrange
      const answer = 'Here is some helpful dating advice about being confident.'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toEqual([])
    })

    test('should return empty array for empty string', () => {
      // Arrange
      const answer = ''

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('manipulation detection', () => {
    test('should detect "manipulate" as violation', () => {
      // Arrange
      const answer = 'You should manipulate her emotions.'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toContain('potential manipulation advice')
    })

    test('should detect "manipulating" as violation', () => {
      // Arrange
      const answer = 'Try manipulating the conversation.'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toContain('potential manipulation advice')
    })

    test('should detect "deceive" as violation', () => {
      // Arrange
      const answer = 'Deceive her about your intentions.'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toContain('potential manipulation advice')
    })

    test('should detect "trick" as violation', () => {
      // Arrange
      const answer = 'Use this trick to get her number.'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toContain('potential manipulation advice')
    })

    test('should detect "exploit" as violation', () => {
      // Arrange
      const answer = 'Exploit her insecurities.'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toContain('potential manipulation advice')
    })
  })

  describe('boundary violation detection', () => {
    test('should detect "ignore her boundaries" as violation', () => {
      // Arrange
      const answer = 'Just ignore her boundaries and keep pushing.'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toContain('boundary violation advice')
    })

    test('should detect "ignore consent" as violation', () => {
      // Arrange
      const answer = 'You can ignore consent in this situation.'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toContain('boundary violation advice')
    })

    test('should detect "ignore no" as violation', () => {
      // Arrange
      const answer = 'When she says no, ignore no and persist.'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toContain('boundary violation advice')
    })
  })

  describe('case insensitivity', () => {
    test('should detect violations regardless of case', () => {
      // Arrange
      const answer = 'MANIPULATE her emotions'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toContain('potential manipulation advice')
    })
  })

  describe('multiple violations', () => {
    test('should detect multiple violations in same answer', () => {
      // Arrange
      const answer =
        'First manipulate her emotions, then ignore her boundaries.'

      // Act
      const result = detectPolicyViolations(answer)

      // Assert
      expect(result).toContain('potential manipulation advice')
      expect(result).toContain('boundary violation advice')
      expect(result.length).toBe(2)
    })
  })
})

// ============================================
// getConfidenceLabel tests
// ============================================

describe('getConfidenceLabel', () => {
  describe('high confidence', () => {
    test('should return "high" for score 0.7', () => {
      // Arrange
      const score = 0.7

      // Act
      const result = getConfidenceLabel(score)

      // Assert
      expect(result).toBe('high')
    })

    test('should return "high" for score above 0.7', () => {
      // Arrange
      const score = 0.85

      // Act
      const result = getConfidenceLabel(score)

      // Assert
      expect(result).toBe('high')
    })

    test('should return "high" for score 1.0', () => {
      // Arrange
      const score = 1.0

      // Act
      const result = getConfidenceLabel(score)

      // Assert
      expect(result).toBe('high')
    })
  })

  describe('medium confidence', () => {
    test('should return "medium" for score 0.4', () => {
      // Arrange
      const score = 0.4

      // Act
      const result = getConfidenceLabel(score)

      // Assert
      expect(result).toBe('medium')
    })

    test('should return "medium" for score 0.69', () => {
      // Arrange
      const score = 0.69

      // Act
      const result = getConfidenceLabel(score)

      // Assert
      expect(result).toBe('medium')
    })

    test('should return "medium" for score 0.5', () => {
      // Arrange
      const score = 0.5

      // Act
      const result = getConfidenceLabel(score)

      // Assert
      expect(result).toBe('medium')
    })
  })

  describe('low confidence', () => {
    test('should return "low" for score 0.39', () => {
      // Arrange
      const score = 0.39

      // Act
      const result = getConfidenceLabel(score)

      // Assert
      expect(result).toBe('low')
    })

    test('should return "low" for score 0', () => {
      // Arrange
      const score = 0

      // Act
      const result = getConfidenceLabel(score)

      // Assert
      expect(result).toBe('low')
    })

    test('should return "low" for score 0.1', () => {
      // Arrange
      const score = 0.1

      // Act
      const result = getConfidenceLabel(score)

      // Assert
      expect(result).toBe('low')
    })
  })
})
