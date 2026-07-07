"use client"

import * as React from "react"

import { Button } from "./button.js"
import { Separator } from "./separator.js"
import { cn } from "../lib/utils.js"

/**
 * Two-segment pill button (OpenCut-style): a label side and an action side
 * divided by a separator, e.g. scene name + scene switcher.
 */

interface SplitButtonProps extends React.ComponentProps<"div"> {
  children: React.ReactNode
}

type SplitButtonSideProps = Omit<
  React.ComponentProps<typeof Button>,
  "variant" | "size"
>

function SplitButton({ children, className, ...props }: SplitButtonProps) {
  return (
    <div
      data-slot="split-button"
      className={cn(
        "border-input bg-accent inline-flex h-7 items-stretch overflow-hidden rounded-lg border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function SplitButtonSide({
  children,
  className,
  paddingClass,
  onClick,
  ...props
}: SplitButtonSideProps & { paddingClass: string }) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "bg-accent disabled:text-muted-foreground h-full gap-0 rounded-none border-0 font-normal !opacity-100",
        onClick
          ? "hover:bg-foreground/10 cursor-pointer hover:opacity-100"
          : "cursor-default select-text hover:bg-transparent",
        paddingClass,
        className
      )}
      onClick={onClick}
      {...props}
    >
      {typeof children === "string" ? (
        <span className="cursor-text font-normal">{children}</span>
      ) : (
        children
      )}
    </Button>
  )
}

function SplitButtonLeft(props: SplitButtonSideProps) {
  return <SplitButtonSide paddingClass="pl-3 pr-2" {...props} />
}

function SplitButtonRight(props: SplitButtonSideProps) {
  return <SplitButtonSide paddingClass="pl-2 pr-3" {...props} />
}

function SplitButtonSeparator({ className }: { className?: string }) {
  return (
    <Separator
      orientation="vertical"
      className={cn("bg-foreground/15 h-full", className)}
    />
  )
}

export { SplitButton, SplitButtonLeft, SplitButtonRight, SplitButtonSeparator }
