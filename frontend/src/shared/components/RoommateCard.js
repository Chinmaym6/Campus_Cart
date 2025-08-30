import React from "react";
import { Link } from "react-router-dom";

export default function RoommateCard({ post }) {
  return (
    <Link to={`/roommate/${post.id}`} style={styles.card}>
      <h4>{post.title}</h4>
      <p>Budget: ₹{post.budget_min_cents/100} - ₹{post.budget_max_cents/100}</p>
      <p>Compatibility: {post.score_percent || 70}%</p>
    </Link>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: 10,
    padding: "1rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    textDecoration: "none",
    color: "inherit"
  }
};
