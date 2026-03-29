import type { Theme } from "./types";

export const orangeTheme: Theme = {
  name: "orange",
  shaderVariant: "warm",
  cssVars: {
    "--bg": "#120d08",
    "--bg-elevated": "#1a140f",
    "--bg-muted": "#231b14",
    "--surface": "rgba(255, 248, 238, 0.03)",
    "--text": "#f3e7d8",
    "--text-soft": "rgba(243, 231, 216, 0.72)",
    "--text-muted": "rgba(243, 231, 216, 0.46)",
    "--border": "rgba(243, 231, 216, 0.12)",
    "--accent": "#c37a3a",
    "--accent-soft": "rgba(195, 122, 58, 0.18)",
    "--accent-strong": "#e7a15f",
    "--accent-contrast": "#120d08",
    "--teal": "#a79269",
    "--sage": "#8d9672",
    "--plum": "#9a7059",
    "--page-background":
      "radial-gradient(circle at top left, rgba(195, 122, 58, 0.14), transparent 28%), radial-gradient(circle at top right, rgba(141, 150, 114, 0.12), transparent 24%), linear-gradient(180deg, #171008 0%, var(--bg) 24%, #0d0906 100%)",
    "--shadow": "0 24px 80px rgba(0, 0, 0, 0.26)",
    "--panel-bg": "linear-gradient(180deg, rgba(255, 248, 238, 0.04), rgba(255, 248, 238, 0.02))",
    "--card-bg": "rgba(13, 9, 6, 0.9)",
    "--button-secondary-bg": "rgba(255, 248, 238, 0.02)",
    "--code-bg": "#14100c",
    "--inline-code-bg": "rgba(195, 122, 58, 0.1)",
    "--inline-code-text": "#ebbf8b",
    "--overlay-bg": "rgba(18, 13, 8, 0.88)",
    "--overlay-shadow": "0 18px 42px rgba(0, 0, 0, 0.22)",
    "--avatar-border": "rgba(243, 231, 216, 0.18)",
    "--preview-surface-soft": "rgba(243, 231, 216, 0.04)",
    "--preview-border-soft": "rgba(243, 231, 216, 0.08)",
    "--preview-accent-soft": "rgba(195, 122, 58, 0.22)",
    "--preview-accent-strong": "rgba(195, 122, 58, 0.7)",
    "--preview-type-ink": "rgba(243, 231, 216, 0.82)",
    "--preview-type-accent": "rgba(195, 122, 58, 0.86)",
    "--window-dot-red": "#ff6d61",
    "--window-dot-yellow": "#fdb84f",
    "--window-dot-green": "#2ccf78"
  }
};
