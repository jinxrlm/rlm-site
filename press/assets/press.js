// press.js — shared presskit player logic
// Exclusive single-track playback. One <audio> element, swapped per track.

(function () {
  'use strict';

  const MEDIA_BASE = 'https://media.reallifemusic.org';

  let current = null;   // { audio, row, btn } — the active track, or null
  const audio  = new Audio();

  console.log(audio.canPlayType('audio/ogg; codecs="opus"'));
  console.log(audio.canPlayType('audio/ogg; codecs=opus'));
  console.log(audio.canPlayType('audio/mp4'));

  audio.preload = 'none';

  // ── public init ─────────────────────────────────────────────────────────────
  // Called from the generated page once DOM is ready.
  // tracks: [{ num, name, opusUrl, m4aUrl, rowEl, btnEl, durationEl }]
  window.pressPlayer = { init };

  function init(tracks) {
    const bar    = document.getElementById('player-bar');
    const barName  = document.getElementById('player-track-name');
    const btnPlay  = document.getElementById('player-play');
    const scrubWrap = document.getElementById('player-scrubber');
    const fill     = document.getElementById('player-fill');
    const timeCur  = document.getElementById('player-time-cur');
    const timeTotal = document.getElementById('player-time-total');

    // wire each row
    tracks.forEach(t => {
      t.rowEl.addEventListener('click', () => toggle(t));
      t.btnEl.addEventListener('click', e => { e.stopPropagation(); toggle(t); });
    });

    // central play/pause button
    btnPlay.addEventListener('click', () => {
      if (!current) return;
      audio.paused ? audio.play() : audio.pause();
    });

    // scrubber seek
    scrubWrap.addEventListener('click', e => {
      if (!audio.duration) return;
      const rect = scrubWrap.getBoundingClientRect();
      audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });

    // audio events → UI
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      fill.style.width = pct + '%';
      timeCur.textContent = fmt(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
      timeTotal.textContent = fmt(audio.duration);
      if (current) current.durationEl.textContent = fmt(audio.duration);
    });

    audio.addEventListener('play', () => {
      btnPlay.textContent = '⏸';
      btnPlay.classList.add('active');
      if (current) current.btnEl.textContent = '⏸';
    });

    audio.addEventListener('pause', () => {
      btnPlay.textContent = '▶';
      btnPlay.classList.remove('active');
      if (current) current.btnEl.textContent = '▶';
    });

    audio.addEventListener('ended', () => {
      btnPlay.textContent = '▶';
      btnPlay.classList.remove('active');
      if (current) {
        current.btnEl.textContent = '▶';
        current.rowEl.classList.remove('playing');
      }
      fill.style.width = '0%';
      timeCur.textContent = '0:00';
    });

    // ── toggle play/pause for a track ──────────────────────────────────────
    function toggle(t) {
      if (current && current === t) {
        // same track — play/pause
        audio.paused ? audio.play() : audio.pause();
        return;
      }

      // different track — stop current, load new
      if (current) {
        current.rowEl.classList.remove('playing');
        current.btnEl.textContent = '▶';
      }

      // Remove any previous source
      audio.removeAttribute('src');

      while (audio.firstChild) {
        audio.removeChild(audio.firstChild);
      }

      const sourceOpus = document.createElement('source');
      sourceOpus.src = t.opusUrl;
      sourceOpus.type = 'audio/ogg; codecs=opus';

      const sourceM4a = document.createElement('source');
      sourceM4a.src = t.m4aUrl;
      sourceM4a.type = 'audio/mp4';

      audio.appendChild(sourceOpus);
      audio.appendChild(sourceM4a);

      audio.load();

      audio.play().catch(err => {
        console.error(err);
        console.log(audio.error);
        console.log(audio.currentSrc);
        console.log(audio.src);
      });

      current = t;
      t.rowEl.classList.add('playing');
      t.btnEl.textContent = '⏸';

      bar.classList.add('visible');
      barName.textContent = t.name;
      fill.style.width = '0%';
      timeCur.textContent = '0:00';
      timeTotal.textContent = '—';
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────────
  function fmt(secs) {
    if (!isFinite(secs)) return '—';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

})();
