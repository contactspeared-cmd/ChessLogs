import { getAllAccounts, getStudentEnrollments } from './authStore';
import { getAllStudents } from './db';

const STORAGE_CHAT = 'chesslogs_chat_messages';
const STORAGE_SUPPORT = 'chesslogs_support_tickets';
const STORAGE_FEEDBACK = 'chesslogs_feedback_items';

const SEED_MESSAGES = [
  {
    id: 'msg-seed-1',
    sender_id: 'coach-magnus-uuid',
    receiver_id: 'student-alex-uuid',
    text: 'Welcome to the training cohort Alex! Review chapter 1 of the Sicilian walkthrough before our tactical session tomorrow.',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 *',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    is_read: true,
  },
  {
    id: 'msg-seed-2',
    sender_id: 'student-alex-uuid',
    receiver_id: 'coach-magnus-uuid',
    text: 'Thank you coach! I worked through the Dragon setup moves and found the bishop sacrifice on g7 fascinating.',
    pgn: '',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    is_read: true,
  },
  {
    id: 'msg-seed-3',
    sender_id: 'coach-magnus-uuid',
    receiver_id: 'student-alex-uuid',
    text: 'Good job. Pay close attention to move 12 h4 thrusts in Yugoslav Attack.',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O 8. Qd2 Nc6 9. Bc4 Bd7 10. O-O-O Rc8 11. Bb3 Ne5 12. h4 *',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_read: false,
  },
];

const SEED_TICKETS = [
  {
    id: 'tkt-001',
    user_id: 'student-alex-uuid',
    user_name: 'Alex M. Rivera Jr.',
    user_email: 'student@chesslogs.com',
    category: 'MoveTrainer',
    subject: 'Spaced repetition flashcard reset issue',
    message: 'When I finish chapter 2, the spaced repetition scheduling interval does not recalculate immediately.',
    status: 'resolved',
    priority: 'medium',
    response: 'The algorithm updates your interval upon reaching 100% accuracy. Please refresh your course cards.',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'tkt-002',
    user_id: 'coach-magnus-uuid',
    user_name: 'Magnus C. Carlsen',
    user_email: 'coach@chesslogs.com',
    category: 'Curriculum Studio',
    subject: 'PGN import with nested sub-variations',
    message: 'Would like to request multi-branch variation tree parsing during PGN chapter wizard imports.',
    status: 'in-review',
    priority: 'high',
    response: 'Engine Variation Tools team is testing multi-PV subvariation trees in Stockfish 18 NNUE.',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

const SEED_FEEDBACK = [
  {
    id: 'fb-001',
    user_id: 'student-alex-uuid',
    user_name: 'Alex Rivera',
    category: 'Feature Request',
    rating: 5,
    title: 'Sound effects on MoveTrainer correct answers',
    comments: 'Loving the Chessable style Spaced Repetition engine! Audio cues for brilliant moves would be awesome.',
    upvotes: 14,
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
  {
    id: 'fb-002',
    user_id: 'coach-magnus-uuid',
    user_name: 'Magnus Carlsen',
    category: 'Course Content',
    rating: 5,
    title: 'Marketplace public enrollment option',
    comments: 'Excellent separation between general course learners and dedicated 1-on-1 mentored students.',
    upvotes: 28,
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
  {
    id: 'fb-003',
    user_id: 'admin-satoalt33-uuid',
    user_name: 'Admin Desk',
    category: 'User Experience',
    rating: 5,
    title: 'Clean light mode default interface',
    comments: 'High contrast clean slate light mode makes board vision and long study sessions much easier on the eyes.',
    upvotes: 19,
    created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
];

export function getChatMessages(userId1, userId2) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_CHAT);
    const list = raw ? JSON.parse(raw) : SEED_MESSAGES;
    if (!raw) {
      localStorage.setItem(STORAGE_CHAT, JSON.stringify(SEED_MESSAGES));
    }
    return list.filter(
      (m) =>
        (m.sender_id === userId1 && m.receiver_id === userId2) ||
        (m.sender_id === userId2 && m.receiver_id === userId1)
    ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } catch (err) {
    return [];
  }
}

export function sendChatMessage({ senderId, receiverId, text, pgn = '' }) {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_CHAT);
  const list = raw ? JSON.parse(raw) : [...SEED_MESSAGES];
  const newMsg = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    sender_id: senderId,
    receiver_id: receiverId,
    text: (text || '').trim(),
    pgn: (pgn || '').trim(),
    created_at: new Date().toISOString(),
    is_read: false,
  };
  list.push(newMsg);
  localStorage.setItem(STORAGE_CHAT, JSON.stringify(list));
  return newMsg;
}

export function getChatContacts(currentUserId, userRole = 'student') {
  const accounts = getAllAccounts();
  const enrollments = getStudentEnrollments();

  if (userRole === 'coach') {
    const studentIds = enrollments
      .filter((e) => e.coach_id === currentUserId)
      .map((e) => e.student_id);
    const directStudents = accounts.filter(
      (a) => studentIds.includes(a.id) || a.role === 'student'
    );
    return directStudents.length > 0
      ? directStudents
      : accounts.filter((a) => a.id !== currentUserId && a.role !== 'admin');
  }

  if (userRole === 'admin') {
    return accounts.filter((a) => a.id !== currentUserId);
  }

  const coachIds = enrollments
    .filter((e) => e.student_id === currentUserId)
    .map((e) => e.coach_id);
  const myCoaches = accounts.filter(
    (a) => coachIds.includes(a.id) || a.role === 'coach'
  );
  return myCoaches.length > 0
    ? myCoaches
    : accounts.filter((a) => a.role === 'coach');
}

export function getSupportTickets(userId = null) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_SUPPORT);
    const list = raw ? JSON.parse(raw) : SEED_TICKETS;
    if (!raw) {
      localStorage.setItem(STORAGE_SUPPORT, JSON.stringify(SEED_TICKETS));
    }
    if (userId) {
      return list.filter((t) => t.user_id === userId);
    }
    return list;
  } catch (err) {
    return [];
  }
}

export function createSupportTicket({ userId, userName, userEmail, category, subject, message, priority = 'medium' }) {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_SUPPORT);
  const list = raw ? JSON.parse(raw) : [...SEED_TICKETS];
  const newTicket = {
    id: 'tkt-' + (list.length + 1).toString().padStart(3, '0'),
    user_id: userId,
    user_name: userName || 'Student',
    user_email: userEmail || 'user@chesslogs.com',
    category: category || 'General Support',
    subject: (subject || '').trim(),
    message: (message || '').trim(),
    status: 'open',
    priority,
    response: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  list.unshift(newTicket);
  localStorage.setItem(STORAGE_SUPPORT, JSON.stringify(list));
  return newTicket;
}

export function updateSupportTicket(ticketId, { status, response }) {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_SUPPORT);
  const list = raw ? JSON.parse(raw) : [...SEED_TICKETS];
  const idx = list.findIndex((t) => t.id === ticketId);
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      status: status || list[idx].status,
      response: response !== undefined ? response : list[idx].response,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_SUPPORT, JSON.stringify(list));
    return list[idx];
  }
  return null;
}

export function getFeedbackItems() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_FEEDBACK);
    const list = raw ? JSON.parse(raw) : SEED_FEEDBACK;
    if (!raw) {
      localStorage.setItem(STORAGE_FEEDBACK, JSON.stringify(SEED_FEEDBACK));
    }
    return list.sort((a, b) => b.upvotes - a.upvotes);
  } catch (err) {
    return [];
  }
}

export function submitFeedback({ userId, userName, category, rating, title, comments }) {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_FEEDBACK);
  const list = raw ? JSON.parse(raw) : [...SEED_FEEDBACK];
  const newFb = {
    id: 'fb-' + (list.length + 1).toString().padStart(3, '0'),
    user_id: userId,
    user_name: userName || 'Community Member',
    category: category || 'Feature Request',
    rating: parseInt(rating, 10) || 5,
    title: (title || '').trim(),
    comments: (comments || '').trim(),
    upvotes: 1,
    created_at: new Date().toISOString(),
  };
  list.unshift(newFb);
  localStorage.setItem(STORAGE_FEEDBACK, JSON.stringify(list));
  return newFb;
}

export function upvoteFeedback(feedbackId) {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_FEEDBACK);
  const list = raw ? JSON.parse(raw) : [...SEED_FEEDBACK];
  const idx = list.findIndex((f) => f.id === feedbackId);
  if (idx !== -1) {
    list[idx].upvotes = (list[idx].upvotes || 0) + 1;
    localStorage.setItem(STORAGE_FEEDBACK, JSON.stringify(list));
    return list[idx];
  }
  return null;
}
