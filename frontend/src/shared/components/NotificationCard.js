import React from "react";

export default function NotificationCard({ notif }) {
  return (
    <div style={styles.card}>
      <h4>{notif.title}</h4>
      <p>{notif.body}</p>
      <small>{new Date(notif.created_at).toLocaleString()}</small>
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: 10,
    padding: "1rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
  }
};
