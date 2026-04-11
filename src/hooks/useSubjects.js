"use client";
import { useCallback, useEffect, useState } from "react";
import {
  apiCreateSubject,
  apiGetSubjects,
  apiDeleteSubject,
} from "@/utils/api";

/**
 * useSubjects
 *
 * Manages the authenticated user's subject list.
 * Uses the real backend via utils/api.js.
 *
 * Returns:
 *   subjects          – Subject[]
 *   loading           – boolean
 *   error             – string | null
 *   addSubject()      – POST /subjects/  with optimistic UI
 *   removeSubject()   – DELETE /subjects/{id} with optimistic UI
 *   refresh()         – re-fetch from server
 */
export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // ── Fetch all subjects ─────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetSubjects();           // GET /subjects/
      setSubjects(
        (Array.isArray(data) ? data : []).map((s) => ({
          ...s,
          // Normalise lecture count field name (backend may vary)
          lecturesCount: s.lecturesCount ?? s.lectures_count ?? s.lecture_count ?? 0,
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => { refresh(); }, [refresh]);

  // ── Create subject with optimistic UI ─────────────────────────────────────
  const addSubject = useCallback(async ({ name, description = "" }) => {
    const tempId = `temp-${Date.now()}`;
    const temp   = { id: tempId, name, description, lecturesCount: 0, _pending: true };

    // Optimistically add to list
    setSubjects((prev) => [...prev, temp]);

    try {
      const created = await apiCreateSubject({ name, description }); // POST /subjects/
      // Replace temp entry with real server response
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === tempId
            ? {
                ...created,
                lecturesCount:
                  created.lecturesCount ?? created.lectures_count ?? created.lecture_count ?? 0,
              }
            : s
        )
      );
      return created;
    } catch (err) {
      // Roll back optimistic entry on failure
      setSubjects((prev) => prev.filter((s) => s.id !== tempId));
      throw err;
    }
  }, []);

  // ── Delete subject with optimistic UI ─────────────────────────────────────
  const removeSubject = useCallback(async (id) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    try {
      await apiDeleteSubject(id);                   // DELETE /subjects/{id}
    } catch (err) {
      // Restore list from server on failure
      await refresh();
      throw err;
    }
  }, [refresh]);

  return { subjects, loading, error, addSubject, removeSubject, refresh };
}
