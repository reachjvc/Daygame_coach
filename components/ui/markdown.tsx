"use client"

import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

interface MarkdownProps {
  children: string
  className?: string
  components?: Partial<Components>
}

export function Markdown({ children, className, components }: MarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-none",
        "prose-headings:text-foreground",
        "prose-p:text-foreground",
        "prose-strong:text-foreground prose-strong:font-bold",
        "prose-em:text-foreground",
        "prose-a:text-primary hover:prose-a:text-primary/80",
        "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-foreground",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
        "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
        "prose-li:marker:text-primary",
        "prose-ul:text-foreground prose-ol:text-foreground",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
