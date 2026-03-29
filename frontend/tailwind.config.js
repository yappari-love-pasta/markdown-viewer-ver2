import daisyui from 'daisyui'

/**
 * 和色 (Japanese traditional colors) パレット
 *
 * primary   渋紙 (shibugami)  #946243  渋み茶
 * secondary 藤   (fuji)       #8e6db4  藤紫
 * accent    青竹 (aotake)     #00896c  青竹緑
 * info      浅葱 (asagi)      #00a3af  明るい青緑
 * success   若草 (wakakusa)   #7ba23f  若草色
 * warning   山吹 (yamabuki)   #f0a500  黄金
 * error     紅   (kurenai)    #c9171e  深紅
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        // ライトテーマ: 和色ベース / 背景は淡い青みグレー
        light: {
          "color-scheme": "light",
          // --- 和色 プライマリ ---
          "primary":           "oklch(50% 0.09 52)",    // 渋紙 #946243
          "primary-content":   "oklch(98% 0.005 52)",   // 白に近い文字
          "secondary":         "oklch(52% 0.12 305)",   // 藤
          "secondary-content": "oklch(98% 0.005 305)",
          "accent":            "oklch(52% 0.11 172)",   // 青竹
          "accent-content":    "oklch(98% 0.005 172)",
          "neutral":           "oklch(38% 0.03 228)",
          "neutral-content":   "oklch(95% 0.01 228)",
          // --- ベース (淡い青みグレー) ---
          "base-100":          "oklch(96% 0.008 228)",  // メイン背景
          "base-200":          "oklch(90% 0.014 228)",  // サイドバー背景
          "base-300":          "oklch(82% 0.020 228)",  // ボーダー/区切り線
          "base-content":      "oklch(20% 0.020 228)",  // テキスト
          // --- セマンティック (和色) ---
          "info":              "oklch(58% 0.10 200)",   // 浅葱
          "info-content":      "oklch(98% 0.005 200)",
          "success":           "oklch(56% 0.12 140)",   // 若草
          "success-content":   "oklch(98% 0.005 140)",
          "warning":           "oklch(70% 0.16 78)",    // 山吹
          "warning-content":   "oklch(18% 0.04 78)",
          "error":             "oklch(50% 0.18 22)",    // 紅
          "error-content":     "oklch(98% 0.005 22)",
          "--rounded-box":     "0.5rem",
          "--rounded-btn":     "0.375rem",
          "--border-btn":      "1px",
        },
      },
      {
        // ダークテーマ: 和色ベース / 背景は深い藍系スレート
        dark: {
          "color-scheme": "dark",
          // --- 和色 プライマリ ---
          "primary":           "oklch(56% 0.09 52)",    // 渋紙 (やや明るく)
          "primary-content":   "oklch(98% 0.005 52)",
          "secondary":         "oklch(58% 0.12 305)",   // 藤
          "secondary-content": "oklch(98% 0.005 305)",
          "accent":            "oklch(58% 0.11 172)",   // 青竹
          "accent-content":    "oklch(98% 0.005 172)",
          "neutral":           "oklch(32% 0.03 228)",
          "neutral-content":   "oklch(85% 0.02 228)",
          // --- ベース (深い藍系スレート) ---
          "base-100":          "oklch(19% 0.026 228)",  // メイン背景
          "base-200":          "oklch(14% 0.026 228)",  // サイドバー背景
          "base-300":          "oklch(28% 0.032 228)",  // ボーダー/区切り線
          "base-content":      "oklch(88% 0.014 228)",  // テキスト
          // --- セマンティック (和色) ---
          "info":              "oklch(62% 0.10 200)",   // 浅葱
          "info-content":      "oklch(98% 0.005 200)",
          "success":           "oklch(62% 0.12 140)",   // 若草
          "success-content":   "oklch(98% 0.005 140)",
          "warning":           "oklch(72% 0.16 78)",    // 山吹
          "warning-content":   "oklch(18% 0.04 78)",
          "error":             "oklch(56% 0.18 22)",    // 紅
          "error-content":     "oklch(98% 0.005 22)",
          "--rounded-box":     "0.5rem",
          "--rounded-btn":     "0.375rem",
          "--border-btn":      "1px",
        },
      },
    ],
    defaultTheme: 'dark',
  },
}
