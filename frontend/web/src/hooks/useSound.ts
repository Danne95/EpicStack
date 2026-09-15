import { useEffect, useRef } from 'react';
import { HUMAN_PLAYER } from './gameController';
import type { GameState } from '../../../../shared/types/index';

// Quiet, short synthesized wooden tones. Frequencies are musical notes in Hz.
const TONES = { draw: [330], place: [196], win: [392, 494, 587], loss: [294, 220] } as const;
const NOTE_SECONDS = 0.13;
const NOTE_GAP = 0.11;
// Eight-millisecond attack avoids clicks; the exponential tail must stay above zero.
const ATTACK_SECONDS = 0.008;
const END_VOLUME = 0.001;
const VOLUME = 0.06;

export function useSound(game: GameState | null, muted: boolean) {
  const context = useRef<AudioContext | null>(null);
  const previous = useRef(game);
  function unlock(): void {
    if (muted) return;
    try {
      context.current ??= new AudioContext();
      void context.current.resume().catch(() => undefined);
    } catch {
      /* Audio is optional on browsers without Web Audio. */
    }
  }
  useEffect(() => {
    if (muted && context.current) {
      void context.current.close().catch(() => undefined);
      context.current = null;
    }
  }, [muted]);
  useEffect(
    () => () => {
      void context.current?.close().catch(() => undefined);
      context.current = null;
    },
    [],
  );
  useEffect(() => {
    const before = previous.current;
    previous.current = game;
    const audio = context.current;
    if (muted || !audio || audio.state !== 'running' || !before || !game || before === game) return;
    const tone =
      game.status === 'won'
        ? game.winner === HUMAN_PLAYER
          ? 'win'
          : 'loss'
        : game.discardedBricks.length > before.discardedBricks.length
          ? 'place'
          : game.turn.phase === 'awaiting-placement' && before.turn.phase !== 'awaiting-placement'
            ? 'draw'
            : null;
    if (!tone) return;
    TONES[tone].forEach((frequency, index) => {
      const start = audio.currentTime + index * NOTE_GAP;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(VOLUME, start + ATTACK_SECONDS);
      gain.gain.exponentialRampToValueAtTime(END_VOLUME, start + NOTE_SECONDS);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + NOTE_SECONDS);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }, [game, muted]);
  return unlock;
}
