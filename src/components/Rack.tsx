import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Tile } from '../game/types';
import { RackTile } from './Tile';

export function Rack({
  rack,
  onTileClick,
}: {
  rack: Array<Tile | null>;
  onTileClick: (tile: Tile) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'rack-container',
    data: { source: 'rack-target' },
  });

  return (
    <div className="rack-wrap">
      <div className="rack-label">TON TIRAGE</div>
      <div ref={setNodeRef} className={`rack ${isOver ? 'rack--over' : ''}`}>
        <SortableContext items={rack.flatMap((tile) => tile ? [tile.id] : [])} strategy={horizontalListSortingStrategy}>
          {rack.map((tile, index) => (
            tile
              ? <RackTile key={tile.id} tile={tile} onClick={() => onTileClick(tile)} />
              : <div key={`gap-${index}`} className="rack-gap" aria-hidden="true" />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
