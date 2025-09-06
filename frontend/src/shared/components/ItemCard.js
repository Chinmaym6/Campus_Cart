import React from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "../utils/url";
import HeartSaveButton from "./HeartSaveButton";
export default function ItemCard({ item }) {
  const img = item?.cover_photo_url ? assetUrl(item.cover_photo_url) : null;

  return (
    <Link to={`/marketplace/${item.id}`} style={styles.card}>
      <div style={styles.thumbWrapper}>
      <div style={styles.thumb}>
        {img ? (
          <img src={img} alt={item.title} style={styles.img} />
        ) : (
          <div style={styles.placeholder}>No image</div>
        )}
      </div>

      <HeartSaveButton itemId={item.id} initialSaved={item.is_saved} />
      </div>

      <div style={styles.body}>
        <div style={styles.title} title={item.title}>{item.title}</div>
        <div style={styles.price}>₹{(item.price_cents / 100).toFixed(2)}</div>
      </div>
    </Link>
  );
}

const styles = {
  card: {
    display: "block",
    textDecoration: "none",
    color: "inherit",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    transition: "transform .12s ease, box-shadow .12s ease",
  },
  thumbWrapper: { position: "relative" },
  thumb: { width: "100%", height: 200, overflow: "hidden", background: "#f3f4f6" },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  placeholder: { width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#9ca3af", fontSize: 12 },
  body: { padding: 12 },
  title: {
    fontWeight: 600, marginBottom: 6, lineHeight: 1.2,
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  price: { color: "#0b74de", fontWeight: 700 }
};