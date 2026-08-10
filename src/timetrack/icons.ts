/**
 * Single lucide-react import point for the time-tracking sandbox.
 *
 * Keeping every icon import in one module means the slice declares its icon
 * vocabulary in one place instead of scattering lucide imports across ~10
 * component files. Names are aliased to the role they play here.
 */

import {
  AlertTriangle,
  ArrowUpDown,
  Archive,
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  Clock,
  Coffee,
  Copy,
  Download,
  Filter,
  FileText,
  FolderKanban,
  Hash,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Scissors,
  Search,
  Settings,
  Square,
  Star,
  TrendingUp,
  Trash2,
  Upload,
  UserRound,
  X,
  Zap,
} from "lucide-react"

export const IconStart = Play
export const IconStop = Square
/**
 * `Timer` and `CalendarClock` are already used elsewhere in the app but are not
 * in src/shared/iconRoles.ts, so this slice reuses the registered `Clock`
 * (approved role: "duration/time display") for both timer affordances.
 */
export const IconTimer = Clock
export const IconClock = Clock
export const IconCalendar = CalendarDays
export const IconReports = FileText
export const IconProjects = FolderKanban
export const IconClient = UserRound
export const IconTag = Hash
export const IconTeam = UserRound
export const IconSettings = Settings
export const IconFavorite = Star
export const IconAdd = Plus
export const IconClose = X
export const IconDelete = Trash2
export const IconMenu = MoreVertical
export const IconCheck = Check
export const IconDown = ChevronDown
export const IconUp = ChevronUp
export const IconPrev = ChevronLeft
export const IconNext = ChevronRight
export const IconSearch = Search
export const IconFilter = Filter
export const IconExport = Download
export const IconImport = Upload
export const IconList = List
export const IconGrid = LayoutGrid
export const IconEdit = Pencil
export const IconDuplicate = Copy
export const IconSplit = Scissors
export const IconUndo = RotateCcw
export const IconArchive = Archive
export const IconAlert = AlertTriangle
export const IconBell = BellRing
export const IconMoney = CircleDollarSign
export const IconTrend = TrendingUp
export const IconSort = ArrowUpDown
export const IconLink = Link2
export const IconBreak = Coffee
export const IconAuto = Zap
export const IconSpinner = Loader2
