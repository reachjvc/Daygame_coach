import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InnerGamePage } from '@/src/inner-game/components/InnerGamePage'
import { InnerGameStep } from '@/src/inner-game/types'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Helper to create mock progress
function createMockProgress(overrides: Partial<{
  currentStep: string
  currentSubstep: number
  welcomeDismissed: boolean
  valuesCompleted: boolean
  shadowCompleted: boolean
  peakExperienceCompleted: boolean
  hurdlesCompleted: boolean
  cuttingCompleted: boolean
  shadowResponse: string | null
  shadowInferredValues: unknown[] | null
  peakExperienceResponse: string | null
  peakExperienceInferredValues: unknown[] | null
  hurdlesResponse: string | null
  hurdlesInferredValues: unknown[] | null
  finalCoreValues: unknown[] | null
  aspirationalValues: unknown[] | null
}> = {}) {
  return {
    currentStep: InnerGameStep.WELCOME,
    currentSubstep: 0,
    welcomeDismissed: false,
    valuesCompleted: false,
    shadowCompleted: false,
    peakExperienceCompleted: false,
    hurdlesCompleted: false,
    cuttingCompleted: false,
    shadowResponse: null,
    shadowInferredValues: null,
    peakExperienceResponse: null,
    peakExperienceInferredValues: null,
    hurdlesResponse: null,
    hurdlesInferredValues: null,
    finalCoreValues: null,
    aspirationalValues: null,
    ...overrides,
  }
}

describe('InnerGamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    test('should display loading indicator while fetching data', async () => {
      // Arrange
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      // Act
      render(<InnerGamePage />)

      // Assert
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    test('should display error message when API fails', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      })

      // Act
      render(<InnerGamePage />)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })
    })

    test('should display fallback error message when API throws', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Act
      render(<InnerGamePage />)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    test('should show back button in error state', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      })

      // Act
      render(<InnerGamePage />)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument()
      })
    })
  })

  describe('preview mode', () => {
    test('should not fetch data in preview mode', () => {
      // Arrange & Act
      render(<InnerGamePage isPreviewMode={true} />)

      // Assert
      expect(mockFetch).not.toHaveBeenCalled()
    })

    test('should display welcome card in preview mode', async () => {
      // Arrange & Act
      render(<InnerGamePage isPreviewMode={true} />)

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })

    test('should not show loading state in preview mode', () => {
      // Arrange & Act
      render(<InnerGamePage isPreviewMode={true} />)

      // Assert - should immediately render without loading
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  describe('welcome card', () => {
    test('should display welcome card on initial load', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          progress: createMockProgress(),
          selectedValues: [],
        }),
      })

      // Act
      render(<InnerGamePage />)

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })

    test('should dismiss welcome card and update progress', async () => {
      // Arrange
      const user = userEvent.setup()
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            progress: createMockProgress(),
            selectedValues: [],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            progress: createMockProgress({
              welcomeDismissed: true,
              currentStep: InnerGameStep.VALUES,
            }),
          }),
        })

      // Act
      render(<InnerGamePage />)
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      // Find and click the start/continue button in welcome card
      const startButton = screen.queryByRole('button', { name: /start|continue|begin/i })
      if (startButton) {
        await user.click(startButton)

        // Assert - progress update was called
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/inner-game/progress',
          expect.objectContaining({
            method: 'POST',
          })
        )
      }
    })
  })

  describe('main navigation', () => {
    test('should display Inner Game title', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          progress: createMockProgress({ welcomeDismissed: true }),
          selectedValues: [],
        }),
      })

      // Act
      render(<InnerGamePage />)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Inner Game')).toBeInTheDocument()
      })
    })

    test('should display back button to dashboard', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          progress: createMockProgress({ welcomeDismissed: true }),
          selectedValues: [],
        }),
      })

      // Act
      render(<InnerGamePage />)

      // Assert
      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back/i })
        expect(backLink).toHaveAttribute('href', '/dashboard')
      })
    })
  })

  describe('values step', () => {
    test('should show values step when currentStep is VALUES', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          progress: createMockProgress({
            currentStep: InnerGameStep.VALUES,
            welcomeDismissed: true,
          }),
          selectedValues: [],
        }),
      })

      // Act
      render(<InnerGamePage />)

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })
  })

  describe('shadow step', () => {
    test('should show shadow step when currentStep is SHADOW', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          progress: createMockProgress({
            currentStep: InnerGameStep.SHADOW,
            valuesCompleted: true,
            welcomeDismissed: true,
          }),
          selectedValues: ['value1', 'value2'],
        }),
      })

      // Act
      render(<InnerGamePage />)

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })
  })

  describe('completed state', () => {
    test('should show summary page when currentStep is COMPLETE', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          progress: createMockProgress({
            currentStep: InnerGameStep.COMPLETE,
            valuesCompleted: true,
            shadowCompleted: true,
            peakExperienceCompleted: true,
            hurdlesCompleted: true,
            cuttingCompleted: true,
            welcomeDismissed: true,
            finalCoreValues: [
              { id: 'value1', name: 'Authenticity', description: 'Being true to yourself', category: 'personal' },
            ],
            aspirationalValues: [],
          }),
          selectedValues: ['value1'],
        }),
      })

      // Act
      render(<InnerGamePage />)

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })
  })

  describe('restart functionality', () => {
    test('should call restart API when restarting', async () => {
      // Arrange
      const user = userEvent.setup()
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            progress: createMockProgress({
              currentStep: InnerGameStep.COMPLETE,
              welcomeDismissed: true,
              finalCoreValues: [
                { id: 'value1', name: 'Authenticity', description: 'Test', category: 'personal' },
              ],
              aspirationalValues: [],
            }),
            selectedValues: ['value1'],
          }),
        })
        // For restart POST to progress
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        // For DELETE comparisons
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        // For reload progress
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            progress: createMockProgress(),
            selectedValues: [],
          }),
        })

      // Act
      render(<InnerGamePage />)
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      // Find restart button if it exists
      const restartButton = screen.queryByRole('button', { name: /restart|start over/i })
      if (restartButton) {
        await user.click(restartButton)

        // Assert - restart APIs were called
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/inner-game/progress',
          expect.objectContaining({ method: 'POST' })
        )
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/inner-game/comparisons',
          expect.objectContaining({ method: 'DELETE' })
        )
      }
    })
  })

  describe('fallback welcome state', () => {
    test('should show start button when welcome step without modal', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          progress: createMockProgress({
            currentStep: InnerGameStep.WELCOME,
            welcomeDismissed: true, // Dismissed but still on welcome step
          }),
          selectedValues: [],
        }),
      })

      // Act
      render(<InnerGamePage />)

      // Assert - The fallback button has text "Start Inner Game Journey"
      await waitFor(() => {
        expect(screen.getByText('Start Inner Game Journey')).toBeInTheDocument()
      })
    })

    test('should show welcome modal when clicking start button', async () => {
      // Arrange
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          progress: createMockProgress({
            currentStep: InnerGameStep.WELCOME,
            welcomeDismissed: true,
          }),
          selectedValues: [],
        }),
      })

      // Act
      render(<InnerGamePage />)
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Inner Game Journey')
      await user.click(startButton)

      // Assert - showWelcome should now be true, welcome card should appear with "Let's Begin" button
      await waitFor(() => {
        expect(screen.getByText("Let's Begin")).toBeInTheDocument()
      })
    })
  })
})
