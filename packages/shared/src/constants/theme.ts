// AUTO GENERATED - DO NOT EDIT
export const theme = {
  "color": {
    "primary": "#004FFF",
    "primary-light": "#3D6FFF",
    "primary-dark": "#0040F1",
    "secondary": "#6B7280",
    "background": "#FFFFFF",
    "surface": "#F9FAFB",
    "border": "#E8EEF2",
    "success": "#03C75A",
    "danger": "#EF4444",
    "brand-green": "#00DA7C"
  },
  "layout": {
    "grid": {
      "breakpoint": {
        "mobile": "<768px",
        "tablet": "768px-1023px",
        "desktop": "1024px-1639px",
        "wide": ">=1640px"
      },
      "container": {
        "mobile": "calc(100% - 32px)",
        "tablet": "720px",
        "desktop": "1080px",
        "wide": "1640px"
      },
      "columns": {
        "mobile": "4",
        "tablet": "8",
        "desktop": "12",
        "wide": "12"
      },
      "gutter": {
        "mobile": "16px",
        "tablet": "24px",
        "desktop": "24px",
        "wide": "24px"
      }
    }
  },
  "spacing": {
    "0": "0",
    "2": "2px",
    "4": "4px",
    "8": "8px",
    "12": "12px",
    "16": "16px",
    "20": "20px",
    "24": "24px",
    "30": "30px",
    "32": "32px",
    "40": "40px",
    "48": "48px"
  },
  "font": {
    "family": {
      "sans": "\"Gmarket Sans\", GmarketSans, Inter, Pretendard, system-ui, sans-serif",
      "mono": "JetBrains Mono, Consolas, monospace"
    },
    "size": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "xl": "20px",
      "3xl": "30px"
    },
    "line-height": {
      "xs": "18px",
      "sm": "20px",
      "base": "24px",
      "xl": "28px",
      "3xl": "38px"
    },
    "weight": {
      "regular": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    }
  }
} as const;
export type Theme = typeof theme;
