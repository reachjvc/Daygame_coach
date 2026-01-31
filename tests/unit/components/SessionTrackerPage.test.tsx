import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionTrackerPage } from '@/src/tracking/components/SessionTrackerPage'

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockGet = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}))

// Mock useSession hook
const mockStartSession = vi.fn()
const mockEndSession = vi.fn()
const mockAddApproach = vi.fn()
const mockUpdateLastApproach = vi.fn()

vi.mock('@/src/tracking/hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    state: {
      session: null,
      approaches: [],
      isActive: false,
      isLoading: false,
      error: null,
    },
    liveStats: {
      totalApproaches: 0,
      sessionDuration: '00:00:00',
      approachesPerHour: 0,
      timeSinceLastApproach: null,
      outcomeBreakdown: { blowout: 0, short: 0, good: 0, number: 0, instadate: 0 },
      goalProgress: { current: 0, target: null, percentage: 0 },
    },
    startSession: mockStartSession,
    endSession: mockEndSession,
    addApproach: mockAddApproach,
    updateLastApproach: mockUpdateLastApproach,
  })),
}))

// Mock fetch for suggestions endpoint
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ sessionFocus: [], techniqueFocus: [], locations: [] }),
  })
))

// Import hook mock for dynamic returns
import { useSession } from '@/src/tracking/hooks/useSession'
const mockUseSession = vi.mocked(useSession)

describe('SessionTrackerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReturnValue(null)
  })

  describe('loading state', () => {
    test('should display loading spinner when loading', () => {
      // Arrange
      mockUseSession.mockReturnValue({
        state: {
          session: null,
          approaches: [],
          isActive: false,
          isLoading: true,
          error: null,
        },
        liveStats: {
          totalApproaches: 0,
          sessionDuration: '00:00:00',
          approachesPerHour: 0,
          timeSinceLastApproach: null,
          outcomeBreakdown: { blowout: 0, short: 0, good: 0, number: 0, instadate: 0 },
          goalProgress: { current: 0, target: null, percentage: 0 },
        },
        startSession: mockStartSession,
        endSession: mockEndSession,
        addApproach: mockAddApproach,
        updateLastApproach: mockUpdateLastApproach,
        setGoal: vi.fn(),
      })

      // Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.queryByTestId('start-session-button')).not.toBeInTheDocument()
    })
  })

  describe('inactive session (start screen)', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        state: {
          session: null,
          approaches: [],
          isActive: false,
          isLoading: false,
          error: null,
        },
        liveStats: {
          totalApproaches: 0,
          sessionDuration: '00:00:00',
          approachesPerHour: 0,
          timeSinceLastApproach: null,
          outcomeBreakdown: { blowout: 0, short: 0, good: 0, number: 0, instadate: 0 },
          goalProgress: { current: 0, target: null, percentage: 0 },
        },
        startSession: mockStartSession,
        endSession: mockEndSession,
        addApproach: mockAddApproach,
        updateLastApproach: mockUpdateLastApproach,
        setGoal: vi.fn(),
      })
    })

    test('should display start session button when not active', () => {
      // Arrange & Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByTestId('start-session-button')).toBeInTheDocument()
      expect(screen.getByText('Start Session')).toBeInTheDocument()
    })

    test('should display session tracker title and description', () => {
      // Arrange & Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByText('Session Tracker')).toBeInTheDocument()
      expect(screen.getByText(/Track your approaches in real-time/)).toBeInTheDocument()
    })

    test('should open start dialog when clicking start button', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)

      // Act
      await user.click(screen.getByTestId('start-session-button'))

      // Assert
      expect(screen.getByText('Start a Session')).toBeInTheDocument()
      expect(screen.getByText('Set an optional goal to keep yourself motivated.')).toBeInTheDocument()
    })

    test('should display goal presets in start dialog', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)
      await user.click(screen.getByTestId('start-session-button'))

      // Assert - check for goal preset labels (1, 3, 5, 10)
      expect(screen.getByText('Goal (optional)')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    test('should call startSession when confirming start', async () => {
      // Arrange
      mockStartSession.mockResolvedValue(true)
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)
      await user.click(screen.getByTestId('start-session-button'))

      // Act
      await user.click(screen.getByTestId('start-session-confirm'))

      // Assert
      expect(mockStartSession).toHaveBeenCalled()
    })

    test('should call startSession with goal when custom goal entered', async () => {
      // Arrange
      mockStartSession.mockResolvedValue(true)
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)
      await user.click(screen.getByTestId('start-session-button'))

      // Act
      await user.type(screen.getByTestId('session-goal-input'), '7')
      await user.click(screen.getByTestId('start-session-confirm'))

      // Assert
      expect(mockStartSession).toHaveBeenCalledWith(
        expect.objectContaining({ goal: 7 })
      )
    })

    test('should display error message when start fails', async () => {
      // Arrange
      mockUseSession.mockReturnValue({
        state: {
          session: null,
          approaches: [],
          isActive: false,
          isLoading: false,
          error: 'Failed to start session',
        },
        liveStats: {
          totalApproaches: 0,
          sessionDuration: '00:00:00',
          approachesPerHour: 0,
          timeSinceLastApproach: null,
          outcomeBreakdown: { blowout: 0, short: 0, good: 0, number: 0, instadate: 0 },
          goalProgress: { current: 0, target: null, percentage: 0 },
        },
        startSession: mockStartSession,
        endSession: mockEndSession,
        addApproach: mockAddApproach,
        updateLastApproach: mockUpdateLastApproach,
        setGoal: vi.fn(),
      })
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)

      // Act
      await user.click(screen.getByTestId('start-session-button'))

      // Assert
      expect(screen.getByText('Failed to start session')).toBeInTheDocument()
    })

    test('should auto-open dialog when autostart param is true', () => {
      // Arrange
      mockGet.mockReturnValue('true')

      // Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByText('Start a Session')).toBeInTheDocument()
    })
  })

  describe('active session', () => {
    const activeSessionState = {
      state: {
        session: {
          id: 'session-123',
          user_id: 'user-123',
          started_at: new Date().toISOString(),
          ended_at: null,
          goal: 5,
          primary_location: 'Downtown',
          session_focus: null,
          technique_focus: null,
          if_then_plan: null,
          custom_intention: null,
          pre_session_mood: null,
          post_session_mood: null,
          created_at: new Date().toISOString(),
        },
        approaches: [],
        isActive: true,
        isLoading: false,
        error: null,
      },
      liveStats: {
        totalApproaches: 0,
        sessionDuration: '00:05:30',
        approachesPerHour: 0,
        timeSinceLastApproach: null,
        outcomeBreakdown: { blowout: 0, short: 0, good: 0, number: 0, instadate: 0 },
        goalProgress: { current: 0, target: 5, percentage: 0 },
      },
      startSession: mockStartSession,
      endSession: mockEndSession,
      addApproach: mockAddApproach,
      updateLastApproach: mockUpdateLastApproach,
      setGoal: vi.fn(),
    }

    beforeEach(() => {
      mockUseSession.mockReturnValue(activeSessionState)
    })

    test('should display tap approach button when session active', () => {
      // Arrange & Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByTestId('tap-approach-button')).toBeInTheDocument()
      expect(screen.getByText('TAP FOR APPROACH')).toBeInTheDocument()
    })

    test('should display approach counter', () => {
      // Arrange & Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByTestId('approach-counter')).toHaveTextContent('0')
    })

    test('should display session duration', () => {
      // Arrange & Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByTestId('session-duration')).toHaveTextContent('00:05:30')
    })

    test('should display end session button', () => {
      // Arrange & Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByTestId('end-session-button')).toBeInTheDocument()
    })

    test('should display location when provided', () => {
      // Arrange & Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByText('Downtown')).toBeInTheDocument()
    })

    test('should display goal progress when goal set', () => {
      // Arrange & Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByText('Goal Progress')).toBeInTheDocument()
      expect(screen.getByText('0 / 5')).toBeInTheDocument()
    })

    test('should call addApproach when tapping approach button', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)

      // Act
      await user.click(screen.getByTestId('tap-approach-button'))

      // Assert
      expect(mockAddApproach).toHaveBeenCalled()
    })

    test('should show quick log modal after tapping approach', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)

      // Act
      await user.click(screen.getByTestId('tap-approach-button'))

      // Assert
      expect(screen.getByTestId('quick-log-modal')).toBeInTheDocument()
      expect(screen.getByText('Quick Log')).toBeInTheDocument()
    })

    test('should display approach counter with correct count', () => {
      // Arrange
      mockUseSession.mockReturnValue({
        ...activeSessionState,
        liveStats: {
          ...activeSessionState.liveStats,
          totalApproaches: 3,
          goalProgress: { current: 3, target: 5, percentage: 60 },
        },
      })

      // Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByTestId('approach-counter')).toHaveTextContent('3')
      expect(screen.getByText('3 / 5')).toBeInTheDocument()
    })

    test('should open end session dialog when clicking end button', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)

      // Act
      await user.click(screen.getByTestId('end-session-button'))

      // Assert
      expect(screen.getByText('End Session?')).toBeInTheDocument()
    })

    test('should display goal achieved message when goal reached', () => {
      // Arrange
      mockUseSession.mockReturnValue({
        ...activeSessionState,
        liveStats: {
          ...activeSessionState.liveStats,
          totalApproaches: 5,
          goalProgress: { current: 5, target: 5, percentage: 100 },
        },
      })

      // Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByText('Goal achieved! Keep going!')).toBeInTheDocument()
    })
  })

  describe('quick log modal', () => {
    const activeSessionState = {
      state: {
        session: {
          id: 'session-123',
          user_id: 'user-123',
          started_at: new Date().toISOString(),
          ended_at: null,
          goal: null,
          primary_location: null,
          session_focus: null,
          technique_focus: null,
          if_then_plan: null,
          custom_intention: null,
          pre_session_mood: null,
          post_session_mood: null,
          created_at: new Date().toISOString(),
        },
        approaches: [],
        isActive: true,
        isLoading: false,
        error: null,
      },
      liveStats: {
        totalApproaches: 0,
        sessionDuration: '00:00:00',
        approachesPerHour: 0,
        timeSinceLastApproach: null,
        outcomeBreakdown: { blowout: 0, short: 0, good: 0, number: 0, instadate: 0 },
        goalProgress: { current: 0, target: null, percentage: 0 },
      },
      startSession: mockStartSession,
      endSession: mockEndSession,
      addApproach: mockAddApproach,
      updateLastApproach: mockUpdateLastApproach,
      setGoal: vi.fn(),
    }

    beforeEach(() => {
      mockUseSession.mockReturnValue(activeSessionState)
    })

    test('should display outcome options in quick log', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)
      await user.click(screen.getByTestId('tap-approach-button'))

      // Assert
      expect(screen.getByText('Outcome')).toBeInTheDocument()
      expect(screen.getByText(/Blowout/)).toBeInTheDocument()
      expect(screen.getByText(/Number/)).toBeInTheDocument()
    })

    test('should display mood options in quick log', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)
      await user.click(screen.getByTestId('tap-approach-button'))

      // Assert
      expect(screen.getByText('Your Mood')).toBeInTheDocument()
    })

    test('should display tags in quick log', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)
      await user.click(screen.getByTestId('tap-approach-button'))

      // Assert
      expect(screen.getByText('Tags')).toBeInTheDocument()
    })

    test('should close quick log when clicking skip', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)
      await user.click(screen.getByTestId('tap-approach-button'))

      // Act
      await user.click(screen.getByText('Skip'))

      // Assert
      expect(screen.queryByTestId('quick-log-modal')).not.toBeInTheDocument()
    })

    test('should call updateLastApproach when saving quick log with data', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)
      await user.click(screen.getByTestId('tap-approach-button'))

      // Act - select an outcome
      await user.click(screen.getByText(/Number/))
      await user.click(screen.getByTestId('quick-log-save'))

      // Assert
      expect(mockUpdateLastApproach).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'number' })
      )
    })
  })

  describe('recent approaches', () => {
    test('should display recent approaches list when approaches exist', () => {
      // Arrange
      mockUseSession.mockReturnValue({
        state: {
          session: {
            id: 'session-123',
            user_id: 'user-123',
            started_at: new Date().toISOString(),
            ended_at: null,
            goal: null,
            primary_location: null,
            session_focus: null,
            technique_focus: null,
            if_then_plan: null,
            custom_intention: null,
            pre_session_mood: null,
            post_session_mood: null,
            created_at: new Date().toISOString(),
          },
          approaches: [
            {
              id: 'approach-1',
              user_id: 'user-123',
              session_id: 'session-123',
              timestamp: new Date().toISOString(),
              outcome: 'number',
              set_type: null,
              mood: 4,
              tags: null,
              latitude: null,
              longitude: null,
              note: null,
              voice_note_url: null,
              created_at: new Date().toISOString(),
            },
          ],
          isActive: true,
          isLoading: false,
          error: null,
        },
        liveStats: {
          totalApproaches: 1,
          sessionDuration: '00:10:00',
          approachesPerHour: 6,
          timeSinceLastApproach: '00:02:00',
          outcomeBreakdown: { blowout: 0, short: 0, good: 0, number: 1, instadate: 0 },
          goalProgress: { current: 1, target: null, percentage: 0 },
        },
        startSession: mockStartSession,
        endSession: mockEndSession,
        addApproach: mockAddApproach,
        updateLastApproach: mockUpdateLastApproach,
        setGoal: vi.fn(),
      })

      // Act
      render(<SessionTrackerPage userId="user-123" />)

      // Assert
      expect(screen.getByText('Recent Approaches')).toBeInTheDocument()
      expect(screen.getByText('#1')).toBeInTheDocument()
    })
  })

  describe('end session flow', () => {
    const activeSessionState = {
      state: {
        session: {
          id: 'session-123',
          user_id: 'user-123',
          started_at: new Date().toISOString(),
          ended_at: null,
          goal: 5,
          primary_location: null,
          session_focus: null,
          technique_focus: null,
          if_then_plan: null,
          custom_intention: null,
          pre_session_mood: null,
          post_session_mood: null,
          created_at: new Date().toISOString(),
        },
        approaches: [],
        isActive: true,
        isLoading: false,
        error: null,
      },
      liveStats: {
        totalApproaches: 3,
        sessionDuration: '00:30:00',
        approachesPerHour: 6,
        timeSinceLastApproach: '00:05:00',
        outcomeBreakdown: { blowout: 0, short: 1, good: 1, number: 1, instadate: 0 },
        goalProgress: { current: 3, target: 5, percentage: 60 },
      },
      startSession: mockStartSession,
      endSession: mockEndSession,
      addApproach: mockAddApproach,
      updateLastApproach: mockUpdateLastApproach,
      setGoal: vi.fn(),
    }

    beforeEach(() => {
      mockUseSession.mockReturnValue(activeSessionState)
    })

    test('should display session summary in end dialog', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)

      // Act
      await user.click(screen.getByTestId('end-session-button'))

      // Assert
      expect(screen.getByText(/You've logged 3 approaches in 00:30:00/)).toBeInTheDocument()
    })

    test('should display goal achieved message in end dialog when goal met', async () => {
      // Arrange
      mockUseSession.mockReturnValue({
        ...activeSessionState,
        liveStats: {
          ...activeSessionState.liveStats,
          totalApproaches: 5,
          goalProgress: { current: 5, target: 5, percentage: 100 },
        },
      })
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)

      // Act
      await user.click(screen.getByTestId('end-session-button'))

      // Assert
      expect(screen.getByText('You hit your goal!')).toBeInTheDocument()
    })

    test('should provide option to write field report', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)

      // Act
      await user.click(screen.getByTestId('end-session-button'))

      // Assert
      expect(screen.getByText('Write Field Report')).toBeInTheDocument()
    })

    test('should call endSession and navigate when ending session', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)
      await user.click(screen.getByTestId('end-session-button'))

      // Act
      await user.click(screen.getByText('End Session'))

      // Assert
      expect(mockPush).toHaveBeenCalledWith('/dashboard/tracking')
      expect(mockEndSession).toHaveBeenCalled()
    })

    test('should close end dialog when clicking Keep Going', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<SessionTrackerPage userId="user-123" />)
      await user.click(screen.getByTestId('end-session-button'))

      // Act
      await user.click(screen.getByText('Keep Going'))

      // Assert
      expect(screen.queryByText('End Session?')).not.toBeInTheDocument()
    })
  })
})
