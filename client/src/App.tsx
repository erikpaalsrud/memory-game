import { useGame } from './hooks/useGame';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { WaitingRoom } from './components/WaitingRoom';
import { VersusScreen } from './components/VersusScreen';
import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import './styles/card.css';

function App() {
  const game = useGame();

  return (
    <div className="app">
      <Header />

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
