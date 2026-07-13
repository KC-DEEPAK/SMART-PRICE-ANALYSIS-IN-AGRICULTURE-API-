/**
 * AlertCard — displays a single saved price alert card.
 *
 * Props:
 *   alert    (object) — the alert data { id, crop, target_price, notification_enabled, email, user_name }
 *   onDelete (fn)     — called with alert.id when user clicks delete
 */
function AlertCard({ alert, onDelete }) {
  return (
    <div className="alert-card">
      {/* -- Header row: Crop name + badge -- */}
      <div className="alert-card__header">
        <span className="alert-card__crop">🌾 {alert.crop}</span>
        <span className={`alert-card__badge ${alert.notification_enabled ? "badge--on" : "badge--off"}`}>
          {alert.notification_enabled ? "🔔 Notifications ON" : "🔕 Notifications OFF"}
        </span>
      </div>

      {/* -- Detail rows -- */}
      <div className="alert-card__details">
        <div className="alert-card__row">
          <span className="alert-card__label">Target Price</span>
          <span className="alert-card__value">₹{alert.target_price.toLocaleString("en-IN")}</span>
        </div>
        <div className="alert-card__row">
          <span className="alert-card__label">Notify</span>
          <span className="alert-card__value">{alert.email}</span>
        </div>
        <div className="alert-card__row">
          <span className="alert-card__label">User</span>
          <span className="alert-card__value">{alert.user_name}</span>
        </div>
      </div>

      {/* -- Delete button -- */}
      <button
        className="alert-card__delete"
        onClick={() => onDelete(alert.id)}
        title="Delete this alert"
      >
        🗑️ Remove Alert
      </button>
    </div>
  );
}

export default AlertCard;
