import { api } from './api';
import { getSiteAccounts, saveSiteAccounts } from './authStore';

const STORAGE_AUDIT_LOG = 'chesslogs_deletion_audit_vault';
const STORAGE_COURSES = 'chesslogs_courses';
const STORAGE_STUDENTS = 'chesslogs_students';
const STORAGE_GAMES = 'chesslogs_games';

export function getDeletionAuditRecords() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_AUDIT_LOG);
    const list = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0));
  } catch {
    return [];
  }
}

export function saveDeletionAuditRecords(records) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_AUDIT_LOG, JSON.stringify(records));
  } catch {}
}

export function recordDeletion({ itemType, itemId, itemTitle, deletedBy, reason, payload }) {
  if (!itemId) return null;
  const records = getDeletionAuditRecords();

  const newRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    item_type: itemType || 'item',
    item_id: itemId,
    item_title: itemTitle || itemId,
    deleted_by_id: deletedBy?.id || 'system',
    deleted_by_name: deletedBy?.display_name || deletedBy?.name || 'System Admin',
    deleted_by_email: deletedBy?.email || '',
    deleted_by_role: deletedBy?.role || 'admin',
    reason: (reason || '').trim() || 'No explicit reason specified',
    deleted_at: new Date().toISOString(),
    restored_at: null,
    restored_by: null,
    payload: payload || null,
  };

  records.unshift(newRecord);
  saveDeletionAuditRecords(records);
  return newRecord;
}

export async function restoreDeletedItem(auditId, adminProfile) {
  if (!adminProfile || adminProfile.role !== 'admin') {
    throw new Error('Unauthorized: Only system administrators have permission to restore deleted records.');
  }

  const records = getDeletionAuditRecords();
  const index = records.findIndex((r) => r.id === auditId);
  if (index === -1) {
    throw new Error('Audit record not found.');
  }

  const record = records[index];
  if (record.restored_at) {
    throw new Error('This item has already been restored.');
  }

  const payload = record.payload;
  if (!payload) {
    throw new Error('Item payload missing. Cannot restore full record.');
  }

  if (record.item_type === 'course') {
    const rawCourses = JSON.parse(localStorage.getItem(STORAGE_COURSES) || '[]');
    const exists = rawCourses.some((c) => c.id === payload.id);
    if (!exists) {
      rawCourses.unshift(payload);
      localStorage.setItem(STORAGE_COURSES, JSON.stringify(rawCourses));
    }
    try {
      await api.courses.save(payload, payload.chapters || []);
    } catch {}
  } else if (record.item_type === 'user' || record.item_type === 'student') {
    const siteAccounts = getSiteAccounts();
    const accIndex = siteAccounts.findIndex((a) => a.id === payload.id);
    if (accIndex === -1) {
      siteAccounts.unshift(payload);
    } else {
      siteAccounts[accIndex] = payload;
    }
    saveSiteAccounts(siteAccounts);

    const rawStudents = JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || '[]');
    const sIndex = rawStudents.findIndex((s) => s.id === payload.id);
    if (sIndex === -1) {
      rawStudents.unshift(payload);
    } else {
      rawStudents[sIndex] = payload;
    }
    localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(rawStudents));
  } else if (record.item_type === 'game') {
    const rawGames = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
    const gIndex = rawGames.findIndex((g) => g.id === payload.id);
    const restoredGame = { ...payload, archived: false };
    delete restoredGame.archived_at;
    delete restoredGame.archived_reason;
    if (gIndex === -1) {
      rawGames.unshift(restoredGame);
    } else {
      rawGames[gIndex] = restoredGame;
    }
    localStorage.setItem(STORAGE_GAMES, JSON.stringify(rawGames));
  }

  record.restored_at = new Date().toISOString();
  record.restored_by = adminProfile.display_name || adminProfile.email || 'Admin';

  records[index] = record;
  saveDeletionAuditRecords(records);

  return record;
}

export function purgeAuditRecord(auditId, adminProfile) {
  if (!adminProfile || adminProfile.role !== 'admin') {
    throw new Error('Unauthorized: Only administrators can purge audit records.');
  }

  const records = getDeletionAuditRecords();
  const filtered = records.filter((r) => r.id !== auditId);
  saveDeletionAuditRecords(filtered);
  return true;
}
