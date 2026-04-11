"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiCreateLecture,
  apiDeleteLecture,
  apiGetLecturesBySubject,
  apiGetLectureStatus,
} from "@/utils/api";

/**
 * useLectures
 *
 * Manages lectures for a single subject.
 * Uses the real backend via utils/api.js.
 * Automatically polls GET /lectures/{id}/status every 3 s for any lecture
 * whose status is "processing", and stops when it becomes "completed" or "failed".
 *
 * @param {string | null} subjectId
 *
 * Returns:
 *   lectures       – Lecture[]  (each has a `status` field)
 *   loading        – boolean
 *   error          – string | null
 *   addLecture()   – POST /lectures/ with optimistic UI + auto-polling
 *   removeLecture()– DELETE /lectures/{id}
 *   refresh()      – re-fetch from server
 */
export function useLectures(subjectId) {
  const [lectures, setLectures] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // Track active polling intervals: { [lectureId]: intervalId }
  const pollRefs = useRef({});

  // ── Patch a single lecture in state ───────────────────────────────────────
  const patchLecture = useCallback((id, patch) => {
    setLectures((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  // ── Start polling status for one lecture ──────────────────────────────────
  const startPolling = useCallback((id) => {
    if (pollRefs.current[id]) return; // already polling

    const intervalId = setInterval(async () => {
      try {
        const res    = await apiGetLectureStatus(id); // GET /lectures/{id}/status
        const status = res.status;
        patchLecture(id, { status });

        if (status === "completed" || status === "failed") {
          clearInterval(pollRefs.current[id]);
          delete pollRefs.current[id];
        }
      } catch {
        // Network hiccup — keep polling; backend may recover
      }
    }, 3_000);

    pollRefs.current[id] = intervalId;
  }, [patchLecture]);

  // Clear all intervals on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(pollRefs.current).forEach(clearInterval);
      pollRefs.current = {};
    };
  }, []);

  // ── Fetch lectures for the current subject ─────────────────────────────────
  const refresh = useCallback(async () => {
    if (!subjectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetLecturesBySubject(subjectId); // GET /lectures/subject/{id}
      const list = Array.isArray(data) ? data : [];
      setLectures(list);

      // Resume polling for any lectures still in "processing" state
      list.forEach((l) => {
        if (l.status === "processing") startPolling(l.id);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [subjectId, startPolling]);

  // Fetch whenever subjectId changes
  useEffect(() => { refresh(); }, [refresh]);

  // ── Create lecture with optimistic UI ─────────────────────────────────────
  const addLecture = useCallback(async ({ title, description = "" }) => {
    if (!subjectId) throw new Error("No subject selected");

    const tempId = `temp-${Date.now()}`;
    const temp   = {
      id:         tempId,
      title,
      description,
      subject_id: subjectId,
      status:     "processing",
      _pending:   true,
    };

    // Optimistically add to list
    setLectures((prev) => [...prev, temp]);

    try {
      const created = await apiCreateLecture({ title, description, subject_id: subjectId });

      // Replace temp entry with real server response
      setLectures((prev) =>
        prev.map((l) =>
          l.id === tempId
            ? { ...created, status: created.status ?? "processing" }
            : l
        )
      );

      // Start polling if the lecture is still being processed
      if ((created.status ?? "processing") === "processing") {
        startPolling(created.id);
      }

      return created;
    } catch (err) {
      // Roll back optimistic entry
      setLectures((prev) => prev.filter((l) => l.id !== tempId));
      throw err;
    }
  }, [subjectId, startPolling]);

  // ── Delete lecture ─────────────────────────────────────────────────────────
  const removeLecture = useCallback(async (id) => {
    // Stop polling if active
    if (pollRefs.current[id]) {
      clearInterval(pollRefs.current[id]);
      delete pollRefs.current[id];
    }

    // Optimistically remove
    setLectures((prev) => prev.filter((l) => l.id !== id));

    try {
      await apiDeleteLecture(id);                   // DELETE /lectures/{id}
    } catch (err) {
      // Restore from server on failure
      await refresh();
      throw err;
    }
  }, [refresh]);

  return { lectures, loading, error, addLecture, removeLecture, refresh };
}
