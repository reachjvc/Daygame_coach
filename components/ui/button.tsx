import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base sm:text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        // A bordered button sits on a slate card, so it must not paint itself
        // the page's near-black background -- that is what made "Start" on the
        // Tracking card read as disabled. And `--accent` in this app is the
        // sunset red, so hovering an outline or ghost button used to flash red,
        // which reads as a warning rather than "you can press this".
        //
        // The `dark:` halves these two variants used to carry were dead code:
        // `dark:` here means "inside an element with the `dark` class"
        // (app/globals.css), and nothing in the app ever sets that class. They
        // are deleted rather than kept, because a rule that never applies only
        // hides what the button actually looks like.
        outline:
          'border border-border bg-transparent hover:bg-muted/50 hover:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-muted/50 hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      // Every size is 44px tall on a touch screen (h-11 / size-11) and smaller
      // on a pointer. `sm` and `icon-sm` were the two exceptions at 40px --
      // four pixels under the minimum touch target, which put them below it on
      // every phone. Measured on an iPhone 14 viewport 2026-09-08: 250 controls
      // across 25 pages were under 44px, and the great majority were these two.
      // Desktop sizes are unchanged; only the touch height moves.
      size: {
        default: 'h-11 sm:h-9 px-4 py-2',
        sm: 'h-11 sm:h-8 rounded-md gap-1.5 px-3',
        lg: 'h-11 sm:h-10 rounded-md px-6',
        icon: 'size-11 sm:size-9',
        'icon-sm': 'size-11 sm:size-8',
        'icon-lg': 'size-11 sm:size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
