import { useEffect, useRef } from 'react';
import { useGame } from './hooks/useGame';
import { useAudio } from './hooks/useAudio';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { WaitingRoom } from './components/WaitingRoom';
import { CategoryPicker } from './components/CategoryPicker';
import { VersusScreen } from './components/VersusScreen';
import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import { LanguageToggle } from './components/LanguageToggle';
import { useTranslation } from './i18n/LanguageContext';
import './styles/card.css';

function App() {
  const game = useGame();
  const audio = useAudio();
  const { t } = useTranslation();
  const prevPhaseRef = useRef(game.phase);

  // Start title music on first interaction
  useEffect(() => {
    const startMusic = () => {
      audio.playTitle();
      document.removeEventListener('click', startMusic);
      document.removeEventListener('keydown', startMusic);
    };
    document.addEventListener('click', startMusic);
    document.addEventListener('keydown', startMusic);
    return () => {
      document.removeEventListener('click', startMusic);
      document.removeEventListener('keydown', startMusic);
    };
  }, []);

  // Drive music based on phase transitions
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = game.phase;
    prevPhaseRef.current = curr;

    if (curr === 'lobby' || curr === 'waiting' || curr === 'category-select') {
      audio.stopBattle();
      audio.playTitle();
    } else if (curr === 'versus') {
      audio.playBattle();
      setTimeout(() => audio.playSfx('vsClash', 0.7), 500);
      setTimeout(() => audio.playSfx('coinToss', 0.5), 1400);
    } else if (curr === 'spectating') {
      // Spectator gets battle music too
      audio.stopTitle();
      audio.playBattle();
    } else if (curr === 'finished' || curr === 'opponent-left') {
      // Keep battle music
    } else if (curr === 'playing' && prev === 'lobby') {
      audio.playBattle();
    }
  }, [game.phase]);

  // SFX triggers
  useEffect(() => {
    if (game.sfxEvent.seq === 0) return;
    switch (game.sfxEvent.type) {
      case 'flip': audio.playSfx('cardFlip', 0.5); break;
      case 'match': audio.playSfx('matchChime', 0.6); break;
      case 'mismatch': audio.playSfx('mismatch', 0.4); break;
      case 'suddenDeath': audio.playSfx('suddenDeath', 0.7); break;
    }
  }, [game.sfxEvent]);

  const showHeader = game.phase !== 'lobby';

  // Spectator + playing share the same GameBoard (spectator is read-only)
  const showBoard = (game.phase === 'playing' || game.phase === 'spectating') && game.gameState;

  return (
    <div className="app">
      {showHeader && <Header />}

      <div className="top-controls">
        <LanguageToggle />
        <button
          className="mute-btn"
          onClick={audio.toggleMute}
          aria-label={audio.muted ? 'Unmute' : 'Mute'}
          title={audio.muted ? 'Unmute' : 'Mute'}
        >
          {audio.muted ? '\u{1F507}' : '\u{1F50A}'}
        </button>
      </div>

      {!game.isConnected && game.phase === 'lobby' && (
        <div className="connection-status">{t('app.connecting')}</div>
      )}

      {game.phase === 'lobby' && (
        <Lobby
          onJoin={game.joinGame}
          onSpectate={game.spectateGame}
          isConnected={game.isConnected}
        />
      )}

      {game.phase === 'waiting' && (
        <WaitingRoom onCancel={game.leaveGame} />
      )}

      {game.phase === 'category-select' && game.gameState && game.myPlayerId && (
        <CategoryPicker
          gameState={game.gameState}
          myPlayerId={game.myPlayerId}
          onSelect={game.selectCategory}
        />
      )}

      {game.phase === 'versus' && game.gameState && (
        <VersusScreen
          gameState={game.gameState}
          myPlayerId={game.myPlayerId!}
        />
      )}

      {showBoard && (
        <GameBoard
          gameState={game.gameState!}
          myPlayerId={game.myPlayerId ?? ''}
          isMyTurn={game.isMyTurn}
          isSpectator={game.isSpectator}
          onFlipCard={game.flipCard}
          error={game.error}
          imageExtension={game.imageExtension}
          matchedCardIds={game.matchedCardIds}
          stillYourTurn={game.stillYourTurn}
          suddenDeathPhase={game.suddenDeathPhase}
          coinTossWinnerId={game.coinTossWinnerId}
        />
      )}

      {(game.phase === 'finished' || game.phase === 'opponent-left') && (
        <GameOver
          gameState={game.gameState}
          myPlayerId={game.myPlayerId}
          opponentLeft={game.phase === 'opponent-left'}
          rematchWaiting={game.rematchWaiting}
          opponentWantsRematch={game.opponentWantsRematch}
          onRematch={game.requestRematch}
          onPlayAgain={game.playAgain}
          onLeave={game.leaveGame}
        />
      )}
    </div>
  );
}

export default App;
