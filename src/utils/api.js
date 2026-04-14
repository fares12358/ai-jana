/**
 * utils/api.js — Centralised API function library
 * Backend: https://lecture-brain-last-production.up.railway.app
 *
 * Domains:
 *   auth      — register, login
 *   subjects  — CRUD
 *   lectures  — CRUD + status polling
 *   knowledge — text / PDF / video ingestion
 *   ai        — chat, explain, summary, quiz
 *   admin     — analytics, generate, presentation, upload, operations
 */

import { axiosInstance } from "./axios";

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/** POST /auth/register — { email, password }
 *  Returns: { id, email, ... } */
export function apiRegister({ email, password }) {
  return axiosInstance.post("/auth/register", { email, password },
    { headers: { "Content-Type": "application/json" } });
}

/** POST /auth/login — OAuth2 form-data
 *  Returns: { access_token, token_type, user: { id, email, role, is_active } } */
export function apiLogin({ email, password }) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return axiosInstance.post("/auth/login", form,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
}

/** GET /auth/me — Returns current user profile (optional, kept for compatibility) */
export function apiGetMe() {
  return axiosInstance.get("/auth/me");
}

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────

export const apiCreateSubject = ({ name, description = "" }) =>
  axiosInstance.post("/subjects/", { name, description });

export const apiGetSubjects = () =>
  axiosInstance.get("/subjects/");

export const apiGetSubject = (id) =>
  axiosInstance.get(`/subjects/${id}`);

export const apiDeleteSubject = (id) =>
  axiosInstance.delete(`/subjects/${id}`);

// ─── LECTURES ─────────────────────────────────────────────────────────────────

export const apiCreateLecture = ({ title, description = "", subject_id }) =>
  axiosInstance.post("/lectures/", { title, description, subject_id });

export const apiGetLecturesBySubject = (subjectId) =>
  axiosInstance.get(`/lectures/subject/${subjectId}`);

export const apiGetLecture = (id) =>
  axiosInstance.get(`/lectures/${id}`);

export const apiGetLectureStatus = (id) =>
  axiosInstance.get(`/lectures/${id}/status`);

export const apiDeleteLecture = (id) =>
  axiosInstance.delete(`/lectures/${id}`);

// ─── KNOWLEDGE INGESTION ──────────────────────────────────────────────────────

export const apiUploadText = (lectureId, text) =>
  axiosInstance.post(`/knowledge/upload_text/${lectureId}`, { text });

export function apiUploadPdf(lectureId, file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  return axiosInstance.post(`/knowledge/upload_pdf/${lectureId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total ?? 1)))
      : undefined,
  });
}

export const apiUploadVideo = (lectureId, { url, extract_frames = false }) =>
  axiosInstance.post(`/knowledge/upload_video/${lectureId}`, { url, extract_frames });

// ─── AI INFERENCE ─────────────────────────────────────────────────────────────

export const apiChat = ({ message, lecture_id, history = [] }) =>
  axiosInstance.post("/ai/chat", { message, lecture_id, history });

export const apiExplain = ({ concept, lecture_id }) =>
  axiosInstance.post("/ai/explain", { concept, lecture_id });

export const apiGetSummary = (lectureId) =>
  axiosInstance.get(`/ai/summary/${lectureId}`);

export const apiGenerateQuiz = (lectureId) =>
  axiosInstance.post(`/ai/quiz/${lectureId}`);

// ─── ADMIN ────────────────────────────────────────────────────────────────────
// All admin routes require Authorization: Bearer <admin_token>

/**
 * GET /admin/analytics
 * Returns platform-wide analytics stats.
 * @returns {{ total_users, total_subjects, total_lectures, total_chunks,
 *             lectures_by_status: { completed, processing, failed },
 *             recent_activity: [...], ... }}
 */
export const apiAdminAnalytics = () =>
  axiosInstance.get("/admin/analytics");

/**
 * POST /admin/analytics/generate
 * Triggers analytics regeneration / refresh on the backend.
 * @returns {{ message, ... }}
 */
export const apiAdminAnalyticsGenerate = () =>
  axiosInstance.post("/admin/analytics/generate");

/**
 * GET /admin/presentation/{lecture_id}
 * Returns AI-generated presentation slides for a lecture.
 * @param {string} lectureId
 * @returns {{ slides: [...], lecture_title: string, ... }}
 */
export const apiAdminPresentation = (lectureId) =>
  axiosInstance.get(`/admin/presentation/${lectureId}`);

/**
 * POST /admin/upload_pdf
 * Admin-level PDF upload (not tied to a specific lecture).
 * Form data: file
 * @param {File} file
 * @param {(pct: number) => void} [onProgress]
 */
export function apiAdminUploadPdf(file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  return axiosInstance.post("/admin/upload_pdf", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total ?? 1)))
      : undefined,
  });
}

/**
 * POST /admin/upload_video
 * Admin-level video URL upload.
 * @param {{ url: string, extract_frames?: boolean }} body
 */
export const apiAdminUploadVideo = ({ url, extract_frames = false }) =>
  axiosInstance.post("/admin/upload_video", { url, extract_frames });

/**
 * GET /admin/operations
 * Returns recent admin operations / system log.
 * @returns {{ operations: [...], ... }}
 */
export const apiAdminOperations = () =>
  axiosInstance.get("/admin/operations");
