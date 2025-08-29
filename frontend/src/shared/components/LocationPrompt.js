import React, { useState } from "react";
import api from "../../api/axios";
import { endpoints } from "../../api/endpoints";

export default function LocationPrompt() {
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState(null); // null | "success" | "error"

  if (dismissed) return null;

  async function handleEnable() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          await api.post(endpoints.users.setLocation, {
            latitude,
            longitude,
            accuracy_m: accuracy
          });
          setStatus("success");
          setTimeout(() => setDismissed(true), 2000); // auto-hide
        } catch {
          setStatus("error");
        }
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <div style={styles.wrapper}>
      <p style={{ margin: 0, flex: 1 }}>
        📍 Share your location to see items & roommates near you.
      </p>
      {status === "success" ? (
        <span style={{ color: "green", marginLeft: 12 }}>Saved ✅</span>
      ) : status === "error" ? (
        <span style={{ color: "red", marginLeft: 12 }}>Failed ❌</span>
      ) : (
        <button style={styles.button} onClick={handleEnable}>
          Enable Location
        </button>
      )}
      <button style={styles.dismiss} onClick={() => setDismissed(true)}>✕</button>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#f0f4ff",
    border: "1px solid #c7d2fe",
    padding: "10px 16px",
    borderRadius: 8,
    margin: "12px auto",
    maxWidth: 600
  },
  button: {
    background: "#0b74de",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer"
  },
  dismiss: {
    background: "transparent",
    border: "none",
    fontSize: 18,
    marginLeft: 8,
    cursor: "pointer",
    color: "#555"
  }
};
