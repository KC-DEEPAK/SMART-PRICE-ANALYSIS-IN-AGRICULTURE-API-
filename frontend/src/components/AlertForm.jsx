import { useState, useEffect } from "react";
import { API_URL } from "../utils/api";

/**
 * AlertForm — lets the user select a crop, enter a target price,
 * and toggle email notification before saving a price alert.
 *
 * Props:
 *   onSave   (fn)      — called after a successful save with the saved alert object
 *   loading  (bool)    — whether parent is awaiting a network response
 *   setLoading (fn)    — lifts loading state to parent
 */
function AlertForm({ onSave, loading, setLoading }) {
  // Available crops fetched from the live price API
  const [crops, setCrops] = useState([]);
  const [crop, setCrop] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [validationError, setValidationError] = useState("");

  // Fetch crop list once from the live prices endpoint
  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        const unique = [
          ...new Set(
            data
              .map((d) => d.Commodity || d.commodity || d.Crop || d.crop_name)
              .filter(Boolean)
          ),
        ].sort();
        setCrops(unique);
      })
      .catch(() => setCrops([]));
  }, []);

  // --- Validation ---
  const validate = () => {
    if (!crop) return "Please select a crop.";
    if (!targetPrice || isNaN(targetPrice) || Number(targetPrice) <= 0)
      return "Please enter a valid target price greater than 0.";
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError("");
    // Lift the form data up to PriceAlertPage which owns the save logic
    onSave({ crop, target_price: Number(targetPrice), notification_enabled: notificationEnabled });
    // Reset form
    setCrop("");
    setTargetPrice("");
    setNotificationEnabled(true);
  };

  return (
    <form className="alert-form" onSubmit={handleSubmit} noValidate>
      <h3 className="alert-form__title">🔔 Set a New Price Alert</h3>

      {/* -- Crop Selector -- */}
      <div className="alert-form__group">
        <label className="alert-form__label">🌾 Select Crop</label>
        <select
          className="alert-form__select"
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          disabled={loading}
        >
          <option value="">— Choose a crop —</option>
          {crops.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* -- Target Price Input -- */}
      <div className="alert-form__group">
        <label className="alert-form__label">₹ Target Price (per quintal)</label>
        <input
          type="number"
          className="alert-form__input"
          placeholder="e.g. 3000"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          min="1"
          disabled={loading}
        />
      </div>

      {/* -- Notification Toggle -- */}
      <div className="alert-form__group alert-form__toggle-row">
        <span className="alert-form__label">📧 Email Notifications</span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={notificationEnabled}
            onChange={(e) => setNotificationEnabled(e.target.checked)}
            disabled={loading}
          />
          <span className="toggle-slider" />
        </label>
        <span className={`toggle-status ${notificationEnabled ? "enabled" : "disabled"}`}>
          {notificationEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {/* -- Validation Error -- */}
      {validationError && (
        <p className="alert-form__error">⚠️ {validationError}</p>
      )}

      {/* -- Submit Button -- */}
      <button
        type="submit"
        className="alert-form__btn"
        disabled={loading}
      >
        {loading ? "⏳ Saving..." : "💾 Save Alert"}
      </button>
    </form>
  );
}

export default AlertForm;
