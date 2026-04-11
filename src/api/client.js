/**
 * src/api/client.js
 *
 * Backward-compatibility re-export layer.
 *
 * All existing imports from "@/api/client" continue to work unchanged.
 * New code should prefer importing directly from "@/utils/api" or "@/utils/axios".
 */

// ── Axios instance + token helper ─────────────────────────────────────────────
export { axiosInstance as http, setAuthToken } from "@/utils/axios";

// ── Auth ──────────────────────────────────────────────────────────────────────
export { apiRegister  as authRegister  } from "@/utils/api";
export { apiLogin     as authLogin     } from "@/utils/api";
export { apiGetMe                      } from "@/utils/api";

// ── Subjects ──────────────────────────────────────────────────────────────────
export { apiCreateSubject as createSubject } from "@/utils/api";
export { apiGetSubjects   as getSubjects   } from "@/utils/api";
export { apiGetSubject    as getSubject    } from "@/utils/api";
export { apiDeleteSubject as deleteSubject } from "@/utils/api";

// ── Lectures ──────────────────────────────────────────────────────────────────
export { apiCreateLecture          as createLecture          } from "@/utils/api";
export { apiGetLecturesBySubject   as getLecturesBySubject   } from "@/utils/api";
export { apiGetLecture             as getLecture             } from "@/utils/api";
export { apiGetLectureStatus       as getLectureStatus       } from "@/utils/api";
export { apiDeleteLecture          as deleteLecture          } from "@/utils/api";

// ── Knowledge ingestion ───────────────────────────────────────────────────────
export { apiUploadText  as uploadText  } from "@/utils/api";
export { apiUploadPdf   as uploadPdf   } from "@/utils/api";
export { apiUploadVideo as uploadVideo } from "@/utils/api";

// ── AI Inference ──────────────────────────────────────────────────────────────
export { apiChat          as chat          } from "@/utils/api";
export { apiExplain       as explain       } from "@/utils/api";
export { apiGetSummary    as getSummary    } from "@/utils/api";
export { apiGenerateQuiz  as generateQuiz  } from "@/utils/api";
