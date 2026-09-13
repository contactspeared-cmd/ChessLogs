export type UserRole = 'coach' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  chesscomUsername?: string;
  avatar?: string;
  title?: string;
  school?: string; // e.g. "Saint Joseph School Foundation Inc."
  rating?: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  chesscomUsername: string;
  avatar?: string;
  gradeLevel?: string;
  school: string;
  joinedDate: string;
  notesCount: number;
  assignedCoursesCount: number;
  rapidRating?: number;
  blitzRating?: number;
  bulletRating?: number;
  puzzleRating?: number;
  totalGamesAnalyzed?: number;
  coachNotes?: string;
}

export interface ChesscomStats {
  chess_rapid?: {
    last?: { rating: number; date: number };
    best?: { rating: number; date: number };
    record?: { win: number; loss: number; draw: number };
  };
  chess_blitz?: {
    last?: { rating: number; date: number };
    best?: { rating: number; date: number };
    record?: { win: number; loss: number; draw: number };
  };
  chess_bullet?: {
    last?: { rating: number; date: number };
    best?: { rating: number; date: number };
    record?: { win: number; loss: number; draw: number };
  };
  tactics?: {
    highest?: { rating: number };
    lowest?: { rating: number };
  };
}

export interface ChessGamePlayer {
  username: string;
  rating: number;
  result: string;
  avatar?: string;
}

export interface ChessGame {
  id: string;
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  time_class: 'rapid' | 'blitz' | 'bullet' | 'daily';
  rules: string;
  white: ChessGamePlayer;
  black: ChessGamePlayer;
  accuracies?: {
    white?: number;
    black?: number;
  };
  coachReviewed?: boolean;
  coachNotes?: string;
  opening?: string;
}

export type LessonType = 'board' | 'video' | 'both';

export interface CourseChapter {
  id: string;
  title: string;
  description: string;
  type: LessonType; // 'board' | 'video' | 'both'
  videoUrl?: string; // YouTube, Loom, or direct MP4 URL
  pgn?: string;
  initialFen?: string;
  moveExplanations?: Record<number, string>; // move index -> coach note
  keyTakeaways?: string[];
  order: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'Openings' | 'Middlegame' | 'Endgames' | 'Tactics' | 'Game Analysis';
  thumbnail?: string;
  instructor: string;
  institution: string; // "SJSFI Chess Academy"
  chapters: CourseChapter[];
  totalDuration?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EngineAnalysisResult {
  score: number; // in centipawns or +10000 for mate
  mate?: number; // moves to mate
  depth: number;
  bestMove: string; // e.g. "e2e4" or SAN
  pv: string[]; // principal variation
  nps?: number;
  isEvaluating: boolean;
}

export interface MoveAnnotation {
  moveNumber: number;
  san: string;
  fen: string;
  eval?: number;
  classification?: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';
  comment?: string;
}
