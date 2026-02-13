interface Props {
  onCancel: () => void;
}

export function WaitingRoom({ onCancel }: Props) {
  return (
    <div className="waiting-room">
      <div className="waiting-card">
        <div className="spinner" />
        <h2>Searching for opponent...</h2>
        <p>Waiting for another player to join</p>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
