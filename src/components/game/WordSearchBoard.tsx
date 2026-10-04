import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import type { GridCell, PlacedWord } from '@/src/lib/wordBiblia/wordSearch';

interface WordSearchBoardProps {
  grid: GridCell[][];
  words: PlacedWord[];
  onWordFound: (word: PlacedWord) => void;
  onInvalidSelection: () => void;
}

export function WordSearchBoard({ grid, words, onWordFound, onInvalidSelection }: WordSearchBoardProps) {
  const [localGrid, setLocalGrid] = useState<GridCell[][]>(grid);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionPositions, setSelectionPositions] = useState<Array<{ x: number; y: number }>>([]);
  const [invalidSelectionPositions, setInvalidSelectionPositions] = useState<Array<{ x: number; y: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalGrid(grid);
    setSelectionPositions([]);
  }, [grid]);

  useEffect(() => {
    setLocalGrid((previous) => previous.map((row) => row.map((cell) => ({
      ...cell,
      highlighted: selectionPositions.some((position) => position.x === cell.x && position.y === cell.y),
    }))));
  }, [selectionPositions]);

  const handleStart = (x: number, y: number) => {
    setIsSelecting(true);
    setSelectionPositions([{ x, y }]);
  };

  const handleMove = (x: number, y: number) => {
    if (!isSelecting || selectionPositions.length === 0) {
      return;
    }

    const start = selectionPositions[0];
    const dx = x - start.x;
    const dy = y - start.y;

    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) {
      return;
    }

    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    const stepX = dx === 0 ? 0 : dx / steps;
    const stepY = dy === 0 ? 0 : dy / steps;

    const nextPositions = [];
    for (let index = 0; index <= steps; index += 1) {
      nextPositions.push({
        x: start.x + stepX * index,
        y: start.y + stepY * index,
      });
    }

    setSelectionPositions(nextPositions);
  };

  const handleEnd = () => {
    setIsSelecting(false);

    if (selectionPositions.length < 2) {
      setSelectionPositions([]);
      return;
    }

    const start = selectionPositions[0];
    const end = selectionPositions[selectionPositions.length - 1];

    const match = words.find((word) =>
      !word.found && (
        (word.startX === start.x && word.startY === start.y && word.endX === end.x && word.endY === end.y)
        || (word.endX === start.x && word.endY === start.y && word.startX === end.x && word.startY === end.y)
      )
    );

    if (match) {
      setLocalGrid((previous) => previous.map((row) => row.map((cell) => {
        if (selectionPositions.some((position) => position.x === cell.x && position.y === cell.y)) {
          return { ...cell, isPartOfFoundWord: true, justFound: true };
        }
        return cell;
      })));
      onWordFound(match);

      window.setTimeout(() => {
        setLocalGrid((previous) => previous.map((row) => row.map((cell) => {
          if (!cell.justFound) {
            return cell;
          }

          const { justFound, ...rest } = cell;
          return rest as GridCell;
        })));
      }, 500);
    } else {
      setInvalidSelectionPositions(selectionPositions);
      onInvalidSelection();
      window.setTimeout(() => setInvalidSelectionPositions([]), 350);
    }

    setSelectionPositions([]);
  };

  const getCellFromPoint = (clientX: number, clientY: number) => {
    if (!containerRef.current) {
      return null;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const cellSize = rect.width / grid.length;
    const x = Math.floor((clientX - rect.left) / cellSize);
    const y = Math.floor((clientY - rect.top) / cellSize);

    if (x < 0 || x >= grid.length || y < 0 || y >= grid.length) {
      return null;
    }

    return { x, y };
  };

  useEffect(() => {
    const endSelection = () => {
      if (isSelecting) {
        handleEnd();
      }
    };

    window.addEventListener('mouseup', endSelection);
    window.addEventListener('touchend', endSelection);

    return () => {
      window.removeEventListener('mouseup', endSelection);
      window.removeEventListener('touchend', endSelection);
    };
  }, [isSelecting, selectionPositions, words]);

  return (
    <div
      ref={containerRef}
      className="mx-auto grid aspect-square w-full max-w-[34rem] touch-none select-none overflow-hidden rounded-2xl border border-white/12 bg-[#061223] p-1.5 shadow-inner sm:rounded-[30px] sm:p-4"
      style={{
        gridTemplateColumns: `repeat(${grid.length}, 1fr)`,
        gridTemplateRows: `repeat(${grid.length}, 1fr)`,
        gap: grid.length > 14 ? '2px' : grid.length > 10 ? '4px' : '6px',
      }}
      onMouseLeave={handleEnd}
      onMouseMove={(event) => {
        if (event.buttons !== 1) {
          return;
        }

        const cell = getCellFromPoint(event.clientX, event.clientY);
        if (cell) {
          handleMove(cell.x, cell.y);
        }
      }}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (!touch) {
          return;
        }

        const cell = getCellFromPoint(touch.clientX, touch.clientY);
        if (cell) {
          handleMove(cell.x, cell.y);
        }
      }}
    >
      {localGrid.map((row, y) => row.map((cell, x) => (
        <motion.div
          key={`${x}-${y}`}
          initial={{ scale: 0.86, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: Math.min((x + y) * 0.008, 0.2) }}
          onMouseDown={() => handleStart(x, y)}
          onTouchStart={() => handleStart(x, y)}
          className={cn(
            'flex aspect-square items-center justify-center overflow-hidden rounded-lg border text-center font-bold transition-all duration-150 sm:rounded-2xl',
            cell.justFound
              ? 'scale-105 border-emerald-400 bg-emerald-400 text-white shadow-lg'
              : cell.isPartOfFoundWord
                ? 'border-[#f6c969]/45 bg-[#f6c969]/18 text-[#ffe39a] shadow-sm'
                : invalidSelectionPositions.some((position) => position.x === cell.x && position.y === cell.y)
                  ? 'border-rose-400 bg-rose-500/30 text-white shadow-sm'
                : cell.highlighted
                  ? 'scale-[1.04] border-[#7dc3ff] bg-[#17406f] text-white shadow-sm'
                  : 'border-white/10 bg-white/6 text-[#e3f0ff]'
          )}
          style={{
            fontSize: grid.length > 14 ? '0.7rem' : grid.length > 10 ? '0.85rem' : '1rem',
          }}
        >
          {cell.letter}
        </motion.div>
      )))}
    </div>
  );
}