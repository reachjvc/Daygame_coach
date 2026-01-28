"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  User,
  Settings,
  Sliders,
  CreditCard,
  Trophy,
  TrendingUp,
  Target,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { SandboxSettings } from "@/src/encounters"
import { PRODUCTS } from "@/src/home"
import type { SettingsPageProps } from "../types"
import { DIFFICULTY_OPTIONS, LEVEL_TITLES } from "../types"

interface SettingsPageClientProps extends SettingsPageProps {
  onUpdateSandboxSettings: (settings: Partial<SandboxSettings>) => Promise<void>
  onResetSandboxSettings: () => Promise<void>
  onUpdateDifficulty: (difficulty: string) => Promise<void>
  onCancelSubscription: () => Promise<{ success: boolean }>
  onReactivateSubscription: () => Promise<{ success: boolean }>
  onOpenBillingPortal: () => Promise<{ url: string } | null>
}

export function SettingsPage({
  user,
  profile,
  subscription,
  stats,
  onUpdateSandboxSettings,
  onResetSandboxSettings,
  onUpdateDifficulty,
  onCancelSubscription,
  onReactivateSubscription,
  onOpenBillingPortal,
}: SettingsPageClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sandboxSettings, setSandboxSettings] = useState<SandboxSettings>(
    profile.sandbox_settings
  )
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [currentDifficulty, setCurrentDifficulty] = useState(
    profile.difficulty || "beginner"
  )

  const handleSandboxToggle = (
    category: keyof SandboxSettings,
    key: string,
    value: boolean
  ) => {
    const newSettings = {
      ...sandboxSettings,
      [category]: {
        ...sandboxSettings[category],
        [key]: value,
      },
    }
    setSandboxSettings(newSettings)

    startTransition(async () => {
      await onUpdateSandboxSettings({ [category]: { [key]: value } })
    })
  }

  const handleResetSandbox = () => {
    startTransition(async () => {
      await onResetSandboxSettings()
      router.refresh()
    })
    setShowResetDialog(false)
  }

  const handleCancelSubscription = () => {
    startTransition(async () => {
      await onCancelSubscription()
      router.refresh()
    })
    setShowCancelDialog(false)
  }

  const handleReactivateSubscription = () => {
    startTransition(async () => {
      await onReactivateSubscription()
      router.refresh()
    })
  }

  const handleBillingPortal = () => {
    startTransition(async () => {
      const result = await onOpenBillingPortal()
      if (result?.url) {
        window.open(result.url, "_blank")
      }
    })
  }

  const handleDifficultyChange = (difficulty: string) => {
    setCurrentDifficulty(difficulty)
    startTransition(async () => {
      await onUpdateDifficulty(difficulty)
    })
  }

  const product = subscription
    ? PRODUCTS.find((p) => p.id === subscription.productId)
    : null

  const levelTitle = LEVEL_TITLES[Math.min(stats.level, 20)] || "Grandmaster"
  const xpForNextLevel = stats.level * 100
  const xpProgress = Math.min((stats.xp / xpForNextLevel) * 100, 100)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="settings" isLoggedIn={true} hasPurchased={true} />

      <main className="mx-auto max-w-6xl px-8 py-8">
        {/* Page header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-2">
              <Sliders className="h-4 w-4" />
              <span className="hidden sm:inline">Sandbox</span>
            </TabsTrigger>
            <TabsTrigger value="game" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Game</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="mt-1 font-medium">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Member Since</Label>
                    <p className="mt-1 font-medium">
                      {new Date(profile.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Level Progress */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold">Level {stats.level}</span>
                      <span className="ml-2 text-muted-foreground">{levelTitle}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stats.xp} / {xpForNextLevel} XP
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <TrendingUp className="mx-auto mb-2 h-6 w-6 text-primary" />
                    <p className="text-2xl font-bold">{stats.totalScenarios}</p>
                    <p className="text-sm text-muted-foreground">Total Scenarios</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <Target className="mx-auto mb-2 h-6 w-6 text-primary" />
                    <p className="text-2xl font-bold">{stats.averageScore}%</p>
                    <p className="text-sm text-muted-foreground">Avg Score (Last 10)</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <Trophy className="mx-auto mb-2 h-6 w-6 text-primary" />
                    <p className="text-2xl font-bold">{stats.scenariosCompleted}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Your Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Age Range</Label>
                    <p className="mt-1 font-medium">
                      {profile.age_range_start || 18} - {profile.age_range_end || 35} years
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Primary Region</Label>
                    <p className="mt-1 font-medium capitalize">
                      {profile.preferred_region?.replace(/-/g, " ") || "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Archetypes</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {profile.archetype && (
                        <Badge variant="secondary" className="capitalize">
                          {profile.archetype.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {profile.secondary_archetype && (
                        <Badge variant="outline" className="capitalize">
                          {profile.secondary_archetype.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {profile.tertiary_archetype && (
                        <Badge variant="outline" className="capitalize">
                          {profile.tertiary_archetype.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Experience Level</Label>
                    <p className="mt-1 font-medium capitalize">
                      {profile.experience_level?.replace(/-/g, " ") || "Not set"}
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <Link href="/preferences">
                    <Button variant="outline" size="sm">
                      Edit Preferences
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sandbox Tab */}
          <TabsContent value="sandbox" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sliders className="h-5 w-5" />
                    Scenario Sandbox
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetDialog(true)}
                    disabled={isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset All
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Customize your practice scenarios. Disable elements you want to avoid
                  while keeping your chosen difficulty level.
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Weather Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Weather Conditions</h3>
                  <div className="space-y-3">
                    <SettingToggle
                      id="enableBadWeather"
                      label="Bad Weather"
                      description="Rain, cold, windy, overcast conditions"
                      checked={sandboxSettings.weather.enableBadWeather}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("weather", "enableBadWeather", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="enableHotWeather"
                      label="Hot Weather"
                      description="Hot, sunny weather that affects behavior"
                      checked={sandboxSettings.weather.enableHotWeather}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("weather", "enableHotWeather", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="showWeatherDescriptions"
                      label="Show Weather Info"
                      description="Display weather descriptions in scenarios"
                      checked={sandboxSettings.weather.showWeatherDescriptions}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("weather", "showWeatherDescriptions", checked)
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Energy Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Energy & Mood States</h3>
                  <div className="space-y-3">
                    <SettingToggle
                      id="enableNegativeEnergies"
                      label="Negative Energies"
                      description="Icy, irritated, rushed, stressed, closed moods"
                      checked={sandboxSettings.energy.enableNegativeEnergies}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("energy", "enableNegativeEnergies", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="enableNeutralEnergies"
                      label="Neutral Energies"
                      description="Neutral, preoccupied, focused, distracted moods"
                      checked={sandboxSettings.energy.enableNeutralEnergies}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("energy", "enableNeutralEnergies", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="enableShyEnergies"
                      label="Shy/Withdrawn Energies"
                      description="Shy, melancholic, tired moods"
                      checked={sandboxSettings.energy.enableShyEnergies}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("energy", "enableShyEnergies", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="showEnergyDescriptions"
                      label="Show Energy Cues"
                      description="Display mood/energy hints in scenario descriptions"
                      checked={sandboxSettings.energy.showEnergyDescriptions}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("energy", "showEnergyDescriptions", checked)
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Movement Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Movement & Obstacles</h3>
                  <div className="space-y-3">
                    <SettingToggle
                      id="enableFastMovement"
                      label="Fast Movement"
                      description="Allow brisk walking or rushing targets"
                      checked={sandboxSettings.movement.enableFastMovement}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("movement", "enableFastMovement", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="enableHeadphones"
                      label="Headphones"
                      description="Allow targets wearing headphones"
                      checked={sandboxSettings.movement.enableHeadphones}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("movement", "enableHeadphones", checked)
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Display Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Display Options</h3>
                  <div className="space-y-3">
                    <SettingToggle
                      id="showOutfitDescriptions"
                      label="Show Outfit Details"
                      description="Display what she's wearing in scenarios"
                      checked={sandboxSettings.display.showOutfitDescriptions}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("display", "showOutfitDescriptions", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="showOpenerHooks"
                      label="Show Opener Hints"
                      description="Display conversation starter suggestions"
                      checked={sandboxSettings.display.showOpenerHooks}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("display", "showOpenerHooks", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="showCrowdDescriptions"
                      label="Show Crowd Level"
                      description="Display how busy the area is"
                      checked={sandboxSettings.display.showCrowdDescriptions}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("display", "showCrowdDescriptions", checked)
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Environment Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Environments</h3>
                  <div className="space-y-3">
                    <SettingToggle
                      id="enableGymScenarios"
                      label="Gym Scenarios"
                      description="Include gym and fitness center locations"
                      checked={sandboxSettings.environments.enableGymScenarios}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("environments", "enableGymScenarios", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="enableTransitScenarios"
                      label="Transit Scenarios"
                      description="Include bus stops, train stations, etc."
                      checked={sandboxSettings.environments.enableTransitScenarios}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("environments", "enableTransitScenarios", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="enableCampusScenarios"
                      label="Campus Scenarios"
                      description="Include university/college locations"
                      checked={sandboxSettings.environments.enableCampusScenarios}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle("environments", "enableCampusScenarios", checked)
                      }
                      disabled={isPending}
                    />
                    <SettingToggle
                      id="enableHighCrowdScenarios"
                      label="Crowded Scenarios"
                      description="Include high crowd density situations"
                      checked={sandboxSettings.environments.enableHighCrowdScenarios}
                      onCheckedChange={(checked) =>
                        handleSandboxToggle(
                          "environments",
                          "enableHighCrowdScenarios",
                          checked
                        )
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Game Settings Tab */}
          <TabsContent value="game" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Difficulty Level
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Adjust how challenging your practice scenarios are
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleDifficultyChange(option.id)}
                      disabled={isPending}
                      className={`rounded-lg border p-4 text-left transition-all ${
                        currentDifficulty === option.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      } ${isPending ? "opacity-50" : ""}`}
                    >
                      <p className="font-medium">{option.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6">
            {subscription ? (
              <>
                {/* Current Plan */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Current Subscription
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                      <div>
                        <p className="font-semibold">{product?.name || "Subscription"}</p>
                        <p className="text-sm text-muted-foreground">
                          {product
                            ? `$${(product.priceInCents / 100).toFixed(2)}/${
                                product.interval === "year" ? "year" : "month"
                              }`
                            : "Active plan"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          subscription.cancelAtPeriodEnd ? "secondary" : "default"
                        }
                      >
                        {subscription.cancelAtPeriodEnd ? "Canceling" : "Active"}
                      </Badge>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Current Period</Label>
                        <p className="mt-1 font-medium">
                          {subscription.currentPeriodStart.toLocaleDateString()} -{" "}
                          {subscription.currentPeriodEnd.toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          {subscription.cancelAtPeriodEnd ? "Access Until" : "Next Billing"}
                        </Label>
                        <p className="mt-1 font-medium">
                          {subscription.currentPeriodEnd.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {subscription.cancelAtPeriodEnd && (
                      <div className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-600">
                            Subscription Ending
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Your subscription will end on{" "}
                            {subscription.currentPeriodEnd.toLocaleDateString()}. You'll
                            retain access until then.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Manage Subscription */}
                <Card>
                  <CardHeader>
                    <CardTitle>Manage Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="outline"
                      onClick={handleBillingPortal}
                      disabled={isPending}
                      className="w-full sm:w-auto"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage Payment Method
                    </Button>

                    {subscription.cancelAtPeriodEnd ? (
                      <Button
                        onClick={handleReactivateSubscription}
                        disabled={isPending}
                        className="w-full sm:w-auto"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Reactivate Subscription
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={() => setShowCancelDialog(true)}
                        disabled={isPending}
                        className="w-full sm:w-auto"
                      >
                        Cancel Subscription
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    No Active Subscription
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-muted-foreground">
                    You don't have an active subscription. Subscribe to unlock unlimited
                    practice scenarios.
                  </p>
                  <Link href="/">
                    <Button>View Plans</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Reset Sandbox Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Sandbox Settings?</DialogTitle>
            <DialogDescription>
              This will reset all sandbox settings to their defaults. All toggles will be
              turned on.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetSandbox} disabled={isPending}>
              Reset Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Your subscription will remain active until{" "}
              {subscription?.currentPeriodEnd.toLocaleDateString()}. After that, you'll
              lose access to premium features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isPending}
            >
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SettingToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}
