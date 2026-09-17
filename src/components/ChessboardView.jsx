import { useRef, useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';

/**
 * Responsive chessboard that always fits its parent card/column.
 * Uses ResizeObserver so fixed default widths cannot overflow the layout.
 */
export default function ChessboardView({
  position,
  onPieceDrop,
  boardOrientation = 'white',
  customArrows = [],
  customSquareStyles = {},
  isDraggable = true,
  lastMove = null, // { from: 'e2', to: 'e4' }
  boardWidth,
}) {
  const containerRef = useRef(null);
  const [computedWidth, setComputedWidth] = useState(boardWidth || 320);

  useEffect(() => {
    if (boardWidth) {
      setComputedWidth(boardWidth);
      return undefined;
    }

    const el = containerRef.current;
    if (!el) return undefined;

    const updateWidth = () => {
      const styles = getComputedStyle(el);
      const padX =
        (parseFloat(styles.paddingLeft) || 0) +
        (parseFloat(styles.paddingRight) || 0);
      const available = Math.max(0, el.clientWidth - padX);
      // Fit parent content box; clamp only the upper bound for large desktops.
      const target = Math.max(160, Math.min(available, 580));
      setComputedWidth(target);
    };

    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(el);
    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [boardWidth]);

  // Combine square styles for last move
  const squareStyles = { ...customSquareStyles };
  if (lastMove?.from && lastMove?.to) {
    squareStyles[lastMove.from] = {
      backgroundColor: 'rgba(255, 255, 0, 0.35)',
      ...squareStyles[lastMove.from],
    };
    squareStyles[lastMove.to] = {
      backgroundColor: 'rgba(255, 255, 0, 0.45)',
      ...squareStyles[lastMove.to],
    };
  }

  // Normalize arrows to react-chessboard v5 format: { startSquare, endSquare, color }
  const formattedArrows = (customArrows || []).map((arr) => {
    if (Array.isArray(arr)) {
      return {
        startSquare: arr[0],
        endSquare: arr[1],
        color: arr[2] || '#ffaa00',
      };
    }
    return arr;
  });

  // Handler for drop in react-chessboard v5
  const handlePieceDrop = ({ piece, sourceSquare, targetSquare }) => {
    if (!targetSquare) return false;
    if (!onPieceDrop) return false;
    const res = onPieceDrop(sourceSquare, targetSquare, piece);
    return res !== false;
  };

  const chessboardOptions = {
    position,
    boardOrientation,
    allowDragging: isDraggable,
    onPieceDrop: handlePieceDrop,
    arrows: formattedArrows,
    squareStyles,
    boardStyle: {
      width: '100%',
      height: '100%',
      borderRadius: '8px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
    },
    darkSquareStyle: { backgroundColor: '#769656' },
    lightSquareStyle: { backgroundColor: '#eeeed2' },
    animationDurationInMs: 200,
    clearArrowsOnPositionChange: false,
  };

  return (
    <div
      ref={containerRef}
      className="w-full max-w-full overflow-hidden flex items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-sm"
    >
      <div
        className="max-w-full"
        style={{ width: computedWidth, height: computedWidth }}
      >
        <Chessboard options={chessboardOptions} />
      </div>
    </div>
  );
}
