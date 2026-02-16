// Abyss — minimal interactions

(function () {
  // Respect reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--anim-duration', '0s');
  }

  // Audio player
  var player = document.querySelector('.audio-player');
  if (!player) return;

  var audio = player.querySelector('audio');
  var btn = player.querySelector('.audio-btn');
  var iconPlay = player.querySelector('.icon-play');
  var iconPause = player.querySelector('.icon-pause');
  var track = player.querySelector('.audio-track');
  var wavesProgress = player.querySelector('.waves-progress');
  var timeEl = player.querySelector('.audio-time');
  var dragging = false;

  function fmt(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function setProgress(ratio) {
    var pct = Math.max(0, Math.min(100, ratio * 100));
    wavesProgress.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
  }

  function seekFromEvent(e) {
    var rect = track.getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  }

  audio.addEventListener('loadedmetadata', function () {
    timeEl.textContent = fmt(audio.duration);
  });

  btn.addEventListener('click', function () {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('play', function () {
    iconPlay.style.display = 'none';
    iconPause.style.display = '';
  });

  audio.addEventListener('pause', function () {
    iconPlay.style.display = '';
    iconPause.style.display = 'none';
  });

  audio.addEventListener('timeupdate', function () {
    if (audio.duration && !dragging) {
      setProgress(audio.currentTime / audio.duration);
      timeEl.textContent = fmt(audio.currentTime);
    }
  });

  audio.addEventListener('ended', function () {
    setProgress(0);
    timeEl.textContent = fmt(audio.duration);
  });

  // Click to seek
  track.addEventListener('click', seekFromEvent);

  // Drag (mouse)
  track.addEventListener('mousedown', function (e) {
    dragging = true;
    seekFromEvent(e);
  });

  document.addEventListener('mousemove', function (e) {
    if (dragging) seekFromEvent(e);
  });

  document.addEventListener('mouseup', function () {
    dragging = false;
  });

  // Drag (touch)
  track.addEventListener('touchstart', function (e) {
    dragging = true;
    seekFromEvent(e);
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (dragging) seekFromEvent(e);
  }, { passive: true });

  document.addEventListener('touchend', function () {
    dragging = false;
  });
})();
