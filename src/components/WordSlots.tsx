import { useDroppable } from '@dnd-kit/core';
import type { Tile } from '../game/types';
import { SlotTile } from './Tile';

type SlotProps = {
  index: number;
  tile: Tile | null;
  onTileClick: (tile: Tile) => void;
};

function WordSlot({ index, tile, onTileClick }: SlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${index}`,
    data: { source: 'slot-target', index },
  });

  return (
    <div ref={setNodeRef} className={`word-slot ${isOver ? 'word-slot--over' : ''}`}>
      {tile ? <SlotTile tile={tile} onClick={() => onTileClick(tile)} /> : null}
    </div>
  );
}

export function WordSlots({
  slots,
  onTileClick,
}: {
  slots: Array<Tile | null>;
  onTileClick: (tile: Tile) => void;
}) {
  return (
    <div className="word-slots" aria-label="Mot en cours">
      {slots.map((tile, index) => (
        <WordSlot key={index} index={index} tile={tile} onTileClick={onTileClick} />
      ))}
    </div>
  );
}
