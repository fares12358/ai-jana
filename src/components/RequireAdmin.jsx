"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AppContext";

/**
 * Wraps admin pages — redirects to /login if not authenticated,
 * redirects to /subjects if authenticated but not admin.
 */
export default function RequireAdmin({ children }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (!user.isAdmin) {
      router.replace("/subjects");
    }
  }, [ready, user, router]);

  if (!ready) return null;
  if (!user || !user.isAdmin) return null;

  return children;
}
