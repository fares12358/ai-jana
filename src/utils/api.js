/**
 * utils/api.js
 *
 * Centralised API function library.
 * Every function maps 1-to-1 with the backend endpoints documented at:
 * https://lecture-brain-last-production.up.railway.app/docs
 *
 * All functions return the unwrapped response payload (thanks to the
 * Axios response interceptor in utils/axios.js).
 *
 * Domains
 * ───────
 *  auth      — register, login, me
 *  subjects  — CRUD for subjects
 *  lectures  — CRUD + status polling for lectures
 *  knowledge — text / PDF / video ingestion per lecture
 *  ai        — chat, explain, summary, quiz
 */

import { axiosInstance } from "./axios";

// ═════════════════════════════════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /auth/register
 * Registers a new user.
 *
 * @param {{ email: string, password: string }} body
 * @returns {{ id: string, email: string, ... }}
 */
export function apiRegister({ email, password }) {
  return axiosInstance.post(
    "/auth/register",
    { email, password },
    { headers: { "Content-Type": "application/json" } }
  );
}

/**
 * POST /auth/login
 * OAuth2 password flow — MUST send as application/x-www-form-urlencoded.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {{ access_token: string, token_type: string }}
 */
export function apiLogin({ email, password }) {
  const form = new URLSearchParams();
  form.append("username", email); // FastAPI OAuth2 uses "username" field
  form.append("password", password);
  return axiosInstance.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

/**
 * GET /auth/me  (if the backend exposes it — gracefully skipped if 404)
 * Returns the currently authenticated user profile.
 *
 * @returns {{ id: string, email: string, ... }}
 */
export function apiGetMe() {
  return axiosInstance.get("/auth/me");
}

// ═════════════════════════════════════════════════════════════════════════════
// SUBJECTS  (all require Authorization: Bearer <token>)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /subjects/
 * Creates a new subject.
 *
 * @param {{ name: string, description?: string }} body
 * @returns {Subject}
 */
export function apiCreateSubject({ name, description = "" }) {
  return axiosInstance.post("/subjects/", { name, description });
}

/**
 * GET /subjects/
 * Lists all subjects belonging to the authenticated user.
 *
 * @returns {Subject[]}
 */
export function apiGetSubjects() {
  return axiosInstance.get("/subjects/");
}

/**
 * GET /subjects/{id}
 * Returns a single subject by ID.
 *
 * @param {string} id
 * @returns {Subject}
 */
export function apiGetSubject(id) {
  return axiosInstance.get(`/subjects/${id}`);
}

/**
 * DELETE /subjects/{id}
 * Deletes a subject and cascade-deletes all its lectures.
 *
 * @param {string} id
 * @returns {Subject | null}
 */
export function apiDeleteSubject(id) {
  return axiosInstance.delete(`/subjects/${id}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// LECTURES  (all require Authorization: Bearer <token>)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /lectures/
 * Creates a lecture under a subject.
 *
 * @param {{ title: string, description?: string, subject_id: string }} body
 * @returns {Lecture}
 */
export function apiCreateLecture({ title, description = "", subject_id }) {
  return axiosInstance.post("/lectures/", { title, description, subject_id });
}

/**
 * GET /lectures/subject/{subjectId}
 * Returns all lectures belonging to a subject.
 *
 * @param {string} subjectId
 * @returns {Lecture[]}
 */
export function apiGetLecturesBySubject(subjectId) {
  return axiosInstance.get(`/lectures/subject/${subjectId}`);
}

/**
 * GET /lectures/{id}
 * Returns a single lecture.
 *
 * @param {string} id
 * @returns {Lecture}
 */
export function apiGetLecture(id) {
  return axiosInstance.get(`/lectures/${id}`);
}

/**
 * GET /lectures/{id}/status
 * Polling endpoint — check ingestion processing status.
 *
 * @param {string} id
 * @returns {{ lecture_id: string, status: "processing" | "completed" | "failed" }}
 */
export function apiGetLectureStatus(id) {
  return axiosInstance.get(`/lectures/${id}/status`);
}

/**
 * DELETE /lectures/{id}
 * Deletes a lecture and all its associated data.
 *
 * @param {string} id
 * @returns {Lecture | null}
 */
export function apiDeleteLecture(id) {
  return axiosInstance.delete(`/lectures/${id}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE INGESTION  (all require Authorization: Bearer <token>)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /knowledge/upload_text/{lectureId}
 * Uploads raw text content for ingestion.
 *
 * @param {string} lectureId
 * @param {string} text
 * @returns {{ message: string, ... }}
 */
export function apiUploadText(lectureId, text) {
  return axiosInstance.post(`/knowledge/upload_text/${lectureId}`, { text });
}

/**
 * POST /knowledge/upload_pdf/{lectureId}
 * Uploads a PDF file for ingestion (multipart/form-data).
 *
 * @param {string} lectureId
 * @param {File} file
 * @param {(pct: number) => void} [onProgress]
 * @returns {{ message: string, ... }}
 */
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

/**
 * POST /knowledge/upload_video/{lectureId}
 * Processes a YouTube / video URL for ingestion.
 *
 * @param {string} lectureId
 * @param {{ url: string, extract_frames?: boolean }} body
 * @returns {{ message: string, warning?: string, ... }}
 */
export function apiUploadVideo(lectureId, { url, extract_frames = false }) {
  return axiosInstance.post(`/knowledge/upload_video/${lectureId}`, {
    url,
    extract_frames,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// AI INFERENCE  (all require Authorization: Bearer <token>)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /ai/chat
 * Chat with the AI tutor in the context of a specific lecture.
 *
 * @param {{
 *   message:    string,
 *   lecture_id: string,
 *   history:    { role: "user" | "assistant", content: string }[]
 * }} body
 * @returns {{ response: string, ... }}
 */
export function apiChat({ message, lecture_id, history = [] }) {
  return axiosInstance.post("/ai/chat", { message, lecture_id, history });
}

/**
 * POST /ai/explain
 * Get a detailed explanation of a specific concept within a lecture.
 *
 * @param {{ concept: string, lecture_id: string }} body
 * @returns {{ explanation: string, ... }}
 */
export function apiExplain({ concept, lecture_id }) {
  return axiosInstance.post("/ai/explain", { concept, lecture_id });
}

/**
 * GET /ai/summary/{lectureId}
 * Retrieve the structured Knowledge Card summary for a lecture.
 *
 * @param {string} lectureId
 * @returns {{ summary: string, ... }}
 */
export function apiGetSummary(lectureId) {
  return axiosInstance.get(`/ai/summary/${lectureId}`);
}

/**
 * POST /ai/quiz/{lectureId}
 * Generate a 5-question multiple-choice quiz from lecture content.
 *
 * @param {string} lectureId
 * @returns {{ questions: QuizQuestion[], ... }}
 */
export function apiGenerateQuiz(lectureId) {
  return axiosInstance.post(`/ai/quiz/${lectureId}`);
}
