/* Cabeça de águia dourada, de perfil, com expressão brava (SVG original) */
(function () {
  'use strict';
  function eagleHeadSVG() {
    const id = 'eh' + Math.random().toString(36).slice(2, 7);
    const head = 'M40,400 C55,330 80,262 128,212 C164,175 214,150 268,140 C292,136 310,138 322,146 L330,160 C320,172 312,184 306,196 C298,210 290,220 280,228 C266,262 262,300 270,340 C276,370 290,388 302,400 Z';
    // Fileiras de penas (recortadas no formato da cabeça)
    const rows = [];
    for (let r = 0; r < 17; r++) {
      const y = 128 + r * 17;
      const off = (r % 2) * 11;
      for (let x = 30 + off; x < 340; x += 22) {
        const w = 18 + (r > 8 ? 4 : 0);
        rows.push(`M${x},${y} q${w / 2},${9 + r * 0.25} ${w},0`);
      }
    }
    // Penas longas da nuca, soltas no vento
    const nape = [
      'M70,330 C40,310 22,290 10,262 C34,280 56,292 78,300',
      'M84,282 C56,262 40,240 30,214 C52,234 72,246 94,254',
      'M104,240 C80,220 68,198 62,174 C80,194 98,206 118,214',
      'M128,204 C110,186 102,166 100,146 C114,164 128,176 144,184',
    ];
    return `
<svg class="eagle-head" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Águia dourada">
  <defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff2c0"/><stop offset=".28" stop-color="#f0d27a"/>
      <stop offset=".6" stop-color="#c99a2e"/><stop offset="1" stop-color="#6b4f12"/>
    </linearGradient>
    <radialGradient id="${id}hl" cx=".62" cy=".28" r=".45">
      <stop offset="0" stop-color="#fff6d6" stop-opacity=".75"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}bk" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#e2b84a"/><stop offset="1" stop-color="#5c430c"/>
    </linearGradient>
    <radialGradient id="${id}iris" cx=".4" cy=".4" r=".6">
      <stop offset="0" stop-color="#ffe27a"/><stop offset=".6" stop-color="#f0a21a"/><stop offset="1" stop-color="#8a4b06"/>
    </radialGradient>
    <clipPath id="${id}clip"><path d="${head}"/></clipPath>
    <filter id="${id}glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>

  <g class="eh-nape" fill="none" stroke="url(#${id}g)" stroke-width="5" stroke-linecap="round" opacity=".55">${nape.map((d) => `<path d="${d}"/>`).join('')}</g>

  <g class="eh-head" style="transform-box:view-box;transform-origin:200px 300px">
    <path d="${head}" fill="url(#${id}g)" stroke="#5c430c" stroke-width="2"/>
    <g clip-path="url(#${id}clip)">
      <path d="${rows.join(' ')}" fill="none" stroke="#7a5a14" stroke-width="1.6" opacity=".55"/>
      <path d="${rows.join(' ')}" fill="none" stroke="#fff3c4" stroke-width=".8" opacity=".25" transform="translate(0,-2)"/>
      <rect x="0" y="0" width="400" height="400" fill="url(#${id}hl)"/>
      <!-- sombra sob o olho e na bochecha -->
      <path d="M244,190 C264,198 288,200 304,196 C296,212 284,222 270,226 C254,220 244,206 244,190 Z" fill="#3b2a06" opacity=".3"/>
    </g>

    <!-- cera (base do bico) -->
    <path d="M316,144 C322,152 323,172 317,190 C310,188 305,182 305,176 C307,162 311,152 316,144 Z" fill="#f6d365" stroke="#6b4f12" stroke-width="1.4"/>
    <ellipse cx="316" cy="162" rx="2.6" ry="4.6" fill="#3b2a06" transform="rotate(-20 316 162)"/>

    <!-- bico entreaberto -->
    <path d="M302,190 C316,196 340,200 362,206 L357,213 C338,207 318,203 304,201 Z" fill="#1a1002"/>
    <path class="eh-jaw" style="transform-box:view-box;transform-origin:304px 200px" d="M304,200 C318,203 338,207 354,213 C346,218 332,220 318,217 C308,214 303,208 304,200 Z" fill="url(#${id}bk)" stroke="#4a3608" stroke-width="1.5"/>
    <path d="M316,145 C340,141 362,151 375,171 C384,186 386,205 379,222 C377,213 371,207 362,206 C352,200 338,196 322,196 C312,196 306,194 302,190 C306,174 310,158 316,145 Z" fill="url(#${id}bk)" stroke="#4a3608" stroke-width="1.8"/>
    <path d="M326,150 C348,152 366,166 376,188" fill="none" stroke="#fff6d6" stroke-width="2.2" opacity=".7" stroke-linecap="round"/>
    <path d="M379,222 C382,215 383,208 382,201" fill="none" stroke="#2a1d03" stroke-width="2" opacity=".6"/>

    <!-- olho -->
    <g class="eh-eye">
      <circle cx="282" cy="178" r="12.5" fill="#1a1002"/>
      <circle cx="282" cy="178" r="10.5" fill="url(#${id}iris)"/>
      <circle class="eh-pupil" cx="284" cy="179" r="5" fill="#0b0700"/>
      <circle cx="279" cy="175" r="2" fill="#fff8e0"/>
      <path class="eh-lid" d="M262,158 L306,158 L306,172 C296,170 284,170 266,174 Z" fill="url(#${id}g)" style="transform-box:view-box;transform-origin:284px 160px;transform:scaleY(0)"/>
    </g>
    <!-- sobrancelha pesada descendo em direção ao bico (raiva) -->
    <path d="M226,162 C254,144 296,140 331,149 L331,159 C319,166 309,173 300,176 C284,170 262,166 244,168 C236,167 230,165 226,162 Z" fill="url(#${id}g)" stroke="#4a3608" stroke-width="1.6"/>
    <path d="M236,158 C262,148 298,145 326,152" fill="none" stroke="#fff3c4" stroke-width="1.5" opacity=".65"/>
    <path d="M250,168 C268,166 288,170 301,177 C312,171 322,164 331,159" fill="none" stroke="#1f1502" stroke-width="3" opacity=".75" stroke-linecap="round"/>
  </g>
</svg>`;
  }
  window.eagleHeadSVG = eagleHeadSVG;
})();
