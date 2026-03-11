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
- Queue page uses dashboard tiles for all major sections (recommended unit, summary, KPIs, projected load) with drag+resize layout editing.
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
- Queue uses a reusable grid editor where each visible section is a tile (recommended unit, summary, KPIs, projected load).
- KPI cards inside the KPI section also use the same editor component, so the system is reusable for nested/future dashboard sections.
- Drag starts from the grip handle (`⋮⋮`) and resize uses edge/corner handles.
- Drag/resize snaps to grid units; drag starts only after a short movement threshold to reduce jitter.
- Collision resolution is push-down + vertical compaction: moved/resized tiles push overlaps, then gaps are packed upward.
- Layout state is persisted in Settings (`queueTiles` and `kpiTiles`) including position, size, hidden/collapsed flags.
