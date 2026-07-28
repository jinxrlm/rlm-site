// press.js — shared presskit player logic
// Exclusive single-track playback using direct src assignment

(function () {
  'use strict';

  let current = null; // { num, name, opusUrl, m4aUrl, rowEl, btnEl, durationEl }
  const audio = new Audio();
  audio.preload = 'none';

  // Determine container support upfront
  // Safari / iOS often fails audio/ogg; check for M4A / AAC preference
  const canPlayOpus = Boolean(
    audio.canPlayType('audio/ogg; codecs=opus') ||
    audio.canPlayType('audio/webm; codecs=opus')
  );

  window.pressPlayer = { init };

  function init(tracks) {
    const bar = document.getElementById('player-bar');
    const barName = document.getElementById('player-track-name');
    const btnPlay = document.getElementById('player-play');
    const scrubWrap = document.getElementById('player-scrubber');
    const fill = document.getElementById('player-fill');
    const timeCur = document.getElementById('player-time-cur');
    const timeTotal = document.getElementById('player-time-total');

    if (!bar || !btnPlay || !scrubWrap) return;

    // ── Row Wireup ──────────────────────────────────────────────────────────
    tracks.forEach(t => {
      t.rowEl.addEventListener('click', () => toggle(t));
      t.btnEl.addEventListener('click', e => {
        e.stopPropagation();
        toggle(t);
      });
    });

    // ── Central Controls ───────────────────────────────────────────────────
    btnPlay.addEventListener('click', () => {
      if (!current) return;
      audio.paused ? playAudio() : audio.pause();
    });

    scrubWrap.addEventListener('click', e => {
      if (!audio.duration || isNaN(audio.duration)) return;
      const rect = scrubWrap.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pos * audio.duration;
    });

    // ── Audio Engine Events ────────────────────────────────────────────────
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      fill.style.width = pct + '%';
      timeCur.textContent = fmt(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
      timeTotal.textContent = fmt(audio.duration);
      if (current && current.durationEl) {
        current.durationEl.textContent = fmt(audio.duration);
      }
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
      if (current) {
        current.btnEl.textContent = '▶';
      }
    });

    audio.addEventListener('ended', () => {
      resetUI();
      if (current) {
        current.rowEl.classList.remove('playing');
        current.btnEl.textContent = '▶';
      }
    });

    audio.addEventListener('error', (e) => {
      console.error('Playback Error:', audio.error);
    });

    // ── Core Toggle / Loader Logic ─────────────────────────────────────────
    function toggle(t) {
      // 1. If clicking active track: toggle play/pause
      if (current === t) {
        audio.paused ? playAudio() : audio.pause();
        return;
      }

      // 2. Clear former track styling
      if (current) {
        current.rowEl.classList.remove('playing');
        current.btnEl.textContent = '▶';
      }

      // 3. Set current track reference
      current = t;

      // 4. Select correct URL based on browser codec support
      const targetUrl = (canPlayOpus && t.opusUrl) ? t.opusUrl : t.m4aUrl;

      // 5. Direct src assignment (bypasses <source> DOM bug)
      audio.src = targetUrl;
      audio.load();

      // 6. Update UI shell
      bar.classList.add('visible');
      barName.textContent = t.name;
      fill.style.width = '0%';
      timeCur.textContent = '0:00';
      timeTotal.textContent = '—';

      playAudio();
    }

    function playAudio() {
      audio.play().catch(err => {
        console.warn('Playback interrupted or blocked by user gesture policy:', err);
      });
    }

    function resetUI() {
      btnPlay.textContent = '▶';
      btnPlay.classList.remove('active');
      fill.style.width = '0%';
      timeCur.textContent = '0:00';
    }
  }

  // ── Time Formatting ──────────────────────────────────────────────────────
  function fmt(secs) {
    if (!isFinite(secs) || isNaN(secs)) return '—';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

})();