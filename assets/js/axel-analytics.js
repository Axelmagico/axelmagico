/* Mago Axel - Medicion de secciones y planes para GA4.
   Sin datos personales, sin almacenamiento persistente, sin alterar la interfaz.
   Requiere gtag.js (G-R3CEQZR7V2) cargado en index.html.
*/
(() => {
  'use strict';
  if (window.__axelAnalyticsInstalled) return;
  window.__axelAnalyticsInstalled = true;

  const SECTIONS = [
    ['inicio', 'Inicio'],
    ['experiencias', 'Experiencias'],
    ['planes', 'Planes'],
    ['galeria', 'Fotos'],
    ['videos', 'Videos'],
    ['asistente', 'Axel IA'],
    ['contacto', 'Contacto']
  ];
  const PLAN_NAMES = [
    ['combo_total', 'Combo Diversion Total', /combo\s+diversi[oó]n\s+total/i],
    ['full_fest_acomp', 'Full Fest + Acompanamiento', /full\s*fest\s*\+\s*acompa[nñ]amiento/i],
    ['full_fest', 'Show Full Fest', /(?:show\s+)?full\s*fest/i],
    ['express', 'Show Express', /(?:show\s+)?express/i],
    ['escolar', 'Show en escuela', /(?:show\s+(?:para\s+cumple\s+)?en\s+escuela|cumple\s+en\s+escuela)/i]
  ];
  const MAX_BATCH_SECONDS = 15;
  const POLL_MS = 1000;
  const state = new Map(SECTIONS.map(([id]) => [id, 0]));
  let lastTick = performance.now();
  let active = null;
  let currentSeconds = 0;

  // Atribucion no invasiva: fuentes conocidas por etiquetas UTM, referencia o indicios de Meta.
  // El navegador utilizado NO equivale a la fuente de la visita.
  const origin = detectOrigin();

  function detectBrowser() {
    const ua = navigator.userAgent || '';
    if (/Instagram/i.test(ua)) return 'Instagram integrado';
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook integrado';
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/OPR\/|Opera/i.test(ua)) return 'Opera';
    if (/SamsungBrowser\//i.test(ua)) return 'Samsung Internet';
    if (/Firefox\/|FxiOS\//i.test(ua)) return 'Firefox';
    if (/CriOS\/|Chrome\//i.test(ua)) return 'Chrome';
    if (/Safari\//i.test(ua)) return 'Safari';
    return 'Otro o no identificado';
  }

  function detectOrigin() {
    const params = new URLSearchParams(window.location.search);
    const utmSource = (params.get('utm_source') || '').trim().toLowerCase();
    const utmMedium = (params.get('utm_medium') || '').trim().toLowerCase();
    const sourceCode = (params.get('site_source_name') || params.get('utm_source_platform') || '').trim().toLowerCase();
    const paid = /^(paid|paid_social|social_paid|cpc|ppc|cp[mm]|display|paidsocial)$/.test(utmMedium) || /\bpaid\b/.test(utmMedium);
    const isMeta = /^(meta|meta-ads|facebook|fb|instagram|ig|messenger|msg|threads|th|an|audience_network)$/.test(utmSource);
    const metaCodes = {fb:'Facebook',facebook:'Facebook',ig:'Instagram',instagram:'Instagram',msg:'Messenger',messenger:'Messenger',an:'Audience Network',audience_network:'Audience Network',th:'Threads',threads:'Threads'};
    const platform = metaCodes[sourceCode] || metaCodes[utmSource] || 'Meta sin plataforma identificada';
    let host = '';
    try { host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, ''); } catch (_) {}
    const refGoogle = /(^|\.)google\.[a-z.]+$/.test(host);
    const searchEngines = [
      [/^(www\.)?bing\.com$/, 'Bing'], [/^(www\.)?duckduckgo\.com$/, 'DuckDuckGo'],
      [/^(search\.)?yahoo\.[a-z.]+$/, 'Yahoo'], [/(^|\.)ecosia\.org$/, 'Ecosia'],
      [/(^|\.)yandex\.[a-z.]+$/, 'Yandex'], [/(^|\.)search\.brave\.com$/, 'Brave Search']
    ];
    const socialHosts = [
      [/(^|\.)(facebook\.com|fb\.com|l\.facebook\.com|lm\.facebook\.com|m\.facebook\.com)$/, 'Facebook'],
      [/(^|\.)instagram\.com$/, 'Instagram'], [/(^|\.)tiktok\.com$/, 'TikTok'],
      [/(^|\.)youtube\.com$/, 'YouTube'], [/(^|\.)wa\.me$|(^|\.)whatsapp\.com$/, 'WhatsApp'],
      [/(^|\.)threads\.net$|(^|\.)threads\.com$/, 'Threads']
    ];
    let channel = 'Directo / origen desconocido';
    let network = 'Sin identificar';
    let certainty = 'sin referencia';
    if (isMeta && paid) {
      network = platform; channel = 'Meta Ads'; certainty = platform.startsWith('Meta sin') ? 'Meta pagado sin plataforma' : 'UTM pagado';
    } else if (isMeta) {
      network = platform; channel = 'Meta etiquetado (pago sin confirmar)'; certainty = 'UTM sin medio pagado';
    } else if (utmSource && paid) {
      network = utmSource === 'google' ? 'Google' : utmSource === 'bing' ? 'Bing' : 'Otra plataforma';
      channel = 'Publicidad de otra plataforma'; certainty = 'UTM pagado';
    } else if (utmSource) {
      network = /^(google|bing|yahoo|duckduckgo)$/.test(utmSource) ? 'Buscador' : 'Otra fuente etiquetada';
      channel = 'Campaña etiquetada'; certainty = 'UTM';
    } else if (params.has('gclid') || params.has('gbraid') || params.has('wbraid')) {
      channel = 'Google Ads'; network = 'Google'; certainty = 'identificador de anuncio';
    } else if (params.has('fbclid')) {
      // fbclid aparece también en publicaciones orgánicas: NO lo tratamos como prueba de pago.
      channel = 'Meta (pago no confirmado)'; network = 'Facebook / Instagram no distinguible'; certainty = 'fbclid';
    } else if (refGoogle) {
      channel = 'Buscador'; network = 'Google'; certainty = 'referencia';
    } else {
      const engine = searchEngines.find(([re]) => re.test(host));
      const social = socialHosts.find(([re]) => re.test(host));
      if (engine) { channel = 'Buscador'; network = engine[1]; certainty = 'referencia'; }
      else if (social) { channel = 'Red social (pago no confirmado)'; network = social[1]; certainty = 'referencia'; }
      else if (host && host !== window.location.hostname) {
        channel = 'Otro sitio referido'; network = 'Otro sitio'; certainty = 'referencia';
      }
    }
    return {
      traffic_channel: channel,
      traffic_platform: network,
      attribution_evidence: certainty,
      browser_family: detectBrowser()
    };
  }

  function send(event, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', event, { ...origin, ...params });
  }

  function getDominantSection() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (!viewportHeight) return null;
    let winner = null;
    let visibleMax = 0;
    // Cuenta solo pixeles verticales visibles. Funciona con secciones mas altas que la pantalla.
    for (const [id] of SECTIONS) {
      const node = document.getElementById(id);
      if (!node) continue;
      const box = node.getBoundingClientRect();
      const visible = Math.max(0, Math.min(viewportHeight, box.bottom) - Math.max(0, box.top));
      if (visible > visibleMax) { visibleMax = visible; winner = id; }
    }
    // Evita atribuir tiempo a una seccion solo por una franja pequena.
    return visibleMax >= Math.min(120, viewportHeight * 0.22) ? winner : null;
  }

  function flush(id) {
    if (!id) return;
    const seconds = state.get(id) || 0;
    if (seconds < 1) return;
    state.set(id, 0);
    const label = SECTIONS.find(x => x[0] === id)?.[1] || id;
    send('axel_section_time', {
      section_id: id,
      section_name: label,
      section_seconds: seconds
    });
  }

  function tick() {
    const now = performance.now();
    // Limita el intervalo para que una pestaña suspendida no incremente el tiempo ficticiamente.
    const elapsed = Math.min(Math.max((now - lastTick) / 1000, 0), 1.5);
    lastTick = now;
    const watching = document.visibilityState === 'visible' && document.hasFocus();
    const next = watching ? getDominantSection() : null;
    if (next !== active) {
      flush(active);
      active = next;
      currentSeconds = 0;
    }
    if (!active) return;
    currentSeconds += elapsed;
    if (currentSeconds >= 1) {
      const whole = Math.floor(currentSeconds);
      state.set(active, (state.get(active) || 0) + whole);
      currentSeconds -= whole;
      if ((state.get(active) || 0) >= MAX_BATCH_SECONDS) flush(active);
    }
  }

  function normalizePlan(str) {
    const s = String(str || '').trim();
    return PLAN_NAMES.find(x => x[2].test(s)) || null;
  }

  function planClick(event) {
    if (!(event.target instanceof Element)) return;
    const clicked = event.target.closest('a[data-interest], .axel-plan-choice');
    if (!clicked) return;
    const isCard = clicked.matches('a[data-interest]');
    const name = isCard ? clicked.getAttribute('data-interest') :
      (clicked.querySelector('strong')?.textContent || clicked.getAttribute('aria-label') || clicked.textContent);
    const plan = normalizePlan(name);
    if (!plan) return;
    send('axel_plan_click', {
      plan_id: plan[0],
      plan_name: plan[1],
      plan_location: isCard ? 'tarjetas_web' : 'axel_ia'
    });
  }

  function mediaClick(event) {
    if (!(event.target instanceof Element)) return;
    const photo = event.target.closest('.axel-photo-card');
    if (photo) {
      const cards = [...photo.parentElement.querySelectorAll('.axel-photo-card')];
      send('axel_photo_open', { photo_position: cards.indexOf(photo) + 1 });
      return;
    }
    const video = event.target.closest('.axel-v9-preview-trigger');
    if (video) {
      const card = video.closest('.axel-v9-video-card');
      const position = card && card.parentElement
        ? [...card.parentElement.querySelectorAll('.axel-v9-video-card')].indexOf(card) + 1 : 0;
      send('axel_video_open', { video_position: position });
    }
  }

  document.addEventListener('click', planClick, { capture: true, passive: true });
  document.addEventListener('click', mediaClick, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    tick();
    if (document.hidden) { flush(active); active = null; currentSeconds = 0; }
  });
  window.addEventListener('pagehide', () => { tick(); flush(active); }, { capture: true });
  window.addEventListener('focus', () => { lastTick = performance.now(); });
  window.addEventListener('blur', () => { tick(); flush(active); active = null; currentSeconds = 0; });

  // Inicio al cargar el DOM; los botones generados dinamicamente se capturan por delegacion.
  send('axel_traffic_source', origin);
  const timer = window.setInterval(tick, POLL_MS);
  tick();
})();
