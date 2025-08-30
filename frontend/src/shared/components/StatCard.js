import React from "react";

export default function StatCard({ title, value }) {
  return (
    <div style={styles.card}>
      <h4 style={styles.value}>{value}</h4>
      <p style={styles.title}>{title}</p>
    </div>
  );
}

const styles = {
  card: {
    flex: "1 1 120px",
    background: "#fff",
    padding: "1rem",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    textAlign: "center"
  },
  value: { fontSize: "1.8rem", margin: 0, color: "#0b74de" },
  title: { margin: 0, color: "#555" }
};
