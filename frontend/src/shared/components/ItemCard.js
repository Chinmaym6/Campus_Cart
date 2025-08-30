import React from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "../utils/url";

export default function ItemCard({ item }) {
  const img = item?.cover_photo_url ? assetUrl(item.cover_photo_url) : null;

  return (
    <Link to={`/marketplace/${item.id}`} style={styles.card}>
      <div style={styles.thumb}>
        {img ? (
          <img src={img} alt={item.title} style={styles.img} />
        ) : (
          <div style={styles.placeholder}>No image</div>
        )}
      </div>
      <div style={styles.body}>
        <div style={styles.title} title={item.title}>{item.title}</div>
        <div style={styles.price}>₹{(item.price_cents / 100).toFixed(2)}</div>
      </div>
    </Link>
  );
}

const styles = {
  card: { display: "block", border: "1px solid #eee", borderRadius: 10, overflow: "hidden", textDecoration: "none", color: "inherit" },
  thumb: { width: "100%", aspectRatio: "1 / 1", background: "#f5f5f5" },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  placeholder: { width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#888", fontSize: 12 },
  body: { padding: 10 },
  title: { fontWeight: 600, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  price: { color: "#0b74de", fontWeight: 700 }
};
