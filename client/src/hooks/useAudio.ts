import { useRef, useCallback, useEffect, useState } from 'react';

const BATTLE_TRACKS = ['/music/battle_1.mp3', '/music/battle_2.mp3'];
const TITLE_TRACK = '/music/title_menu.mp3';
const FADE_MS = 800;

export function useAudio() {
  const titleRef = useRef<HTMLAudioElement | null>(null);
  const battleRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('memory-muted') === 'true'; } catch { return false; }
  });
  const mutedRef = useRef(muted);

  // Keep ref in sync
  useEffect(() => {
    mutedRef.current = muted;
    if (titleRef.current) titleRef.current.muted = muted;
    if (battleRef.current) battleRef.current.muted = muted;
    try { localStorage.setItem('memory-muted', String(muted)); } catch {}
  }, [muted]);

  const fadeOut = useCallback((audio: HTMLAudioElement): Promise<void> => {
    return new Promise((resolve) => {
      if (audio.paused) { resolve(); return; }
      const startVol = audio.volume;
      const steps = 20;
      const stepTime = FADE_MS / steps;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        audio.volume = Math.max(0, startVol * (1 - step / steps));
        if (step >= steps) {
          clearInterval(interval);
          audio.pause();
          audio.volume = startVol;
          resolve();
        }
      }, stepTime);
    });
  }, []);

  const playTitle = useCallback(() => {
    if (!titleRef.current) {
      titleRef.current = new Audio(TITLE_TRACK);
      titleRef.current.loop = true;
    }
    titleRef.current.muted = mutedRef.current;
    titleRef.current.volume = 0.4;
    titleRef.current.play().catch(() => {});
  }, []);

  const stopTitle = useCallback(async () => {
    if (titleRef.current && !titleRef.current.paused) {
      await fadeOut(titleRef.current);
      titleRef.current.currentTime = 0;
    }
  }, [fadeOut]);

  const playBattle = useCallback(async () => {
    // Fade out title first
    await stopTitle();

    // Pick a random battle track
    const track = BATTLE_TRACKS[Math.floor(Math.random() * BATTLE_TRACKS.length)];
    if (!battleRef.current) {
      battleRef.current = new Audio(track);
      battleRef.current.loop = true;
    } else {
      battleRef.current.src = track;
    }
    battleRef.current.muted = mutedRef.current;
    battleRef.current.volume = 0.5;
    battleRef.current.play().catch(() => {});
  }, [stopTitle]);

  const stopBattle = useCallback(async () => {
    if (battleRef.current && !battleRef.current.paused) {
      await fadeOut(battleRef.current);
      battleRef.current.currentTime = 0;
    }
  }, [fadeOut]);

  const stopAll = useCallback(async () => {
    await Promise.all([stopTitle(), stopBattle()]);
  }, [stopTitle, stopBattle]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      titleRef.current?.pause();
      battleRef.current?.pause();
    };
  }, []);

  return { muted, toggleMute, playTitle, stopTitle, playBattle, stopBattle, stopAll };
}
