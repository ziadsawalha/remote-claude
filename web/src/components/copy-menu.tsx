/**
 * CopyMenu - Copy button with format options.
 * Short tap/click: copy as markdown (default).
 * Long-press (mobile) / right-click (desktop): show format menu.
 *
 * Note: Radix ContextMenu was considered but it wraps a trigger area and
 * conflicts with our short-tap default behavior. Hand-rolled is simpler here.
 */

import { Check, Copy } from 'lucide-react'
import { Marked } from 'marked'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn, haptic } from '@/lib/utils'

const marked = new Marked()

type CopyFormat = 'rich' | 'markdown' | 'plain'

const FORMAT_OPTIONS: Array<{ key: CopyFormat; label: string; desc: string }> = [
  { key: 'rich', label: 'Rich Text', desc: 'Bold, bullets, links' },
  { key: 'markdown', label: 'Markdown', desc: 'Raw source' },
  { key: 'plain', label: 'Plain Text', desc: 'No formatting' },
]

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string
}

async function copyAs(text: string, format: CopyFormat) {
  switch (format) {
    case 'markdown':
      await navigator.clipboard.writeText(text)
      break
    case 'plain': {
      const html = markdownToHtml(text)
      await navigator.clipboard.writeText(stripHtml(html))
      break
    }
    case 'rich': {
      const html = markdownToHtml(text)
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([stripHtml(html)], { type: 'text/plain' }),
          }),
        ])
      } catch {
        await navigator.clipboard.writeText(stripHtml(html))
      }
      break
    }
  }
}

interface CopyMenuProps {
  text: string
  className?: string
  iconClassName?: string
}

export function CopyMenu({ text, className, iconClassName = 'w-3 h-3' }: CopyMenuProps) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const didLongPress = useRef(false)

  function flashCopied() {
    setCopied(true)
    haptic('success')
    setTimeout(() => setCopied(false), 1500)
  }

  function handleShortTap() {
    if (didLongPress.current) return
    haptic('tap')
    navigator.clipboard.writeText(text).then(flashCopied)
  }

  function openMenu(x: number, y: number) {
    const clampedX = Math.min(Math.max(8, x), window.innerWidth - 188)
    const clampedY = Math.min(Math.max(8, y), window.innerHeight - 168)
    setMenuPos({ x: clampedX, y: clampedY })
    setMenuOpen(true)
    haptic('double')
  }

  function handleTouchStart(e: React.TouchEvent) {
    didLongPress.current = false
    const { clientX, clientY } = e.touches[0]
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      openMenu(clientX, clientY)
    }, 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    openMenu(e.clientX, e.clientY)
  }

  function handleSelect(format: CopyFormat) {
    haptic('tap')
    copyAs(text, format).then(() => {
      setMenuOpen(false)
      setMenuPos(null)
      flashCopied()
    })
  }

  const dismissMenu = useCallback((e: MouseEvent | TouchEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false)
      setMenuPos(null)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    document.addEventListener('mousedown', dismissMenu)
    document.addEventListener('touchstart', dismissMenu)
    return () => {
      document.removeEventListener('mousedown', dismissMenu)
      document.removeEventListener('touchstart', dismissMenu)
    }
  }, [menuOpen, dismissMenu])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])

  return (
    <>
      <button
        type="button"
        className={cn('text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5', className)}
        title="Copy (right-click or long-press for options)"
        onClick={handleShortTap}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
      >
        {copied ? <Check className={cn(iconClassName, 'text-emerald-400')} /> : <Copy className={iconClassName} />}
      </button>

      {menuOpen && menuPos && (
        <div
          ref={menuRef}
          className="fixed z-[100] min-w-[170px] bg-popover border border-border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-bold border-b border-border mb-1">
            Copy as
          </div>
          {FORMAT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              className="w-full text-left px-3 py-2.5 sm:py-2 hover:bg-accent/50 active:bg-accent transition-colors flex flex-col gap-0.5"
              onClick={() => handleSelect(opt.key)}
            >
              <span className="text-sm sm:text-xs font-medium text-foreground">{opt.label}</span>
              <span className="text-[11px] sm:text-[10px] text-muted-foreground">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
