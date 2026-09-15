import { useEffect, useState } from 'react';

export function OfflineStatus() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let disposed = false;
    const announce = (text: string): void => {
      if (!disposed) setMessage(text);
    };
    const workerUrl = new URL(`${import.meta.env.BASE_URL}sw.js`, document.baseURI);
    void navigator.serviceWorker
      .register(workerUrl, { updateViaCache: 'none' })
      .then((registration) => {
        const report = (): void => {
          if (registration.waiting) announce('Update ready. Close all EpicStack tabs to apply.');
          else if (registration.active) announce('Available offline');
        };
        report();
        registration.addEventListener('updatefound', () => {
          registration.installing?.addEventListener('statechange', report);
        });
        void navigator.serviceWorker.ready.then(report);
      })
      .catch(() => announce('Offline setup unavailable. Keep this tab open to play.'));
    return () => {
      disposed = true;
    };
  }, []);
  return message ? <span role="status">{message}</span> : null;
}
