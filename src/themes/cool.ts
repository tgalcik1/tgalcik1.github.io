import type { Theme } from "./types";

export const coolTheme: Theme = {
  name: "cool",
  shaderVariant: "plum",
  cssVars: {
    "--bg": "#0b0d14",
    "--bg-elevated": "#121724",
    "--bg-muted": "#1b2233",
    "--surface": "rgba(236, 240, 255, 0.03)",
    "--text": "#e8eefb",
    "--text-soft": "rgba(232, 238, 251, 0.74)",
    "--text-muted": "rgba(232, 238, 251, 0.48)",
    "--border": "rgba(196, 210, 244, 0.14)",
    "--accent": "#7ab8df",
    "--accent-soft": "rgba(122, 184, 223, 0.18)",
    "--accent-strong": "#9dd4f1",
    "--accent-contrast": "#081018",
    "--teal": "#7fd4c0",
    "--sage": "#98d789",
    "--plum": "#ae8ef1",
    "--page-background":
      "radial-gradient(circle at top left, rgba(127, 212, 192, 0.14), transparent 28%), radial-gradient(circle at top right, rgba(122, 184, 223, 0.16), transparent 24%), radial-gradient(circle at 50% 100%, rgba(174, 142, 241, 0.12), transparent 30%), linear-gradient(180deg, #0d1120 0%, var(--bg) 24%, #080a10 100%)",
    "--shadow": "0 24px 80px rgba(0, 0, 0, 0.34)",
    "--panel-bg": "linear-gradient(180deg, rgba(232, 238, 251, 0.04), rgba(232, 238, 251, 0.02))",
    "--card-bg": "rgba(9, 12, 19, 0.92)",
    "--button-secondary-bg": "rgba(232, 238, 251, 0.02)",
    "--code-bg": "#0d1320",
    "--inline-code-bg": "rgba(122, 184, 223, 0.12)",
    "--inline-code-text": "#add9ff",
    "--overlay-bg": "rgba(11, 13, 20, 0.78)",
    "--overlay-shadow": "0 18px 42px rgba(0, 0, 0, 0.3)",
    "--avatar-border": "rgba(232, 238, 251, 0.18)",
    "--preview-surface-soft": "rgba(232, 238, 251, 0.04)",
    "--preview-border-soft": "rgba(232, 238, 251, 0.09)",
    "--preview-accent-soft": "rgba(122, 184, 223, 0.18)",
    "--preview-accent-strong": "rgba(174, 142, 241, 0.68)",
    "--preview-type-ink": "rgba(232, 238, 251, 0.82)",
    "--preview-type-accent": "rgba(122, 184, 223, 0.88)",
    "--window-dot-red": "#ff7f8c",
    "--window-dot-yellow": "#7fd4c0",
    "--window-dot-green": "#ae8ef1"
  }
};
