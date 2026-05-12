import type { Room } from '../types';

interface RoomCardProps {
  room: Room;
  onSelect: (room: Room) => void;
}

export function RoomCard({ room, onSelect }: RoomCardProps) {
  return (
    <button
      className={`room-card room-card--${room.tier}`}
      onClick={() => onSelect(room)}
      id={`room-${room.tier}`}
      aria-label={`Join ${room.name} room for ${room.fee} ETB`}
    >
      <div className="room-card__stripe" />
      <div className="room-card__players">
        <span className="room-card__players-dot" />
        {room.activePlayers} playing
      </div>
      <div className="room-card__content">
        <div className="room-card__icon">{room.icon}</div>
        <div className="room-card__info">
          <h3 className="room-card__title">{room.name}</h3>
          <p className="room-card__subtitle">{room.description}</p>
        </div>
        <div className="room-card__fee">
          <div className="room-card__fee-value">{room.fee}</div>
          <div className="room-card__fee-label">ETB</div>
        </div>
      </div>
    </button>
  );
}

/* ── Room Card Skeleton ───────────────────────────────────────── */
export function RoomCardSkeleton() {
  return (
    <div className="room-card" style={{ cursor: 'default' }}>
      <div className="room-card__content">
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '65%', height: 16, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '45%', height: 12 }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="skeleton" style={{ width: 36, height: 20, marginBottom: 4, marginLeft: 'auto' }} />
          <div className="skeleton" style={{ width: 24, height: 10, marginLeft: 'auto' }} />
        </div>
      </div>
    </div>
  );
}
