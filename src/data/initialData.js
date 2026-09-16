/**
 * Default seed data for initial setup, offline testing, and preview
 */

export const DEMO_PROFILES = [
  {
    id: 'coach-kasparov-uuid',
    role: 'admin',
    display_name: 'Coach Kasparov',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    chesscom_username: 'magnuscarlsen',
    bio: 'Grandmaster coach specializing in dynamic tactical awareness and positional endgame conversions.',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'student-alex-uuid',
    role: 'student',
    display_name: 'Alex Rivera',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    chesscom_username: 'hikaru',
    bio: 'Club player working towards 2000 Elo on Chess.com. Focusing on Sicilian defense and pawn structure.',
    created_at: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'student-elena-uuid',
    role: 'student',
    display_name: 'Elena Rostova',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    chesscom_username: 'danielnaroditsky',
    bio: 'Intermediate player mastering king safety and tactical forks in open games.',
    created_at: '2026-03-01T00:00:00.000Z',
  },
];

export const DEMO_COURSES = [
  {
    id: 'course-sicilian-mastery',
    title: 'Mastering the Sicilian Defense: Openings & Plans',
    description: 'Learn critical responses against 1.e4 with active counterplay in the Najdorf and Dragon variations.',
    type: 'walkthrough',
    created_by: 'coach-kasparov-uuid',
    created_at: '2026-02-01T00:00:00.000Z',
    chapters: [
      {
        id: 'chap-1-najdorf-intro',
        order_index: 1,
        title: 'Chapter 1: The Najdorf 6.Bg5 Critical Line',
        video_url: null,
        pgn: `[Event "Najdorf Demonstration"]
[Site "ChessLogs"]
[Date "2026.01.01"]
[Round "1"]
[White "Coach"]
[Black "Student"]
[Result "*"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 Qb6 8. Qd2 Qxb2 *`,
        annotations: [
          {
            ply: 12,
            comment: '6. Bg5 is the sharpest test of the Najdorf. Prepare e6 to blunt the bishop.',
            keyMove: 'e6',
          },
          {
            ply: 14,
            comment: 'The Poisoned Pawn variation! Qb6 hits the b2 pawn and tests White’s compensation.',
            keyMove: 'Qb6',
          },
        ],
      },
      {
        id: 'chap-2-tactical-breakthroughs',
        order_index: 2,
        title: 'Chapter 2: The ...d5 Central Breakthrough',
        video_url: null,
        pgn: `[Event "Sicilian Center Break"]
[Site "ChessLogs"]
[Date "2026.01.02"]
[Round "2"]
[White "Coach"]
[Black "Student"]
[Result "*"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5 7. Nb3 Be7 8. O-O O-O 9. Be3 Be6 10. Qd2 d5 *`,
        annotations: [
          {
            ply: 20,
            comment: 'When White delays f4, Black strikes directly in the center with ...d5!',
            keyMove: 'd5',
          },
        ],
      },
    ],
  },
  {
    id: 'course-endgame-fundamentals',
    title: 'Rook & Pawn Endgames: The Lucena & Philidor Positions',
    description: 'Master the fundamental drawing and winning techniques in essential rook endings.',
    type: 'video',
    created_by: 'coach-kasparov-uuid',
    created_at: '2026-02-10T00:00:00.000Z',
    chapters: [
      {
        id: 'chap-video-lucena',
        order_index: 1,
        title: 'Building the Bridge: The Lucena Position',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        pgn: null,
        annotations: [],
      },
    ],
  },
];

export const DEMO_GAMES = [
  {
    id: 'sample-game-1',
    student_id: 'student-alex-uuid',
    chesscom_game_id: '1249827411',
    time_class: 'rapid',
    result: 'win',
    white_username: 'hikaru',
    black_username: 'grandmaster_x',
    white_rating: 2840,
    black_rating: 2795,
    url: 'https://www.chess.com/game/live/1249827411',
    played_at: '2026-09-10T14:30:00.000Z',
    synced_at: '2026-09-15T08:00:00.000Z',
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.10"]
[White "hikaru"]
[Black "grandmaster_x"]
[Result "1-0"]
[ECO "C54"]
[WhiteElo "2840"]
[BlackElo "2795"]
[TimeControl "600"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 Nce7 11. O-O O-O 12. Rfe1 c6 13. a4 Qb6 14. Qa3 Be6 15. a5 Qc7 16. Ne4 Rad8 17. Nc5 Bc8 18. Rac1 Nf4 19. Ne4 Ned5 20. g3 Nh3+ 21. Kg2 Qd7 22. Ne5 Qf5 23. Qf3 Qxf3+ 24. Nxf3 Rfe8 25. Bxd5 cxd5 26. Rxc8 Rxc8 27. Nd6 Rxe1 28. Nxe1 Rd8 29. Nxb7 Rb8 30. a6 Ng5 31. Nd3 Ne6 32. Nb4 Nxd4 33. Nxd5 1-0`,
  },
  {
    id: 'sample-game-2',
    student_id: 'student-alex-uuid',
    chesscom_game_id: '1249827412',
    time_class: 'blitz',
    result: 'loss',
    white_username: 'challenger_y',
    black_username: 'hikaru',
    white_rating: 2760,
    black_rating: 2845,
    url: 'https://www.chess.com/game/live/1249827412',
    played_at: '2026-09-08T18:15:00.000Z',
    synced_at: '2026-09-15T08:00:00.000Z',
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.08"]
[White "challenger_y"]
[Black "hikaru"]
[Result "1-0"]
[ECO "B20"]
[WhiteElo "2760"]
[BlackElo "2845"]

1. e4 c5 2. b3 Nc6 3. Bb2 e5 4. Nf3 d6 5. Bc4 Be7 6. O-O Nf6 7. Re1 O-O 8. c3 Nxe4 9. d4 exd4 10. cxd4 d5 11. dxc5 Bxc5 12. Qxd5 Bxf2+ 13. Kf1 Bxe1 14. Qxe4 Re8 15. Qf4 Be6 16. Nxe1 Bxc4+ 17. bxc4 Qd1 18. Qd2 Rad8 19. Qxd1 Rxd1 20. Na3 Rexe1+ 21. Kf2 Rxa1 22. Bxa1 Rxa1 1-0`,
  },
];
