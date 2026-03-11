import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardTileLayout } from '../lib/types';

type ResizeDir = 'e' | 's' | 'se';
type Interaction = {
  mode: 'drag' | 'resize';
  id: string;
  startX: number;
  startY: number;
  origin: DashboardTileLayout[];
  dir?: ResizeDir;
  active: boolean;
};

const gap = 10;
const rowHeight = 88;
const dragStartThreshold = 8;

const cloneTiles = (tiles: DashboardTileLayout[]) => tiles.map((t) => ({ ...t }));

const overlaps = (a: DashboardTileLayout, b: DashboardTileLayout) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const collidesAny = (tile: DashboardTileLayout, tiles: DashboardTileLayout[], ignoreId?: string) => tiles.some((other) => other.id !== tile.id && other.id !== ignoreId && !other.hidden && overlaps(tile, other));

const compact = (tiles: DashboardTileLayout[]) => {
  const ordered = [...tiles].sort((a, b) => (a.y - b.y) || (a.x - b.x));
  ordered.forEach((tile) => {
    if (tile.hidden) return;
    while (tile.y > 0) {
      const candidate = { ...tile, y: tile.y - 1 };
      if (collidesAny(candidate, ordered)) break;
      tile.y -= 1;
    }
  });
};

const resolveCollisions = (tiles: DashboardTileLayout[], movedId: string, cols: number) => {
  const next = cloneTiles(tiles).map((tile) => ({ ...tile, x: Math.max(0, Math.min(tile.x, Math.max(0, cols - tile.w))) }));
  let changed = true;
  while (changed) {
    changed = false;
    const moving = next.find((t) => t.id === movedId);
    if (!moving) break;
    next.forEach((tile) => {
      if (tile.id === movedId || tile.hidden || moving.hidden) return;
      if (overlaps(moving, tile)) {
        tile.y = moving.y + moving.h;
        changed = true;
      }
    });
  }
  compact(next);
  return next;
};

const getCols = (width: number) => {
  if (width < 700) return 2;
  if (width < 1000) return 4;
  return 6;
};

export function TileGridEditor({
  tiles,
  onChange,
  onCommit,
  renderTile,
  ensureCenterOccupied
}: {
  tiles: DashboardTileLayout[];
  onChange: (tiles: DashboardTileLayout[]) => void;
  onCommit: (tiles: DashboardTileLayout[]) => void;
  renderTile: (tile: DashboardTileLayout) => React.ReactNode;
  ensureCenterOccupied?: (tiles: DashboardTileLayout[]) => DashboardTileLayout[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const cols = getCols(width);
  const cellWidth = useMemo(() => Math.max(80, (width - gap * (cols - 1)) / cols), [width, cols]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? 0));
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!interaction) return;
      const dx = e.clientX - interaction.startX;
      const dy = e.clientY - interaction.startY;
      const distance = Math.hypot(dx, dy);
      if (!interaction.active && distance < dragStartThreshold) return;

      const stepX = Math.round(dx / (cellWidth + gap));
      const stepY = Math.round(dy / (rowHeight + gap));
      const current = interaction.origin.find((t) => t.id === interaction.id);
      if (!current) return;

      let candidate = cloneTiles(interaction.origin);
      const tile = candidate.find((t) => t.id === interaction.id);
      if (!tile) return;

      if (interaction.mode === 'drag') {
        tile.x = Math.max(0, Math.min(cols - tile.w, current.x + stepX));
        tile.y = Math.max(0, current.y + stepY);
      } else {
        const minW = 1;
        const minH = 1;
        const nextW = Math.max(minW, Math.min(cols - current.x, current.w + stepX));
        const nextH = Math.max(minH, current.h + stepY);
        if (interaction.dir === 'e') tile.w = nextW;
        if (interaction.dir === 's') tile.h = nextH;
        if (interaction.dir === 'se') {
          tile.w = nextW;
          tile.h = nextH;
        }
      }

      candidate = resolveCollisions(candidate, interaction.id, cols);
      if (ensureCenterOccupied) candidate = ensureCenterOccupied(candidate);
      onChange(candidate);
      setDraggedId(interaction.id);
      if (!interaction.active) setInteraction({ ...interaction, active: true });
    };

    const onUp = () => {
      if (!interaction) return;
      const finalTiles = ensureCenterOccupied ? ensureCenterOccupied(tiles) : tiles;
      onCommit(finalTiles);
      setInteraction(null);
      setDraggedId(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [interaction, tiles, cellWidth, cols, onChange, onCommit, ensureCenterOccupied]);

  const visible = tiles.filter((tile) => !tile.hidden);
  const maxRow = visible.reduce((acc, tile) => Math.max(acc, tile.y + (tile.collapsed ? 1 : tile.h)), 1);

  return (
    <div ref={ref} className="tile-grid-editor" style={{ minHeight: `${maxRow * (rowHeight + gap)}px` }}>
      {visible.map((tile) => {
        const h = tile.collapsed ? 1 : tile.h;
        const style = {
          left: `${tile.x * (cellWidth + gap)}px`,
          top: `${tile.y * (rowHeight + gap)}px`,
          width: `${tile.w * cellWidth + (tile.w - 1) * gap}px`,
          height: `${h * rowHeight + (h - 1) * gap}px`
        };

        return (
          <section key={tile.id} className={`tile-grid-item ${draggedId === tile.id ? 'is-dragging' : ''}`} style={style}>
            <header className="tile-head">
              <button
                className="tile-grip"
                aria-label="Drag tile"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setInteraction({ mode: 'drag', id: tile.id, startX: e.clientX, startY: e.clientY, origin: cloneTiles(tiles), active: false });
                }}
              >
                ⋮⋮
              </button>
            </header>
            <div className="tile-content">{renderTile(tile)}</div>
            {!tile.collapsed && (
              <>
                <div className="resize-handle resize-e" onPointerDown={(e) => { e.preventDefault(); setInteraction({ mode: 'resize', dir: 'e', id: tile.id, startX: e.clientX, startY: e.clientY, origin: cloneTiles(tiles), active: false }); }} />
                <div className="resize-handle resize-s" onPointerDown={(e) => { e.preventDefault(); setInteraction({ mode: 'resize', dir: 's', id: tile.id, startX: e.clientX, startY: e.clientY, origin: cloneTiles(tiles), active: false }); }} />
                <div className="resize-handle resize-se" onPointerDown={(e) => { e.preventDefault(); setInteraction({ mode: 'resize', dir: 'se', id: tile.id, startX: e.clientX, startY: e.clientY, origin: cloneTiles(tiles), active: false }); }} />
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
