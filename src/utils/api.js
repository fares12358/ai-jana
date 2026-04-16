/**
 * utils/api.js — Centralised API function library
 * Backend: https://lecture-brain-last-production.up.railway.app
 */

import { axiosInstance } from "./axios";

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export function apiRegister({ email, password }) {
  return axiosInstance.post("/auth/register", { email, password },
    { headers: { "Content-Type": "application/json" } });
}

export function apiLogin({ email, password }) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return axiosInstance.post("/auth/login", form,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
}

export const apiGetMe = () => axiosInstance.get("/auth/me");

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────

export const apiCreateSubject = ({ name, description = "" }) =>
  axiosInstance.post("/subjects/", { name, description });

export const apiGetSubjects = () => axiosInstance.get("/subjects/");
export const apiGetSubject = (id) => axiosInstance.get(`/subjects/${id}`);
export const apiDeleteSubject = (id) => axiosInstance.delete(`/subjects/${id}`);

// ─── LECTURES ─────────────────────────────────────────────────────────────────

export const apiCreateLecture = ({ title, description = "", subject_id }) =>
  axiosInstance.post("/lectures/", { title, description, subject_id });

export const apiGetLecturesBySubject = (subjectId) =>
  axiosInstance.get(`/lectures/subject/${subjectId}`);

export const apiGetLecture = (id) => axiosInstance.get(`/lectures/${id}`);
export const apiGetLectureStatus = (id) => axiosInstance.get(`/lectures/${id}/status`);
export const apiDeleteLecture = (id) => axiosInstance.delete(`/lectures/${id}`);

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

export const apiGetSummary = (lectureId) => axiosInstance.get(`/ai/summary/${lectureId}`);
export const apiGenerateQuiz = (lectureId) => axiosInstance.post(`/ai/quiz/${lectureId}`);

// ─── ADMIN ────────────────────────────────────────────────────────────────────
// All admin routes require Authorization: Bearer <admin_token>

/**
 * GET /admin/analytics
 * Returns array of per-subject analytics objects.
 * @returns {Array<{
 *   subject_id: string,
 *   subject_name: string,
 *   weak_topics: Array<{ topic: string, frequency_score: number }>,
 *   common_questions: string[],
 *   confusing_concepts: string[],
 *   engagement_count: number,
 *   ai_insight: string,
 *   last_analyzed_at: string
 * }>}
 */
export const apiAdminAnalytics = () =>
  axiosInstance.get("/admin/analytics");

/**
 * POST /admin/analytics/generate
 * Manually triggers batch LLM analysis of all unanalyzed chat logs.
 * @returns {{ subjects_processed: number, total_messages_analyzed: number, message: string }}
 */
export const apiAdminAnalyticsGenerate = () =>
  axiosInstance.post("/admin/analytics/generate");

/**
 * GET /admin/analytics/insights
 * Returns platform-wide aggregated AI insights summary.
 * Expected shape (defensive — real shape confirmed from swagger):
 * @returns {{
 *   total_subjects_analyzed: number,
 *   total_messages_analyzed: number,
 *   top_weak_topics: Array<{ topic: string, frequency_score: number, subject_name?: string }>,
 *   overall_insight: string,
 *   platform_health: string,        // e.g. "good" | "needs_attention" | "critical"
 *   last_generated_at: string,
 *   subjects_summary?: Array<any>   // may include per-subject roll-up
 * }}
 */
export const apiAdminAnalyticsInsights = () =>
  axiosInstance.get("/admin/analytics/insights");

/**
 * GET /admin/presentation/{lecture_id}
 * Returns AI-generated presentation slides for a lecture.
 */
export const apiAdminPresentation = (lectureId) =>
  axiosInstance.get(`/admin/presentation/${lectureId}`);

/**
 * POST /admin/upload_pdf — Admin-level PDF upload
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
 * POST /admin/upload_video — Admin-level video URL upload
 */
export const apiAdminUploadVideo = ({ url, extract_frames = false }) =>
  axiosInstance.post("/admin/upload_video", { url, extract_frames });

/**
 * GET /admin/operations
 * Returns array of lecture pipeline statuses.
 * @returns {Array<{
 *   lecture_id: string,
 *   title: string,
 *   status: string,
 *   created_at: string,
 *   job_tracker: {
 *     upload_status: string,
 *     extraction_status: string,
 *     chunking_status: string,
 *     embedding_status: string,
 *     card_generation_status: string,
 *     error_traceback: string | null
 *   }
 * }>}
 */
export const apiAdminOperations = () =>
  axiosInstance.get("/admin/operations");