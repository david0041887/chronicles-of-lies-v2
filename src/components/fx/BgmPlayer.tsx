"use client";

import { trackForPath, type BgmTrack } from "@/lib/bgm";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const VOLUME_KEY = "chronicles.volume";
const MUTED_KEY = "chronicles.muted";
const BGM_ENABLED_KEY = "chronicles.bgm_enabled";
const FADE_MS = 800;

/**
 * Global background-music player. Reads /settings volume/muted from
 * localStorage, listens for `chronicles:volume` and `chronicles:muted`
 * CustomEvents the Settings page dispatches.
 *
 * Browser autoplay policy blocks audio before first user interaction —
 * we also listen once for any click/keypress/touch and try to start then.
 */
export function BgmPlayer() {
  const path = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<BgmTrack | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [started, setStarted] = useState(false);

  // Load persisted settings
  useEffect(() => {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    if (!isNaN(v) && v >= 0 && v <= 100) setVolume(v / 100);
    setMuted(localStorage.getItem(MUTED_KEY) === "1");
    const e = localStorage.getItem(BGM_ENABLED_KEY);
    setBgmEnabled(e === null ? true : e === "1");

    const onVol = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.volume !== undefined) setVolume(d.volume / 100);
    };
    const onMute = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.muted !== undefined) setMuted(d.muted);
    };
    const onBgmToggle = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.enabled !== undefined) setBgmEnabled(d.enabled);
    };
    window.addEventListener("chronicles:volume", onVol);
    window.addEventListener("chronicles:muted", onMute);
    window.addEventListener("chronicles:bgm", onBgmToggle);
    return () => {
      window.removeEventListener("chronicles:volume", onVol);
      window.removeEventListener("chronicles:muted", onMute);
      window.removeEventListener("chronicles:bgm", onBgmToggle);
    };
  }, []);

  // Resolve track for current path
  useEffect(() => {
    const next = trackForPath(path);
    setTrack(next);
  }, [path]);

  // React to volume/mute
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const gain = track?.gain ?? 1;
    el.volume = Math.max(0, Math.min(1, volume * gain));
    el.muted = muted || !bgmEnabled;
  }, [volume, muted, bgmEnabled, track]);

  // Change track (with fade)
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!track) {
      fadeOutAndPause(el);
      return;
    }
    if (el.src === track.src) return;
    fadeOutAndPause(el, () => {
      el.src = track.src;
      el.loop = true;
      if (started && bgmEnabled && !muted) {
        el.play().catch(() => {});
        fadeIn(el, Math.max(0, Math.min(1, volume * (track.gain ?? 1))));
      }
    });
  }, [track, started, bgmEnabled, muted, volume]);

  // Autoplay unlock
  useEffect(() => {
    if (started) return;
    const unlock = () => {
      setStarted(true);
      const el = audioRef.current;
      if (el && track && bgmEnabled && !muted) {
        el.play().catch(() => {});
        fadeIn(el, Math.max(0, Math.min(1, volume * (track.gain ?? 1))));
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [started, track, bgmEnabled, muted, volume]);

  return (
    <audio ref={audioRef} preload="none" hidden aria-hidden />
  );
}

function fadeOutAndPause(el: HTMLAudioElement, onDone?: () => void) {
  const start = el.volume;
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / FADE_MS);
    el.volume = start * (1 - k);
    if (k < 1) requestAnimationFrame(step);
    else {
      el.pause();
      el.volume = start;
      onDone?.();
    }
  };
  if (el.paused || start === 0) {
    onDone?.();
  } else {
    requestAnimationFrame(step);
  }
}

function fadeIn(el: HTMLAudioElement, target: number) {
  el.volume = 0;
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / FADE_MS);
    el.volume = target * k;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
