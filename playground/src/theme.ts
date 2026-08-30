import { fk } from 'framekit';

export const colors = {
  ink: fk.color3FromRGB(8, 8, 14),
  inkRaised: fk.color3FromRGB(18, 17, 29),
  inkSoft: fk.color3FromRGB(40, 38, 57),
  paper: fk.color3FromRGB(242, 239, 255),
  paperRaised: fk.color3FromRGB(255, 253, 255),
  paperMuted: fk.color3FromRGB(211, 206, 230),
  text: fk.color3FromRGB(249, 247, 255),
  textMuted: fk.color3FromRGB(166, 160, 191),
  darkText: fk.color3FromRGB(14, 13, 22),
  darkMuted: fk.color3FromRGB(82, 76, 103),
  coral: fk.color3FromRGB(255, 77, 112),
  mint: fk.color3FromRGB(197, 255, 83),
  violet: fk.color3FromRGB(139, 117, 255),
  amber: fk.color3FromRGB(255, 184, 76),
  cyan: fk.color3FromRGB(74, 226, 255),
  lilac: fk.color3FromRGB(197, 188, 255),
} as const;

export const fonts = {
  sans: 'Inter, Avenir Next, ui-sans-serif, system-ui, sans-serif',
  display: 'Arial Black, Inter, Avenir Next, ui-sans-serif, system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;

/** Installs the ambient visual layer shared by the whole motion playground. */
export function installPlaygroundStyles(): void {
  if (document.querySelector('[data-framekit-playground-styles]')) return;
  const style = document.createElement('style');
  style.dataset.framekitPlaygroundStyles = '';
  style.textContent = `
    :root { color-scheme: dark; font-synthesis: none; }
    * { box-sizing: border-box; }
    html, body, #root { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #08080e; }
    body { font-family: ${fonts.sans}; }
    ::selection { color: #08080e; background: #c5ff53; }
    .fk-grid {
      background-image:
        linear-gradient(rgba(197,255,83,.075) 1px, transparent 1px),
        linear-gradient(90deg, rgba(197,255,83,.075) 1px, transparent 1px),
        radial-gradient(circle at 50% 38%, rgba(139,117,255,.28), transparent 48%);
      background-size: 32px 32px, 32px 32px, 100% 100%;
      animation: fk-grid-drift 14s linear infinite;
    }
    .fk-noise::after {
      content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .18;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.25'/%3E%3C/svg%3E");
      mix-blend-mode: soft-light;
    }
    .fk-shimmer {
      color: transparent !important;
      background: linear-gradient(100deg, #f9f7ff 5%, #c5ff53 42%, #4ae2ff 58%, #f9f7ff 95%);
      background-size: 220% 100%; background-clip: text; -webkit-background-clip: text;
      animation: fk-shimmer 6s ease-in-out infinite;
    }
    .fk-float-a { animation: fk-float-a 4.6s ease-in-out infinite; }
    .fk-float-b { animation: fk-float-b 5.8s ease-in-out infinite; }
    .fk-ring { animation: fk-spin 18s linear infinite; }
    .fk-ring-reverse { animation: fk-spin-reverse 12s linear infinite; }
    .fk-breathe { animation: fk-breathe 2.8s ease-in-out infinite; }
    .fk-scan {
      background: linear-gradient(90deg, transparent, rgba(197,255,83,.42), transparent);
      background-size: 35% 100%; background-repeat: no-repeat;
      animation: fk-scan 2.6s ease-in-out infinite;
    }
    .fk-glow { animation: fk-glow 3.4s ease-in-out infinite; }
    .fk-button { cursor: pointer; transition: filter 160ms ease; }
    .fk-button:active { filter: brightness(.86); }
    @keyframes fk-grid-drift { to { background-position: 32px 32px, 32px 32px, 0 0; } }
    @keyframes fk-shimmer { 0%,100% { background-position: 100% 0; } 50% { background-position: 0 0; } }
    @keyframes fk-float-a { 0%,100% { translate: 0 0; } 50% { translate: 0 -12px; } }
    @keyframes fk-float-b { 0%,100% { translate: 0 0; } 50% { translate: 0 15px; } }
    @keyframes fk-spin { to { transform: rotate(360deg); } }
    @keyframes fk-spin-reverse { to { transform: rotate(-360deg); } }
    @keyframes fk-breathe { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
    @keyframes fk-scan { 0% { background-position: -70% 0; } 100% { background-position: 170% 0; } }
    @keyframes fk-glow { 0%,100% { filter: drop-shadow(0 0 8px rgba(139,117,255,.35)); } 50% { filter: drop-shadow(0 0 24px rgba(197,255,83,.72)); } }
    @media (prefers-reduced-motion: reduce) { * { animation-duration: .001ms !important; animation-iteration-count: 1 !important; } }
  `;
  document.head.append(style);
}
