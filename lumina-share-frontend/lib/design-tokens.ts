// Design tokens based on seed: ad538e8b9ad8130caa08322db10a43b49bb648b7d8d86c0e0734f548be5e2422
// Generated from: LuminaShare + sepolia + 202412

export const designTokens = {
  colors: {
    primary: {
      DEFAULT: "#6366F1", // Indigo 500
      50: "#EEF2FF",
      100: "#E0E7FF",
      500: "#6366F1",
      600: "#4F46E5",
      700: "#4338CA",
    },
    secondary: {
      DEFAULT: "#8B5CF6", // Purple 500
      500: "#8B5CF6",
    },
    background: {
      light: "#FFFFFF",
      dark: "#0F172A", // Slate 900
    },
    text: {
      light: "#1E293B", // Slate 800
      dark: "#F1F5F9", // Slate 100
    },
    accent: {
      success: "#10B981", // Green 500
      warning: "#F59E0B", // Amber 500
      error: "#EF4444", // Red 500
    },
  },
  typography: {
    fontFamily: {
      sans: ["Inter", "sans-serif"],
      mono: ["JetBrains Mono", "monospace"],
    },
    fontSize: {
      "4xl": "2.25rem", // 36px
      "5xl": "3rem", // 48px
      "2xl": "1.5rem", // 24px
      "3xl": "1.875rem", // 30px
      base: "1rem", // 16px
      sm: "0.875rem", // 14px
    },
    lineHeight: {
      normal: "1.5",
      relaxed: "1.75",
    },
  },
  spacing: {
    compact: {
      xs: "0.5rem", // 8px
      sm: "0.75rem", // 12px
      md: "1rem", // 16px
      lg: "1.5rem", // 24px
    },
    comfortable: {
      xs: "1rem", // 16px
      sm: "1.5rem", // 24px
      md: "2rem", // 32px
      lg: "3rem", // 48px
    },
  },
  borderRadius: {
    lg: "0.5rem", // 8px
    full: "9999px",
  },
  shadows: {
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  transitions: {
    default: "all 0.3s ease-in-out",
  },
  breakpoints: {
    mobile: "640px",
    tablet: "1024px",
    desktop: "1024px",
  },
} as const;

export type DesignTokens = typeof designTokens;

