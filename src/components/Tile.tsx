import type { CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Tile as TileType } from '../game/types';

type BaseProps = {
  tile: TileType;
  onClick?: () => void;
  className?: string;
};

export function RackTile({ tile, onClick }: BaseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tile.id,
    data: { source: 'rack', tileId: tile.id },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      className={`tile ${isDragging ? 'tile--dragging' : ''}`}
      onClick={onClick}
      aria-label={`Lettre ${tile.letter}`}
      {...attributes}
      {...listeners}
    >
      <span>{tile.letter}</span>
    </button>
  );
}

export function SlotTile({ tile, onClick }: BaseProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tile.id,
    data: { source: 'slot', tileId: tile.id },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      className={`tile tile--slot ${isDragging ? 'tile--dragging' : ''}`}
      onClick={onClick}
      aria-label={`Lettre ${tile.letter}, cliquer pour la remettre dans le chevalet`}
      {...attributes}
      {...listeners}
    >
      <span>{tile.letter}</span>
    </button>
  );
}

export function TileGhost({ tile }: { tile: TileType }) {
  return (
    <div className="tile tile--ghost" aria-hidden="true">
      <span>{tile.letter}</span>
    </div>
  );
}
