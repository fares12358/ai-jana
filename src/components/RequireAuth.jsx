"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AppContext";

/**
 * Wraps a page component and redirects to /login if the user is not authenticated.
 * Shows nothing while auth is being restored from localStorage (ready === false).
 */
export default function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}`);
    }
  }, [ready, user, router]);

  // While restoring session — render nothing to avoid flash of content
  if (!ready) return null;
  // Not logged in — redirect is in flight
  if (!user)  return null;

  return children;
}
