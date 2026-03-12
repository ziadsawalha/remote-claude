# Refactor Backlog

From project-wide `/simplify` review (2026-03-12). Three parallel Opus agents
scanned all four components (wrapper, concentrator, agent, web dashboard).

## Completed (commit f86112b)

- [x] **BUG: Previous session ID logged wrong value** - `src/wrapper/index.ts` - was logging new ID instead of old after overwrite
- [x] **PERF: PASSIVE_HOOKS Set allocated per event** - `src/concentrator/session-store.ts` - hoisted to module constant
- [x] **PERF: getTerminalViewers allocates Set per call** - `src/concentrator/session-store.ts` - shared EMPTY_VIEWER_SET
- [x] **MEMORY: Unbounded session.events array** - `src/concentrator/session-store.ts` - capped at 1000
- [x] **REUSE: Duplicated text extraction in scanForBgTasks** - `src/wrapper/index.ts` - extracted `extractEntryText()`
- [x] **REUSE: formatModel() not used in command palette** - `web/src/components/command-palette/session-results.tsx` - was hand-inlined
- [x] **PERF: Unnecessary message.toString() on Bun WS** - `src/concentrator/index.ts` - already a string
- [x] **PERF: Double HTTP fetch on session click** - `web/src/components/session-list.tsx` - app.tsx useEffect already handles it
- [x] **PERF: Overly broad Zustand selectors** - `web/src/components/session-detail.tsx` - narrowed to selected session only

## Open - Medium (worth doing)

- [ ] **Triple type duplication: SessionSummary**\
  Same shape defined in 3 places:
  - `src/concentrator/session-store.ts:43-92` (canonical `SessionSummary`)
  - `web/src/hooks/use-websocket.ts:17-64` (copy with optional fields)
  - `web/src/lib/types.ts:49-101` (as `Session`, defaults via `toSession()`)\
  Related: `DashboardMessage` also duplicated. `HookEventType` in web stale (missing 4 hook types).\
  Fix: Move to `src/shared/protocol.ts`, import everywhere.

- [ ] **Broadcast debouncing**\
  `broadcastToViewers()` in `src/concentrator/session-store.ts` fires on every hook event.
  Rapid-fire events (subagent flurry, task updates) cause redundant `session_updated` broadcasts.\
  Fix: Coalesce broadcasts per event loop tick with `queueMicrotask` or `setTimeout(0)`.

- [ ] **Dead code in ws-server.ts**\
  `src/concentrator/ws-server.ts` has unused exports.\
  Fix: Audit and remove dead code, or inline into `index.ts` if only used there.

- [ ] **React re-render: transcript-view.tsx**\
  Re-renders on every new transcript entry even when user is scrolled up reading history.\
  Fix: Skip render/append when not at bottom, or virtualize the list.

## Open - Large (architectural)

- [ ] **Session eviction / TTL**\
  No mechanism to evict old sessions from memory. Long-running concentrator accumulates forever.\
  Fix: LRU eviction or TTL-based cleanup. Keep last N sessions + all active.

- [ ] **Unbounded transcript cache**\
  Similar to events - transcript cache per session in `session-store.ts` grows without limit.\
  Fix: Cap per session, or evict oldest entries when threshold exceeded.

- [ ] **N+1 broadcast pattern**\
  Multiple hook events arriving in same tick each trigger full session summary serialization + broadcast.\
  Related to broadcast debouncing above but also about avoiding redundant `getSessionSummary()` calls.\
  Fix: Dirty-flag sessions, serialize once per tick.
