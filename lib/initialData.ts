import { User, StudentProfile, Course, ChessGame } from './types';

export const COACH_ADMIN: User = {
  id: 'coach-sjsfi-admin',
  name: 'Coach Admin (SJSFI Head Coach)',
  email: 'coach@sjsfi.edu.ph',
  role: 'coach',
  chesscomUsername: 'sjsfi_coach',
  title: 'FIDE National Arbiter / SJSFI Chess Director',
  school: 'Saint Joseph School Foundation Inc. - Zamboanga City',
  rating: 2150,
};

export const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: 'student-1',
    name: 'Juan Carlos Mendoza',
    email: 'carlos.mendoza@student.sjsfi.edu.ph',
    chesscomUsername: 'magnuscarlsen', // Live chess.com handle for real games test
    school: 'Saint Joseph School Foundation Inc. (Junior High)',
    gradeLevel: 'Grade 9 - St. Joseph',
    joinedDate: '2024-06-15',
    notesCount: 5,
    assignedCoursesCount: 3,
    rapidRating: 1640,
    blitzRating: 1580,
    bulletRating: 1490,
    puzzleRating: 2100,
    totalGamesAnalyzed: 28,
    coachNotes: 'Excellent tactical vision. Needs to improve time management in rook endgames and Sicilian defense lines.',
  },
  {
    id: 'student-2',
    name: 'Maria Elena Santos',
    email: 'maria.santos@student.sjsfi.edu.ph',
    chesscomUsername: 'hikaru', // Live chess.com handle for real games test
    school: 'Saint Joseph School Foundation Inc. (Senior High)',
    gradeLevel: 'Grade 11 - STEM A',
    joinedDate: '2024-07-01',
    notesCount: 8,
    assignedCoursesCount: 4,
    rapidRating: 1820,
    blitzRating: 1795,
    bulletRating: 1720,
    puzzleRating: 2350,
    totalGamesAnalyzed: 45,
    coachNotes: 'SJSFI Zamboanga Inter-School Varsity Qualifier. Sharp opening repertoire with 1.e4.',
  },
  {
    id: 'student-3',
    name: 'Gabriel Alonto',
    email: 'gabriel.alonto@student.sjsfi.edu.ph',
    chesscomUsername: 'daniil_dubov', // Live chess.com handle
    school: 'Saint Joseph School Foundation Inc. (Grade School)',
    gradeLevel: 'Grade 6 - St. Francis',
    joinedDate: '2024-08-10',
    notesCount: 3,
    assignedCoursesCount: 2,
    rapidRating: 1320,
    blitzRating: 1250,
    bulletRating: 1180,
    puzzleRating: 1780,
    totalGamesAnalyzed: 14,
    coachNotes: 'Promising young talent. Focus on piece safety and king castling principles.',
  },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-italian-game',
    title: 'Italian Game & Giuoco Piano Masterclass',
    description: 'Master the classical e4-e5 setups, central control, and attacking motifs taught in the SJSFI varsity curriculum.',
    level: 'Intermediate',
    category: 'Openings',
    instructor: 'Coach Admin (SJSFI Zamboanga)',
    institution: 'Saint Joseph School Foundation Inc.',
    createdAt: '2024-05-10',
    updatedAt: '2024-09-01',
    totalDuration: '1h 45m (4 Chapters)',
    chapters: [
      {
        id: 'ch-1',
        title: 'Chapter 1: The Main Line Giuoco Piano (Move by Move)',
        description: 'Interactive walkthrough of the classical Italian setup with 3...Bc5 and 4.c3 Nf6 5.d4.',
        type: 'board', // purely move by move
        order: 1,
        pgn: `[Event "SJSFI Coaching Study"]
[Site "Zamboanga City"]
[Date "2024.05.10"]
[White "Coach Admin"]
[Black "Student"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 *`,
        moveExplanations: {
          1: '1. e4 controls the center and frees lines for White queen and light-squared bishop.',
          2: '2. Nf3 develops with tempo, attacking the undefended pawn on e5.',
          3: '3. Bc4: The Italian Game! White targets Black vulnerable f7 square.',
          4: '4. c3: Preparing d2-d4 to build a massive classical pawn center.',
          5: '5. d4! Direct challenge in the center. Black must respond with 5...exd4.',
          6: '6. cxd4 creates the ideal two-pawn center occupying d4 and e4.',
          7: '7. Bd2 neutralizes the check and facilitates quick kingside development.',
          10: '10. Qb3! Crucial SJSFI tactical motif: double attack against d5 and f7!',
        },
        keyTakeaways: [
          'Stake early claim on d4 and e4',
          'Coordinate Bc4 and Qb3 against Black f7 weakness',
          'Castle quickly to activate the rook on the semi-open e-file'
        ]
      },
      {
        id: 'ch-2',
        title: 'Chapter 2: Attacking the Castled King (Pure Video)',
        description: 'Comprehensive video breakdown explaining piece sacrifices on h7 and f7 in the Italian structure.',
        type: 'video', // pure video
        videoUrl: 'https://www.youtube.com/watch?v=OCSbzArwB10', // Educational chess video
        order: 2,
        keyTakeaways: [
          'Recognize when Black g6 pawn creates dark square hooks',
          'Calculate the Greek Gift sacrifice (Bxh7+) conditions',
          'Use the rook lift via Rf3 or Re3-g3'
        ]
      },
      {
        id: 'ch-3',
        title: 'Chapter 3: Evans Gambit - Total Dominance (Board + Video Synchronized)',
        description: 'The explosive 4.b4 gambit! Follow each tactical move on the digital board while listening to the audio-visual lecture.',
        type: 'both', // Both move by move and video
        videoUrl: 'https://www.youtube.com/watch?v=0eA3h4zT8hA',
        order: 3,
        pgn: `[Event "SJSFI Varsity Prep"]
[Site "Zamboanga City"]
[Date "2024.08.14"]
[White "Coach Admin"]
[Black "Defensive System"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O Nge7 8. Ng5 d5 9. exd5 Ne5 10. Qxd4 *`,
        moveExplanations: {
          4: '4. b4!! The Evans Gambit. White sacrifices a wing pawn to gain tempo and control the absolute center.',
          5: '5. c3 pushes the bishop back and sets up the central steamroller d2-d4.',
          6: '6. d4 strikes before Black can castle.',
          7: '7. O-O safely secures White king while Black king is stranded in the open center.',
          8: '8. Ng5! Putting immediate lethal pressure on f7.'
        },
        keyTakeaways: [
          'In gambits, time and initiative are worth more than material',
          'Keep lines open towards the uncastled enemy king',
          'Notice how white knight on g5 coordinates with bishop on c4'
        ]
      }
    ]
  },
  {
    id: 'course-endgame-fundamentals',
    title: 'Essential Rook Endgames for Competitive Play',
    description: 'Lucena, Philidor, and the cut-off technique every SJSFI tournament player must know by heart.',
    level: 'Advanced',
    category: 'Endgames',
    instructor: 'Coach Admin (SJSFI Zamboanga)',
    institution: 'Saint Joseph School Foundation Inc.',
    createdAt: '2024-06-20',
    updatedAt: '2024-08-25',
    totalDuration: '1h 15m (3 Chapters)',
    chapters: [
      {
        id: 'ch-end-1',
        title: 'Chapter 1: The Lucena Position - Building the Bridge (Move by Move)',
        description: 'The definitive winning technique for pawn + rook vs rook endgames.',
        type: 'board',
        order: 1,
        initialFen: '1K1k4/1P6/8/8/8/8/r7/1R6 w - - 0 1',
        pgn: `[Event "Lucena Bridge"]
[Result "1-0"]

1. Rd1+ Ke7 2. Rd4 Ra1 3. Kc7 Rc1+ 4. Kb6 Rb1+ 5. Kc6 Rc1+ 6. Kb5 Rb1+ 7. Rb4 *`,
        moveExplanations: {
          1: '1. Rd1+ cuts the black king off from the promoting square.',
          2: '2. Rd4!! The key "Bridge" move! White rook moves to the 4th rank to shield the king later.',
          6: '6. Kb5 steps to the 5th rank.',
          7: '7. Rb4! The bridge is complete! White shields against checks and guarantees queen promotion.'
        },
        keyTakeaways: [
          'Cut the opposing king off by at least one file',
          'Place rook on the 4th rank to prepare the shielding bridge',
          'Never rush the king out without a planned shelter'
        ]
      },
      {
        id: 'ch-end-2',
        title: 'Chapter 2: The Philidor Defensive Barrier (Both Board & Video)',
        description: 'How to reliably draw down a pawn when defending against an active rook.',
        type: 'both',
        videoUrl: 'https://www.youtube.com/watch?v=2mK3mR_cR5U',
        order: 2,
        pgn: `[Event "Philidor Defense"]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 *`,
        keyTakeaways: [
          'Keep your defensive rook on the 6th rank until the pawn advances',
          'Once the pawn steps to the 6th rank, immediately drop your rook to the 1st rank for rear checks',
          'Draw is completely forced with precise play'
        ]
      }
    ]
  }
];

export const INITIAL_DEMO_GAMES: ChessGame[] = [
  {
    id: 'game-demo-1',
    url: 'https://www.chess.com/game/live/10892348123',
    time_control: '600',
    time_class: 'rapid',
    end_time: 1726058400,
    rated: true,
    rules: 'chess',
    white: {
      username: 'carlos_sjsfi',
      rating: 1640,
      result: 'win',
    },
    black: {
      username: 'opponent_val22',
      rating: 1615,
      result: 'resigned',
    },
    opening: "Italian Game: Giuoco Pianissimo",
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.09.11"]
[White "carlos_sjsfi"]
[Black "opponent_val22"]
[Result "1-0"]
[WhiteElo "1640"]
[BlackElo "1615"]
[TimeControl "600"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O a6 7. Bb3 Ba7 8. Nbd2 O-O 9. h3 Be6 10. Bc2 d5 11. Re1 dxe4 12. dxe4 Nh5 13. Nf1 Qf6 14. Be3 Nf4 15. Bxa7 Rxa7 16. Ne3 Rd8 17. Qc1 Nxh3+ 18. gxh3 Qxf3 19. Bd1 Qxh3 20. Be2 Raa8 21. Bf1 Qh4 22. Bg2 Rd6 23. Qc2 Rad8 24. Rad1 Bh3 25. Rxd6 Rxd6 26. Rd1 Rg6 27. f3 Qf4 28. Qf2 h6 29. Kh1 Bxg2+ 30. Nxg2 Qg5 31. Ne3 Qh5+ 32. Qh2 Qxf3+ 0-1`,
    coachReviewed: true,
    coachNotes: 'Juan Carlos played great opening moves, but faltered on move 17 by allowing Nxh3+. Work on king safety under f-pawn and h-pawn pressure.',
    accuracies: {
      white: 78.4,
      black: 89.1
    }
  },
  {
    id: 'game-demo-2',
    url: 'https://www.chess.com/game/live/10892349944',
    time_control: '180+2',
    time_class: 'blitz',
    end_time: 1726144800,
    rated: true,
    rules: 'chess',
    white: {
      username: 'grandmaster_guest',
      rating: 1810,
      result: 'checkmated',
    },
    black: {
      username: 'maria_sjsfi',
      rating: 1825,
      result: 'win',
    },
    opening: "Sicilian Defense: Najdorf Variation",
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.09.12"]
[White "grandmaster_guest"]
[Black "maria_sjsfi"]
[Result "0-1"]
[WhiteElo "1810"]
[BlackElo "1825"]
[TimeControl "180+2"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 h5 9. Qd2 Nbd7 10. O-O-O Be7 11. Kb1 Rc8 12. Nd5 Nxd5 13. exd5 Bf5 14. Bd3 Bxd3 15. Qxd3 Bg5 16. Bf2 O-O 17. h4 Bh6 18. g4 e4 19. Qxe4 Re8 20. Qd4 g6 21. gxh5 Bg7 22. Qd2 Ne5 23. hxg6 Nc4 24. Qf4 fxg6 25. Bd4 Ne5 26. Rhg1 Rf8 27. Qg3 Rxf3 28. Qg2 Qxh4 29. Bxe5 Rf2 30. Qxg6 dxe5 31. Qxg7# 0-1`,
    coachReviewed: true,
    coachNotes: 'Superb tactical win by Maria! Great demonstration of counter-attack in the center while White launched the kingside storm.',
    accuracies: {
      white: 82.5,
      black: 94.2
    }
  }
];
