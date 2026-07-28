// press.js — shared presskit player logic (v3)
// Exclusive single-track playback, error-driven fallback, verbose diagnostics.

(function () {
  'use strict';

  // If your track URLs are already absolute (start with http), this is unused.
  // If they're relative (e.g. "audio/track1.opus"), this gets prepended.
  const MEDIA_BASE = 'https://media.reallifemusic.org';

  let current = null;      // { num, name, opusUrl, m4aUrl, rowEl, btnEl, durationEl }
  let usingFallback = false; // true once we've dropped to m4a for `current`
  let playToken = 0;       // guards against play()/pause() race (AbortError)

  const audio = new Audio();
  audio.preload = 'none';

  window.pressPlayer = { init };

  function resolveUrl(url) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    // avoid double slashes
    return MEDIA_BASE.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
  }

  function init(tracks) {
    const bar = document.getElementById('player-bar');
    const barName = document.getElementById('player-track-name');
    const btnPlay = document.getElementById('player-play');
    const scrubWrap = document.getElementById('player-scrubber');
    const fill = document.getElementById('player-fill');
    const timeCur = document.getElementById('player-time-cur');
    const timeTotal = document.getElementById('player-time-total');

    if (!bar || !btnPlay || !scrubWrap) {
      console.error('[press.js] missing required DOM nodes (player-bar / player-play / player-scrubber)');
      return;
    }

    tracks.forEach(t => {
      t.rowEl.addEventListener('click', () => toggle(t));
      t.btnEl.addEventListener('click', e => { e.stopPropagation(); toggle(t); });
    });

    btnPlay.addEventListener('click', () => {
      if (!current) return;
      audio.paused ? safePlay() : audio.pause();
    });

    scrubWrap.addEventListener('click', e => {
      if (!audio.duration || isNaN(audio.duration)) return;
      const rect = scrubWrap.getBoundingClientRect();
      audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      fill.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
      timeCur.textContent = fmt(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
      timeTotal.textContent = fmt(audio.duration);
      if (current && current.durationEl) current.durationEl.textContent = fmt(audio.duration);
    });

    audio.addEventListener('play', () => {
      btnPlay.textContent = '⏸';
      btnPlay.classList.add('active');
      if (current) {
        current.btnEl.textContent = '⏸';
        current.rowEl.classList.add('playing');
      }
    });

    audio.addEventListener('pause', () => {
      btnPlay.textContent = '▶';
      btnPlay.classList.remove('active');
      if (current) current.btnEl.textContent = '▶';
    });

    audio.addEventListener('ended', () => {
      resetUI();
      if (current) {
        current.rowEl.classList.remove('playing');
        current.btnEl.textContent = '▶';
      }
    });

    // ── the important part: real diagnostics + real fallback ──────────────
    audio.addEventListener('error', () => {
      const err = audio.error;
      console.error('[press.js] media error', {
        code: err && err.code,          // 1=ABORTED 2=NETWORK 3=DECODE 4=SRC_NOT_SUPPORTED
        currentSrc: audio.currentSrc,
        usingFallback
      });

      if (current && !usingFallback && current.m4aUrl) {
        const m4a = resolveUrl(current.m4aUrl);
        console.warn('[press.js] falling back to m4a:', m4a);
        usingFallback = true;
        audio.src = m4a;
        audio.load();
        safePlay();
      } else {
        console.error('[press.js] both sources failed for', current && current.name);
        resetUI();
      }
    });

    function toggle(t) {
      if (current === t) {
        audio.paused ? safePlay() : audio.pause();
        return;
      }

      if (current) {
        current.rowEl.classList.remove('playing');
        current.btnEl.textContent = '▶';
      }

      current = t;
      usingFallback = false;

      const opus = resolveUrl(t.opusUrl);
      const canOpus = !!(opus && (audio.canPlayType('audio/ogg; codecs=opus') || audio.canPlayType('audio/webm; codecs=opus')));
      const startUrl = canOpus ? opus : resolveUrl(t.m4aUrl);
      usingFallback = !canOpus;

      console.log('[press.js] loading track', t.name, '→', startUrl);

      audio.src = startUrl;
      audio.load();

      bar.classList.add('visible');
      barName.textContent = t.name;
      fill.style.width = '0%';
      timeCur.textContent = '0:00';
      timeTotal.textContent = '—';

      safePlay();
    }

    function safePlay() {
      const myToken = ++playToken;
      const p = audio.play();
      if (p && p.catch) {
        p.catch(err => {
          // ignore AbortError caused by a newer play/pause/track-switch superseding this one
          if (myToken !== playToken) return;
          console.warn('[press.js] play() rejected:', err.name, err.message);
        });
      }
    }

    function resetUI() {
      btnPlay.textContent = '▶';
      btnPlay.classList.remove('active');
      fill.style.width = '0%';
      timeCur.textContent = '0:00';
    }
  }

  function fmt(secs) {
    if (!isFinite(secs) || isNaN(secs)) return '—';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

})();