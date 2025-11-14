"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { OTPInputContext } from "input-otp"
import { InputOTP, InputOTPGroup } from "./input-otp"
import { Button } from "./button"
import { cn } from "@/lib/utils"

export interface PinInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  error?: string
  disabled?: boolean
  allowMaskToggle?: boolean
  className?: string
  autoFocus?: boolean
}

/**
 * PinInput component for 6-digit PIN authentication
 *
 * Features:
 * - 6 individual input boxes
 * - Auto-focus and auto-advance
 * - Backspace to previous box
 * - Paste support
 * - Optional mask/unmask toggle
 * - Validation feedback
 */
export const PinInput = React.forwardRef<
  React.ElementRef<typeof InputOTP>,
  PinInputProps
>(
  (
    {
      value,
      onChange,
      onComplete,
      error,
      disabled = false,
      allowMaskToggle = true,
      className,
      autoFocus = true,
    },
    ref
  ) => {
    const [isMasked, setIsMasked] = React.useState(true)

    const handleChange = (newValue: string) => {
      // Only allow numeric input
      const numericValue = newValue.replace(/\D/g, "").slice(0, 6)
      onChange(numericValue)

      // Call onComplete when all 6 digits are entered
      if (numericValue.length === 6 && onComplete) {
        onComplete(numericValue)
      }
    }

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center gap-2">
          <InputOTP
            ref={ref}
            maxLength={6}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            autoFocus={autoFocus}
            pattern="^[0-9]*$"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, index) => (
                <PinSlot
                  key={index}
                  index={index}
                  isMasked={isMasked}
                  hasError={!!error}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {allowMaskToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsMasked(!isMasked)}
              disabled={disabled}
              className="h-9 w-9 shrink-0"
              aria-label={isMasked ? "Show PIN" : "Hide PIN"}
            >
              {isMasked ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

PinInput.displayName = "PinInput"

interface PinSlotProps {
  index: number
  isMasked: boolean
  hasError: boolean
}

const PinSlot = React.forwardRef<
  HTMLDivElement,
  PinSlotProps & React.ComponentPropsWithoutRef<"div">
>(({ index, isMasked, hasError, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const slot = inputOTPContext.slots[index]

  if (!slot) {
    return null
  }

  const { char, hasFakeCaret, isActive } = slot

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-12 w-12 items-center justify-center rounded-md border border-input text-lg font-semibold shadow-sm transition-all",
        isActive && "z-10 ring-2 ring-ring ring-offset-2",
        hasError && "border-destructive",
        char && !hasError && "border-primary",
        className
      )}
      {...props}
    >
      {char && isMasked ? (
        <div className="h-2 w-2 rounded-full bg-foreground" />
      ) : (
        char
      )}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
})

PinSlot.displayName = "PinSlot"
