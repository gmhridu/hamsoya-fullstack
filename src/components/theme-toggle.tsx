"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Prevent hydration shift
  if (!mounted) {
    return (
      <div className="h-9 w-[88px] rounded-full border bg-muted/50" />
    );
  }

  // If system → resolve to light/dark
  const activeTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div className="relative flex h-9 w-[88px] rounded-full border bg-muted/50">
      {/* Active pill */}
      <motion.div
        className="
          absolute inset-y-1 left-1
          w-[40px]
          rounded-full
          bg-background
          shadow-sm
        "
        animate={{ x: activeTheme === "dark" ? 40 : 0 }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 24,
          mass: 0.6,
        }}
      />

      {/* Light */}
      <button
        onClick={() => setTheme("light")}
        className="relative z-10 flex h-full w-1/2 items-center justify-center cursor-pointer"
        aria-label="Switch to light mode"
      >
        <Sun
          className={`h-4 w-4 transition-colors ${
            activeTheme === "light"
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        />
      </button>

      {/* Dark */}
      <button
        onClick={() => setTheme("dark")}
        className="relative z-10 flex h-full w-1/2 items-center justify-center cursor-pointer"
        aria-label="Switch to dark mode"
      >
        <Moon
          className={`h-4 w-4 transition-colors ${
            activeTheme === "dark"
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        />
      </button>
    </div>
  );
}
