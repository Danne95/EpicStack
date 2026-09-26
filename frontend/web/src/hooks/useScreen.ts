import { useSyncExternalStore } from 'react';

export type Screen = 'menu' | 'game' | 'settings' | 'how-to-play' | 'multiplayer';
function readScreen(): Screen {
  const value = window.location.hash.slice(2).split('?')[0];
  return value === 'multiplayer' ||
    value === 'game' ||
    value === 'settings' ||
    value === 'how-to-play'
    ? value
    : 'menu';
}
function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
export function useScreen(): Screen {
  return useSyncExternalStore(subscribe, readScreen);
}
