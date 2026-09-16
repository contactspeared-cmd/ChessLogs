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

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-sm"
    >
      <div style={{ width: computedWidth, height: computedWidth }}>
        <Chessboard
          position={position}
          onPieceDrop={onPieceDrop}
          boardOrientation={boardOrientation}
          arePiecesDraggable={isDraggable}
          customArrows={customArrows}
          customSquareStyles={squareStyles}
          customBoardStyle={{
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
          customDarkSquareStyle={{ backgroundColor: '#769656' }}
          customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
          animationDuration={200}
        />
      </div>
    </div>
  );
}
