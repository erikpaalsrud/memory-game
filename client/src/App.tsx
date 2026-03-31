import { useEffect, useRef } from 'react';
import { useGame } from './hooks/useGame';
import { useAudio } from './hooks/useAudio';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { WaitingRoom } from './components/WaitingRoom';
import { VersusScreen } from './components/VersusScreen';
import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import './styles/card.css';

function App() {
  const game = useGame();
  const audio = useAudio();
  const prevPhaseRef = useRef(game.phase);

  // Drive music based on phase transitions
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = game.phase;
    prevPhaseRef.current = curr;

    if (curr === 'lobby' || curr === 'waiting') {
      // Title music for lobby/waiting
      audio.stopBattle();
      audio.playTitle();
    } else if (curr === 'versus') {
      // Battle music starts at versus screen
      audio.playBattle();
    } else if (curr === 'finished' || curr === 'opponent-left') {
      // Keep battle music running on game over (feels natural)
    } else if (curr === 'playing' && prev === 'lobby') {
      // Edge case: if somehow we skip versus
      audio.playBattle();
    }
  }, [game.phase]);

  return (
    <div className="app">
      <Header />

      <button
        className="mute-btn"
        onClick={audio.toggleMute}
        aria-label={audio.muted ? 'Unmute' : 'Mute'}
        title={audio.muted ? 'Unmute' : 'Mute'}
      >
        {audio.muted ? '\u{1F507}' : '\u{1F50A}'}
      </button>

      {!game.isConnected && game.phase === 'lobby' && (
        <div className="connection-status">Connecting to server...</div>
      )}

      {game.phase === 'lobby' && (
        <Lobby onJoin={game.joinGame} isConnected={game.isConnected} />
      )}

      {game.phase === 'waiting' && (
        <WaitingRoom onCancel={game.leaveGame} />
      )}

      {game.phase === 'versus' && game.gameState && (
        <VersusScreen
          gameState={game.gameState}
          myPlayerId={game.myPlayerId!}
        />
      )}

      {game.phase === 'playing' && game.gameState && (
        <GameBoard
          gameState={game.gameState}
          myPlayerId={game.myPlayerId!}
          isMyTurn={game.isMyTurn}
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
          onRematch={game.requestRematch}
          onPlayAgain={game.playAgain}
          onLeave={game.leaveGame}
        />
      )}
    </div>
  );
}

export default App;
