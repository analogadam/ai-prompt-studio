import { loadFont } from "@remotion/google-fonts/Inter";

// latin-ext, Turkce karakterler (g-breve, dotless i, s-cedilla) icin gerekli.
const { fontFamily } = loadFont("normal", { subsets: ["latin", "latin-ext"] });

export const theme = {
  fontFamily,
  /** Arka plan katmaninin en dip rengi. */
  background: "#04060E",
  text: "#F8FAFC",
  muted: "#94A3B8",
  accent: "#38BDF8",
  accentAlt: "#A78BFA",
  accentSoft: "rgba(56, 189, 248, 0.16)",
  /** Cam efektli kart yuzeyi. */
  surface: "rgba(148, 163, 184, 0.07)",
  surfaceBorder: "rgba(148, 163, 184, 0.18)",
} as const;

/** Arka plandaki isik lekelerinin renkleri. */
export const auroraColors = ["#1D4ED8", "#0E7490", "#7C3AED", "#0EA5E9"] as const;
