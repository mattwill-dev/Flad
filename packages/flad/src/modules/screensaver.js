"use strict";

(() => {
  const {
    setDisplayBrightness,
    requestWakeLockOverride,
    releaseWakeLockOverride,
    initiateScaleConnect,
    disconnectScale,
  } = window.NSXApi || {};

  const SS_DEFAULT_IMAGES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 15]
    .map(n => `ui/screensaver/Screen_saver_Decent_${n}.jpg`);

  // Custom backgrounds are device-local: they live in IndexedDB, not in the
  // gateway store, so a phone photo doesn't get base64'd into every device's
  // settings payload. Each device therefore has its own set.
  const SS_DB_NAME = "nsx";
  const SS_DB_STORE = "screensaver";
  const SS_DB_KEY = "images";
  const SS_MAX_IMAGES = 20;
  const SS_MAX_EDGE = 1600;      // downscale before storing — phone photos are huge
  const SS_JPEG_QUALITY = 0.82;

  let ssCustomImages = [];
  let ssCustomOnly = false;

  function ssOpenDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(SS_DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(SS_DB_STORE)) req.result.createObjectStore(SS_DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function ssDbRequest(mode, run) {
    return ssOpenDb().then(db => new Promise((resolve, reject) => {
      const req = run(db.transaction(SS_DB_STORE, mode).objectStore(SS_DB_STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  /** Read a picked file and re-encode it to a bounded JPEG data URL. */
  function ssFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("decode failed"));
        img.onload = () => {
          const scale = Math.min(1, SS_MAX_EDGE / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", SS_JPEG_QUALITY));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /** The rotation actually shown: custom-only, or the built-ins plus any custom. */
  function ssImages() {
    if (!ssCustomImages.length) return SS_DEFAULT_IMAGES;
    return ssCustomOnly ? ssCustomImages : SS_DEFAULT_IMAGES.concat(ssCustomImages);
  }

  async function loadCustomImages() {
    try {
      const stored = await ssDbRequest("readonly", s => s.get(SS_DB_KEY));
      ssCustomImages = Array.isArray(stored) ? stored : [];
    } catch {
      ssCustomImages = [];
    }
    return ssCustomImages;
  }

  async function ssPersistCustomImages() {
    await ssDbRequest("readwrite", s => s.put(ssCustomImages, SS_DB_KEY));
    if (ssActive) {
      ssImgIndex = 0;
      ssCrossfade(ssImages()[0]);
    }
  }

  /** Add picked files; returns the new total. Throws if storing fails. */
  async function addCustomImages(files) {
    const list = Array.from(files || []);
    if (!list.length) return ssCustomImages.length;
    const room = Math.max(0, SS_MAX_IMAGES - ssCustomImages.length);
    const urls = await Promise.all(list.slice(0, room).map(ssFileToDataUrl));
    ssCustomImages = ssCustomImages.concat(urls);
    await ssPersistCustomImages();
    return ssCustomImages.length;
  }

  async function removeCustomImage(index) {
    ssCustomImages = ssCustomImages.filter((_, i) => i !== index);
    await ssPersistCustomImages();
    return ssCustomImages.length;
  }

  async function clearCustomImages() {
    ssCustomImages = [];
    await ssPersistCustomImages();
  }

  let ssActive = false;
  let ssImgIndex = 0;
  let ssActiveLayer = "a";
  let ssClockTimer = null;
  let ssImageTimer = null;
  let ssHoldActive = false;
  let ssHoldStartX = 0;
  let ssHoldStartY = 0;
  let ssHoldTimer = null;
  const SS_WAKE_HOLD_MS = 1000;
  const SS_WAKE_HOLD_TOLERANCE_PX = 20;
  let scalePowerMode = "displayOff";
  let ssEnabled = true;
  let ssDimEnabled = true;
  let ssDimLevel = 50;
  let ssWakeLockNormal = true;
  let ssWakeLockLocked = false;
  let ssRestoreBrightness = 100;

  let suppressSleepScreensaver = false;
  let suppressSleepScreensaverUntilWake = false;
  let lastMachineState = null;
  let ssUnlockCallback = null;
  const ssSheetAnimMs = 380;
  const ssSheetAnimEase = "cubic-bezier(0.32,0,0.67,0)";

  const ssEl = document.getElementById("screensaver");
  const ssBgA = document.getElementById("ss-bg-a");
  const ssBgB = document.getElementById("ss-bg-b");
  const ssTimeEl = document.getElementById("ss-time");
  const ssDateEl = document.getElementById("ss-date");
  const ssPulseEl = document.getElementById("ss-hold-pulse");
  const ssDimEl = document.getElementById("ss-dim");

  function ssUpdateClock() {
    const now = new Date();
    if (ssTimeEl) ssTimeEl.textContent = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    if (ssDateEl) ssDateEl.textContent = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
  }

  function ssCrossfade(url) {
    const next = ssActiveLayer === "a" ? ssBgB : ssBgA;
    const curr = ssActiveLayer === "a" ? ssBgA : ssBgB;
    if (!next || !curr) return;
    next.style.backgroundImage = `url(${url})`;
    next.style.opacity = "1";
    curr.style.opacity = "0";
    ssActiveLayer = ssActiveLayer === "a" ? "b" : "a";
  }

  function applyDim(active) {
    if (!ssDimEl) return;
    const o = (active && ssDimEnabled) ? Math.min(0.9, Math.max(0, (100 - ssDimLevel) / 100)) : 0;
    ssDimEl.style.opacity = String(o);
  }

  let _wakeLockHeld = null; // null = unknown; only POST/DELETE when the desired state changes
  function syncWakeLock() {
    const wantLock = ssActive ? ssWakeLockLocked : ssWakeLockNormal;
    if (wantLock === _wakeLockHeld) return;       // dedupe: avoid redundant wakelock requests
    _wakeLockHeld = wantLock;
    const onErr = () => { _wakeLockHeld = null; }; // allow retry if the request failed
    if (wantLock) requestWakeLockOverride?.().catch(onErr);
    else releaseWakeLockOverride?.().catch(onErr);
  }

  // The gateway auto-releases a held wake-lock override when the ws/v1/display
  // connection that requested it closes (Reaprime best practice, prevents
  // orphaned locks from a disconnected skin). If that socket reconnects, the
  // gateway has already forgotten the override, but our dedup cache above
  // still thinks it's held — so a later syncWakeLock() call with an unchanged
  // desired state would silently no-op instead of re-asserting it. Call this
  // right after a display-WS reconnect (before syncWakeLock()) to force the
  // next call through.
  function invalidateWakeLock() {
    _wakeLockHeld = null;
  }

  function show(animateOverlay = false) {
    if (!ssEnabled || ssActive || !ssEl) return;
    ssActive = true;

    if (ssDimEnabled) setDisplayBrightness?.(ssDimLevel).catch(() => {});
    applyDim(true);
    syncWakeLock();
    if (scalePowerMode === "disconnect") disconnectScale?.();

    const images = ssImages();
    ssImgIndex = Math.floor(Math.random() * images.length);
    const initUrl = images[ssImgIndex];
    if (ssBgA) {
      ssBgA.style.backgroundImage = `url(${initUrl})`;
      ssBgA.style.opacity = "1";
    }
    if (ssBgB) {
      ssBgB.style.opacity = "0";
    }
    ssActiveLayer = "a";

    ssUpdateClock();

    if (animateOverlay) {
      ssEl.style.transition = "none";
      ssEl.style.transform = "translateY(-105%)";
      ssEl.style.opacity = "0";
      ssEl.hidden = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!ssActive) return;
          ssEl.style.transition = `transform ${ssSheetAnimMs}ms ${ssSheetAnimEase}, opacity ${ssSheetAnimMs}ms ease`;
          ssEl.style.transform = "translateY(0)";
          ssEl.style.opacity = "1";
          setTimeout(() => {
            if (!ssActive) return;
            ssEl.style.transition = "";
            ssEl.style.transform = "";
            ssEl.style.opacity = "";
          }, ssSheetAnimMs + 30);
        });
      });
    } else {
      ssEl.style.transition = "";
      ssEl.style.transform = "";
      ssEl.style.opacity = "";
      ssEl.hidden = false;
    }

    ssClockTimer = setInterval(ssUpdateClock, 1000);
    ssImageTimer = setInterval(() => {
      const list = ssImages();
      ssImgIndex = (ssImgIndex + 1) % list.length;
      ssCrossfade(list[ssImgIndex]);
    }, 30000);
  }

  function hide(animate = true) {
    if (!ssActive || !ssEl) return;
    ssActive = false;
    clearInterval(ssClockTimer);
    clearInterval(ssImageTimer);

    setDisplayBrightness?.(ssRestoreBrightness).catch(() => {});
    applyDim(false);
    syncWakeLock();
    if (scalePowerMode === "disconnect") initiateScaleConnect?.().catch(() => {});
    ssUnlockCallback?.();

    if (animate) {
      ssEl.style.transition = `transform ${ssSheetAnimMs}ms ${ssSheetAnimEase}, opacity ${ssSheetAnimMs}ms ease`;
      ssEl.style.transform = "translateY(-105%)";
      ssEl.style.opacity = "0";
      setTimeout(() => {
        ssEl.hidden = true;
        ssEl.style.transition = "";
        ssEl.style.transform = "";
        ssEl.style.opacity = "";
      }, ssSheetAnimMs + 20);
    } else {
      ssEl.hidden = true;
    }
  }

  // Press-and-hold-anywhere-to-wake, replacing the old slide-to-unlock bar.
  // Single pointer only; drifting past the tolerance or lifting early cancels.
  function ssHoldCancel() {
    ssHoldActive = false;
    if (ssHoldTimer !== null) {
      clearTimeout(ssHoldTimer);
      ssHoldTimer = null;
    }
    if (ssPulseEl) ssPulseEl.hidden = true;
  }

  function ssHoldStart(clientX, clientY) {
    if (!ssActive) return;
    ssHoldCancel();
    ssHoldActive = true;
    ssHoldStartX = clientX;
    ssHoldStartY = clientY;
    if (ssPulseEl) {
      ssPulseEl.style.left = `${clientX}px`;
      ssPulseEl.style.top = `${clientY}px`;
      ssPulseEl.hidden = false;
    }
    ssHoldTimer = setTimeout(() => {
      ssHoldTimer = null;
      if (!ssHoldActive) return;
      ssHoldActive = false;
      if (ssPulseEl) ssPulseEl.hidden = true;
      hide(true);
    }, SS_WAKE_HOLD_MS);
  }

  function ssHoldMove(clientX, clientY) {
    if (!ssHoldActive) return;
    const dx = clientX - ssHoldStartX;
    const dy = clientY - ssHoldStartY;
    if (Math.hypot(dx, dy) > SS_WAKE_HOLD_TOLERANCE_PX) ssHoldCancel();
  }

  function handleMachineState(state) {
    const prevState = lastMachineState;
    lastMachineState = state;

    if (state === "sleeping") {
      if (prevState === "sleeping") return;
      if (suppressSleepScreensaverUntilWake) return;
      if (suppressSleepScreensaver) {
        suppressSleepScreensaver = false;
        return;
      }
      show(false);
      return;
    }

    suppressSleepScreensaverUntilWake = false;
    if (prevState === "sleeping" || prevState === null) {
      syncWakeLock();
    }
  }

  function suppressForToggleSleep() {
    suppressSleepScreensaver = true;
    suppressSleepScreensaverUntilWake = true;
  }

  function clearSuppressions() {
    suppressSleepScreensaver = false;
    suppressSleepScreensaverUntilWake = false;
  }

  ssEl?.addEventListener("contextmenu", e => e.preventDefault());
  ssEl?.addEventListener("touchstart", e => ssHoldStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  ssEl?.addEventListener("touchmove", e => ssHoldMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  ssEl?.addEventListener("touchend", () => ssHoldCancel(), { passive: true });
  ssEl?.addEventListener("touchcancel", () => ssHoldCancel(), { passive: true });
  ssEl?.addEventListener("mousedown", e => ssHoldStart(e.clientX, e.clientY));
  window.addEventListener("mousemove", e => {
    if (ssHoldActive) ssHoldMove(e.clientX, e.clientY);
  });
  window.addEventListener("mouseup", () => {
    if (ssHoldActive) ssHoldCancel();
  });

  window.addEventListener("scale:status", () => {
    if (ssActive && scalePowerMode === "disconnect") {
      disconnectScale?.();
    }
  });

  window.NSXScreensaver = {
    show,
    hide,
    handleMachineState,
    suppressForToggleSleep,
    clearSuppressions,
    syncWakeLock,
    invalidateWakeLock,
    setScalePowerMode(mode) { scalePowerMode = mode || 'disabled'; },
    setEnabled(v) {
      ssEnabled = Boolean(v);
      if (!ssEnabled && ssActive) hide(false);
    },
    loadCustomImages,
    getCustomImages: () => ssCustomImages.slice(),
    addCustomImages,
    removeCustomImage,
    clearCustomImages,
    maxCustomImages: SS_MAX_IMAGES,
    setConfig(cfg = {}) {
      if (typeof cfg.customOnly === 'boolean') ssCustomOnly = cfg.customOnly;
      if (typeof cfg.dimEnabled === 'boolean') ssDimEnabled = cfg.dimEnabled;
      if (Number.isFinite(cfg.dimLevel)) ssDimLevel = cfg.dimLevel;
      if (typeof cfg.wakeLockNormal === 'boolean') ssWakeLockNormal = cfg.wakeLockNormal;
      if (typeof cfg.wakeLockLocked === 'boolean') ssWakeLockLocked = cfg.wakeLockLocked;
      if (Number.isFinite(cfg.restoreBrightness)) ssRestoreBrightness = cfg.restoreBrightness;
      applyDim(ssActive);
      syncWakeLock();
    },
    setUnlockCallback(fn) {
      ssUnlockCallback = typeof fn === 'function' ? fn : null;
    },
  };
})();
