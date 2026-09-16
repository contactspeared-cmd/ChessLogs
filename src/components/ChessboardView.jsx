import { useRef, useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';

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
  const [computedWidth, setComputedWidth] = useState(boardWidth || 520);

  useEffect(() => {
    if (boardWidth) {
      setComputedWidth(boardWidth);
      return;
    }

    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        // Keep square and limit max/min
        const target = Math.min(Math.max(width - 16, 280), 580);
        setComputedWidth(target);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
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
      className="flex items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-sm"
    >
      <div style={{ width: computedWidth, height: computedWidth }}>
        <Chessboard options={chessboardOptions} />
      </div>
    </div>
  );
}
