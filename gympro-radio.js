/* Gym Pro – música: Spotify, música del dispositivo y radio. Cargar después de gympro-fixes.js */
(function () {
  if (typeof document === 'undefined') return;
  const STATIONS = [
    ['🎧 LOS40', 'https://los40.com/'], ['🔥 Kiss FM', 'https://kissfm.es/'], ['🎸 Rock FM', 'https://www.rockfm.fm/'],
    ['🌍 Radio Garden', 'https://radio.garden/'], ['📻 TuneIn', 'https://tunein.com/']
  ];
  const K_RADIO = 'gymPro_radio_url', K_SP = 'gymPro_spotify_url';
  const audio = new Audio(); audio.preload = 'none';
  const toast = m => (window.showToast ? showToast(m) : alert(m));
  const get = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const validUrl = u => /^https?:\/\/\S+$/i.test(u);
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let list = [], idx = 0, shuffle = false, mode = '';

  const fab = document.createElement('button');
  fab.id = 'radio-fab'; fab.innerText = '🎵'; fab.setAttribute('aria-label', 'Música');
  fab.style.cssText = 'position:fixed;right:14px;bottom:84px;width:48px;height:48px;border-radius:50%;border:none;font-size:1.4rem;background:var(--primary);color:#000;z-index:150;box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer';
  document.body.appendChild(fab);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay hidden'; modal.id = 'radio-modal';
  const H = t => `<div style="font-size:.85rem;font-weight:700;color:var(--primary);margin:14px 0 6px">${t}</div>`;
  modal.innerHTML = `<div class="modal-content">
    <div class="card-title"><span>🎵 Música para entrenar</span><span id="radio-close" style="cursor:pointer">✖</span></div>
    ${H('🟢 Spotify')}
    <input type="url" id="sp-url" placeholder="Enlace de tu playlist (opcional)" style="margin-bottom:8px">
    <div style="display:flex;gap:8px">
      <button class="btn btn-success" id="sp-open" style="margin-top:0">Abrir Spotify</button>
      <button class="btn btn-outline" id="sp-embed" style="margin-top:0">▶ Aquí</button>
    </div>
    <div id="sp-fallback" style="font-size:.78rem;margin-top:6px"></div>
    <div id="sp-frame"></div>
    ${H('📁 Música de tu dispositivo')}
    <input type="file" id="dev-files" accept="audio/*" multiple style="display:none">
    <button class="btn btn-outline" id="dev-pick" style="margin-top:0">Elegir canciones del dispositivo</button>
    <div id="dev-now" style="font-size:.8rem;color:var(--text-sec);margin-top:8px"></div>
    <div id="dev-ctrl" style="display:none;gap:6px;margin-top:6px">
      <button class="btn btn-outline btn-sm" id="dev-prev" style="flex:1">⏮</button>
      <button class="btn btn-outline btn-sm" id="dev-play" style="flex:1">⏯</button>
      <button class="btn btn-outline btn-sm" id="dev-next" style="flex:1">⏭</button>
      <button class="btn btn-outline btn-sm" id="dev-shuf" style="flex:1">🔀</button>
    </div>
    ${H('📻 Radio')}
    <div id="radio-list"></div>
    <input type="url" id="radio-url" placeholder="Tu emisora: https://...">
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline" id="radio-open" style="margin-top:0">↗ Abrir</button>
      <button class="btn btn-success" id="radio-play" style="margin-top:0">▶ Reproducir aquí</button>
    </div>
    <button class="btn btn-danger" id="radio-stop" style="display:none">⏹ Parar música</button>
    <p style="font-size:.72rem;color:var(--text-sec);margin-top:10px;line-height:1.4">Spotify se abre en su app (si la tienes) o en el navegador. “▶ Aquí” lo muestra dentro de Gym Pro; para escuchar canciones completas debes tener la sesión de Spotify iniciada en el navegador. La música del dispositivo suena dentro de la app y se controla desde la pantalla de bloqueo. Para la radio, “Reproducir aquí” solo sirve con enlaces directos de audio.</p>
  </div>`;
  document.body.appendChild(modal);
  const $ = id => modal.querySelector('#' + id);

  STATIONS.forEach(([name, url]) => {
    const b = document.createElement('button');
    b.className = 'btn btn-outline'; b.style.cssText = 'margin-top:0;margin-bottom:8px'; b.innerText = name;
    b.onclick = () => window.open(url, '_blank', 'noopener');
    $('radio-list').appendChild(b);
  });

  const close = () => modal.classList.add('hidden');
  fab.onclick = () => { $('radio-url').value = get(K_RADIO); $('sp-url').value = get(K_SP); modal.classList.remove('hidden'); };
  $('radio-close').onclick = close;
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  const sync = () => { fab.innerText = (mode && !audio.paused) ? '⏸' : '🎵'; $('radio-stop').style.display = (mode || $('sp-frame').innerHTML) ? 'flex' : 'none'; };
  const clearFrame = () => { $('sp-frame').innerHTML = ''; };
  function stopAll() {
    audio.pause(); audio.removeAttribute('src'); audio.load(); mode = ''; $('dev-now').innerText = ''; clearFrame(); $('sp-fallback').innerHTML = ''; sync();
  }
  $('radio-stop').onclick = stopAll;
  audio.addEventListener('play', sync); audio.addEventListener('pause', sync);

  /* --- Spotify --- */
  function parseSpotify() {
    const u = $('sp-url').value.trim();
    if (!u) return { uri: 'spotify:', web: 'https://open.spotify.com/' };
    const m = u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/i);
    if (!m) { toast('⚠️ Pega un enlace de Spotify (open.spotify.com/...)'); return null; }
    set(K_SP, u);
    return { uri: `spotify:${m[1].toLowerCase()}:${m[2]}`, web: `https://open.spotify.com/${m[1].toLowerCase()}/${m[2]}`, embed: `https://open.spotify.com/embed/${m[1].toLowerCase()}/${m[2]}` };
  }
  $('sp-open').onclick = () => {
    const s = parseSpotify(); if (!s) return;
    $('sp-fallback').innerHTML = `Si no se abrió la app: <a href="${s.web}" target="_blank" rel="noopener" style="color:var(--primary)">abrir en el navegador</a>`;
    if (mobile) window.location.href = s.uri; else window.open(s.web, '_blank', 'noopener');
  };
  $('sp-embed').onclick = () => {
    const s = parseSpotify(); if (!s) return;
    if (!s.embed) return toast('⚠️ Pega el enlace de una playlist, álbum o canción.');
    audio.pause(); mode = 'spotify';
    $('sp-frame').innerHTML = `<iframe src="${s.embed}" width="100%" height="152" frameborder="0" style="border-radius:12px;margin-top:8px" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    sync();
  };

  /* --- Música del dispositivo --- */
  function media(i) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: list[i].name, artist: 'Gym Pro' });
      navigator.mediaSession.setActionHandler('previoustrack', () => go(-1));
      navigator.mediaSession.setActionHandler('nexttrack', () => go(1));
    } catch (e) {}
  }
  function playIdx(i) {
    if (!list.length) return;
    idx = (i + list.length) % list.length; clearFrame(); mode = 'device';
    audio.src = list[idx].url;
    $('dev-now').innerText = `▶ ${idx + 1}/${list.length} · ${list[idx].name}`;
    audio.play().catch(() => toast('⚠️ Pulsa ⏯ para reproducir.'));
    media(idx); sync();
  }
  const go = d => playIdx(shuffle && list.length > 1 ? Math.floor(Math.random() * list.length) : idx + d);
  $('dev-pick').onclick = () => $('dev-files').click();
  $('dev-files').onchange = e => {
    const files = [...e.target.files].filter(f => f.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(f.name));
    if (!files.length) return toast('⚠️ No se encontraron archivos de audio.');
    list.forEach(t => URL.revokeObjectURL(t.url));
    list = files.map(f => ({ name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f) }));
    $('dev-ctrl').style.display = 'flex'; playIdx(0); toast(`🎶 ${list.length} canciones cargadas`);
    e.target.value = '';
  };
  $('dev-prev').onclick = () => go(-1); $('dev-next').onclick = () => go(1);
  $('dev-play').onclick = () => { if (mode !== 'device') return playIdx(idx); audio.paused ? audio.play() : audio.pause(); };
  $('dev-shuf').onclick = () => { shuffle = !shuffle; $('dev-shuf').style.background = shuffle ? 'var(--primary)' : ''; $('dev-shuf').style.color = shuffle ? '#000' : ''; toast(shuffle ? '🔀 Aleatorio activado' : 'Aleatorio desactivado'); };
  audio.addEventListener('ended', () => { if (mode === 'device') go(1); });

  /* --- Radio por enlace directo --- */
  const current = () => {
    const u = $('radio-url').value.trim();
    if (!validUrl(u)) { toast('⚠️ Escribe un enlace que empiece por http:// o https://'); return null; }
    set(K_RADIO, u); return u;
  };
  $('radio-open').onclick = () => { const u = current(); if (u) window.open(u, '_blank', 'noopener'); };
  $('radio-play').onclick = () => {
    const u = current(); if (!u) return;
    clearFrame(); mode = 'radio'; audio.src = u;
    audio.play().then(() => toast('▶ Reproduciendo')).catch(() => { mode = ''; sync(); toast('⚠️ No se pudo reproducir. Usa "Abrir" o prueba otro enlace.'); });
    sync();
  };
  audio.addEventListener('error', () => { if (audio.getAttribute('src') && mode === 'radio') { stopAll(); toast('⚠️ La emisora no responde.'); } });
  window.GymRadio = { state: () => ({ mode, count: list.length, idx, src: audio.getAttribute('src') }) };
})();
