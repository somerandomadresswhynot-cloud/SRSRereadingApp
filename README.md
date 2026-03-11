# SRS Rereading App

Local-first chapter-based SRS app for reviewing imported source units with an embedded viewer and persistent scheduling.

## Stack
- React + TypeScript + Vite
- IndexedDB via Dexie for local persistence

## Features
- Exactly three top-level tabs: **Queue**, **Sources**, **Settings**.
- Drag-and-drop/manual file import for PDF/Markdown/TXT.
- Tree-first source browsing with collapsible hierarchy in source views.
- Persistent scheduler state (`dueAt`, `stability`, `difficulty`, `retrievability`, counts).
- Review ratings: **Easy**, **With Effort**, **Hard**, **Again**.
- Review workspace with:
  - Scalable embedded reader for PDF and text formats.
  - Reorderable/scalable sections (reader, recall, timer).
  - Interactive distraction-free timer with manual review entry.
- Queue KPI tile with selectable metrics and independent scaling.
- Date-only timestamps for due/review/timer records.

## One-command run
### macOS / Linux
```bash
./run-local.sh
```

### Windows (PowerShell / CMD)
```bat
run-local.bat
```

## Manual local setup
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```


## Dashboard layout editing
- KPI tiles use a reusable grid editor with drag handle (`⋮⋮`) for movement and edge/corner handles for resize.
- Drag/resize snaps to grid units; drag starts after a short movement threshold to reduce accidental jitter.
- Collision resolution is push-down + vertical compaction: resized/moved tiles push overlapping neighbors, then gaps are packed upward.
- Layout state is persisted in Settings (`kpiTiles`) including position, size, and hidden/collapsed flags.
