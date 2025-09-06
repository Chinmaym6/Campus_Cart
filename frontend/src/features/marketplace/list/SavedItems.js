import React, { useEffect, useState } from "react";
import api from "../../../api/axios";
import { endpoints } from "../../../api/endpoints";
import ItemCard from "../../../shared/components/ItemCard";

export default function SavedItems() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const { data } = await api.get(endpoints.items.saved);
        setItems(data.items || []);
      } catch (e) {
        setErr(e?.response?.data?.error || "Failed to load saved items");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main style={{ padding: "1.5rem" }}>
      <h2>Saved Items</h2>
      {loading ? <p>Loading…</p> : err ? <p style={{ color: "red" }}>{err}</p> : (
        <div style={styles.grid}>
          {items.map(it => <ItemCard key={it.id} item={it} />)}
          {!items.length && <p>No saved items yet.</p>}
        </div>
      )}
    </main>
  );
}

const styles = {
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    alignItems: "start",
    marginTop: 12
  }
};
