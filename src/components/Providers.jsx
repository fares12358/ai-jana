"use client";
import { AuthProvider, ThemeProvider } from "@/context/AppContext";

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
