import React, { useEffect, useState } from "react";
import api from "../../../api/axios";
import { endpoints } from "../../../api/endpoints";
import ItemCard from "../../../shared/components/ItemCard";

export default function MyListings() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setErr("");
    try {
      const { data } = await api.get(endpoints.items.mine + "?sort=active");
      setItems(data.items || []);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load my listings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(it) {
    const newStatus = it.status === "active" ? "draft" : "active";
    try {
      await api.patch(endpoints.items.update(it.id), { status: newStatus });
      setItems(prev => prev.map(x => x.id === it.id ? { ...x, status: newStatus } : x));
    } catch (e) {
      alert(e?.response?.data?.error || "Update failed");
    }
  }

  async function remove(it) {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await api.delete(endpoints.items.remove(it.id));
      setItems(prev => prev.filter(x => x.id !== it.id));
    } catch (e) {
      alert(e?.response?.data?.error || "Delete failed");
    }
  }

  return (
    <main style={{ padding: "1.5rem" }}>
      <h2>My Listings</h2>
      <p style={{ color: "#6b7280" }}>Manage your items. Toggle active or delete.</p>

      {loading ? <p>Loading…</p> : err ? <p style={{ color: "red" }}>{err}</p> : (
        <div style={styles.grid}>
          {items.map(it => (
            <div key={it.id} style={{ position: "relative" }}>
              <ItemCard item={it} />
              <div style={styles.actions}>
                <button onClick={() => toggleActive(it)} style={styles.btnSm}>
                  {it.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => remove(it)} style={styles.btnDanger}>Delete</button>
              </div>
            </div>
          ))}
          {!items.length && <p>No listings yet.</p>}
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
  },
  actions: { display: "flex", gap: 8, marginTop: 8 },
  btnSm: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer"
  },
  btnDanger: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ef4444",
    background: "#fff",
    color: "#ef4444",
    cursor: "pointer"
  }
};
