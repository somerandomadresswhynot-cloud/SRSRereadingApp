# SRS Rereading App

Local-first chapter-based SRS app for reviewing source units (chapter/section leaves) with an embedded viewer and persistent scheduling.

## Stack
- React + TypeScript + Vite
- IndexedDB via Dexie for local persistence

## Features
- Exactly three top-level tabs: **Queue**, **Sources**, **Settings**.
- Tree-first source browsing with collapsible hierarchy in source views.
- Persistent scheduler state (`dueAt`, `stability`, `difficulty`, `retrievability`, counts).
- Review ratings: **Easy**, **With Effort**, **Hard**, **Again**.
- Queue recommendation with explanation and alternatives.
- 14-day projected load (units, minutes, pages).
- Embedded in-app unit viewer:
  - PDF via embedded iframe (`#page=` deep link)
  - Markdown/TXT via embedded reading panel.
- Written recall is saved with each review event.

## One-command run
```bash
./run-local.sh
```
This script installs dependencies, runs a build sanity check, and starts the dev server.

## Manual local setup
```bash
npm install
npm run dev
```
Open the URL printed by Vite.

## Build
```bash
npm run build
npm run preview
```

## Data model (local IndexedDB)
- `Source`: id, title, type, originPath, parse status, timestamps, priority.
- `UnitNode`: source tree nodes with leaf review units and scheduling fields.
- `ReviewEvent`: timestamped rating events with written recall + due transition.
- `Settings`: scheduling budgets, behavior toggles, display density.

## Seed data
On first launch, the app seeds:
- 3 sources
- hierarchical trees
- 12 leaf units
- due + overdue + new mix
- review history entries with sample recall notes.
