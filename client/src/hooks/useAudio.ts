import { useRef, useCallback, useEffect, useState } from 'react';

const BATTLE_TRACKS = [
  '/music/battle_1.mp3',
  '/music/battle_2.mp3',
  '/music/battle_3.mp3',
  '/music/battle_4.mp3',
  '/music/battle_5.mp3',
  '/music/battle_6.mp3',
];
const TITLE_TRACK = '/music/title_menu.mp3';
const FADE_MS = 800;

// SFX paths
const SFX = {
  cardFlip: '/sfx/card_flip.ogg',
  matchChime: '/sfx/match_chime.ogg',
  mismatch: '/sfx/mismatch.ogg',
  vsClash: '/sfx/vs_clash.ogg',
  coinToss: '/sfx/coin_toss.ogg',
  suddenDeath: '/sfx/sudden_death.ogg',
} as const;

type SfxName = keyof typeof SFX;

export function useAudio() {
  const titleRef = useRef<HTMLAudioElement | null>(null);
  const battleRef = useRef<HTMLAudioElement | null>(null);
  const sfxPoolRef = useRef<Map<string, HTMLAudioElement[]>>(new Map());
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

  // Play a one-shot SFX (pool of 3 per sound so overlaps work)
  const playSfx = useCallback((name: SfxName, volume = 0.6) => {
    if (mutedRef.current) return;
    const src = SFX[name];
    let pool = sfxPoolRef.current.get(src);
    if (!pool) {
      pool = [new Audio(src), new Audio(src), new Audio(src)];
      sfxPoolRef.current.set(src, pool);
    }
    // Find an idle audio element or reuse the oldest
    const audio = pool.find(a => a.paused) ?? pool[0];
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  }, []);

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

  const fadeIn = useCallback((audio: HTMLAudioElement, targetVol: number, durationMs = 2000): void => {
    audio.volume = 0;
    const steps = 30;
    const stepTime = durationMs / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.min(targetVol, targetVol * (step / steps));
      if (step >= steps) clearInterval(interval);
    }, stepTime);
  }, []);

  const playTitle = useCallback(() => {
    if (!titleRef.current) {
      titleRef.current = new Audio(TITLE_TRACK);
      titleRef.current.loop = true;
    }
    titleRef.current.muted = mutedRef.current;
    titleRef.current.volume = 0;
    titleRef.current.play().then(() => {
      fadeIn(titleRef.current!, 0.4, 2000);
    }).catch(() => {});
  }, [fadeIn]);

  const stopTitle = useCallback(async () => {
    if (titleRef.current && !titleRef.current.paused) {
      await fadeOut(titleRef.current);
      titleRef.current.currentTime = 0;
    }
  }, [fadeOut]);

  const playBattle = useCallback(async () => {
    await stopTitle();
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

  useEffect(() => {
    return () => {
      titleRef.current?.pause();
      battleRef.current?.pause();
    };
  }, []);

  return { muted, toggleMute, playTitle, stopTitle, playBattle, stopBattle, stopAll, playSfx };
}
