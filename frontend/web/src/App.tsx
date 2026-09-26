import { MultiplayerScreen } from './screens/MultiplayerScreen';
import stackMark from '../../../assets/branding/stack-mark.svg';
import { OfflineStatus } from './components/OfflineStatus';
import { useEffect } from 'react';
import type { Difficulty } from '../../../shared/ai/difficulty';
import { useLocalData } from './hooks/useLocalData';
import { useSound } from './hooks/useSound';
import { useGame } from './hooks/useGame';
import { useScreen } from './hooks/useScreen';
import { MenuScreen } from './screens/MenuScreen';
import { GameScreen } from './screens/GameScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { HowToPlayScreen } from './screens/HowToPlayScreen';

export function App() {
  const screen = useScreen();
  const controller = useGame(screen === 'game');
  const { data, setData, storageAvailable } = useLocalData(controller.session);
  const { difficulty, muted } = data;
  const unlockSound = useSound(controller.session.game, muted);
  const setDifficulty = (value: Difficulty): void =>
    setData((previous) => ({ ...previous, difficulty: value }));
  const toggleMute = (): void => setData((previous) => ({ ...previous, muted: !previous.muted }));
  const canResume =
    controller.session.game?.status === 'playing' && controller.session.error === null;
  useEffect(() => {
    document.title = `EpicStack · ${screen === 'menu' ? 'Play' : screen === 'how-to-play' ? 'How to play' : screen}`;
    document.querySelector<HTMLElement>('#main h1')?.focus();
  }, [screen]);

  function play(): void {
    if (!canResume) controller.start(difficulty);
    window.location.hash = '/game';
  }

  return (
    <div className="app-shell" onPointerDownCapture={unlockSound} onKeyDownCapture={unlockSound}>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.querySelector<HTMLElement>('#main h1')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a className="wordmark" href="#/" aria-label="EpicStack home">
          <img className="brand-mark" src={stackMark} alt="" />
          EpicStack<span className="brand-period">.</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#/" aria-current={screen === 'menu' ? 'page' : undefined}>
            Play
          </a>
          <a href="#/how-to-play" aria-current={screen === 'how-to-play' ? 'page' : undefined}>
            How to play
          </a>
          <a href="#/settings" aria-current={screen === 'settings' ? 'page' : undefined}>
            Settings
          </a>
        </nav>
      </header>
      {!storageAvailable ? (
        <p className="storage-notice" role="status">
          Browser storage is unavailable. You can play, but preferences and statistics will last
          only for this session.
        </p>
      ) : null}
      {controller.session.error !== null &&
      (screen !== 'game' || controller.session.game === null) ? (
        <p className="error-message" role="alert">
          {controller.session.error}
        </p>
      ) : null}
      {screen === 'menu' ? (
        <MenuScreen
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onPlay={play}
          canResume={canResume}
        />
      ) : screen === 'game' ? (
        <GameScreen
          session={controller.session}
          onSelect={controller.select}
          onConfirm={controller.confirm}
          onRestart={controller.restart}
          onNewGame={() => controller.start(difficulty)}
        />
      ) : screen === 'multiplayer' ? (
        <MultiplayerScreen />
      ) : screen === 'settings' ? (
        <SettingsScreen
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          muted={muted}
          onMute={toggleMute}
          statistics={data.statistics}
        />
      ) : (
        <HowToPlayScreen />
      )}
      <footer className="site-footer">
        <span>Made By FromEpicBrain</span>
        <OfflineStatus />
      </footer>
    </div>
  );
}
