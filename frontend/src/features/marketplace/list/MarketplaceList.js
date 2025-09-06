import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../../api/axios";
import { endpoints } from "../../../api/endpoints";
import ItemCard from "../../../shared/components/ItemCard";

export default function MarketplaceList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // local controlled inputs (debounced for q)
  const [qInput, setQInput] = useState(searchParams.get("q") || "");
  const debounceRef = useRef();

  const qs = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(endpoints.categories.list);
        setCats(data.categories || []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    setLoading(true); setErr("");
    (async () => {
      try {
        const { data } = await api.get(endpoints.items.list + "?" + searchParams.toString());
        setItems(data.items || []);
      } catch (e) {
        setErr(e?.response?.data?.error || "Failed to load items");
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  // handlers
  function updateParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v === "" || v == null) p.delete(k);
    else p.set(k, v);
    setSearchParams(p);
  }

  function onSubmit(e) {
    e.preventDefault();
    updateParam("q", qInput.trim());
  }

  function clearAll() {
    setSearchParams(new URLSearchParams());
    setQInput("");
  }

  // debounce q on typing (optional)
  function onQChange(v) {
    setQInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", v.trim()), 400);
  }

  return (
    <main style={{ padding: "1.5rem" }}>
      <h2 style={{ marginBottom: 12 }}>Marketplace</h2>

      {/* Filters */}
      <form onSubmit={onSubmit} style={styles.filters}>
        <input
          placeholder="Search items…"
          value={qInput}
          onChange={e => onQChange(e.target.value)}
          style={styles.input}
        />

        <select
          value={qs.category_id || ""}
          onChange={e => updateParam("category_id", e.target.value)}
          style={styles.select}
        >
          <option value="">All Categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={qs.condition || ""}
          onChange={e => updateParam("condition", e.target.value)}
          style={styles.select}
        >
          <option value="">Any condition</option>
          <option value="new">New</option>
          <option value="like_new">Like new</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>

        <input
          type="number" min="0" placeholder="Min ₹"
          value={qs.min_price || ""}
          onChange={e => updateParam("min_price", e.target.value)}
          style={styles.inputSmall}
        />
        <input
          type="number" min="0" placeholder="Max ₹"
          value={qs.max_price || ""}
          onChange={e => updateParam("max_price", e.target.value)}
          style={styles.inputSmall}
        />

        <input
          type="number" min="1" placeholder="Within km"
          value={qs.within_km || ""}
          onChange={e => updateParam("within_km", e.target.value)}
          style={styles.inputSmall}
          title="Distance filter (requires you to have shared location)"
        />

        <select
          value={qs.sort || "new"}
          onChange={e => updateParam("sort", e.target.value)}
          style={styles.select}
        >
          <option value="new">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="distance">Nearest</option>
        </select>

        <button type="submit" style={styles.btn}>Apply</button>
        <button type="button" onClick={clearAll} style={styles.btnOutline}>Clear</button>
      </form>

      {/* Results */}
      {loading ? <p>Loading…</p> : err ? <p style={{ color: "red" }}>{err}</p> : (
        <div style={styles.grid}>
          {items.map(it => <ItemCard key={it.id} item={it} />)}
          {!items.length && <p>No results.</p>}
        </div>
      )}
    </main>
  );
}

const styles = {
  filters: {
    display: "grid",
    gridTemplateColumns: "1fr 160px 160px 120px 120px 120px 140px 100px 100px",
    gap: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  input: { padding: 10, border: "1px solid #d1d5db", borderRadius: 8 },
  inputSmall: { padding: 10, border: "1px solid #d1d5db", borderRadius: 8, width: "100%" },
  select: { padding: 10, border: "1px solid #d1d5db", borderRadius: 8, background: "#fff" },
  btn: {
    padding: "10px 14px", borderRadius: 8, border: "none", background: "#0b74de", color: "#fff", fontWeight: 600, cursor: "pointer"
  },
  btnOutline: {
    padding: "10px 14px", borderRadius: 8, border: "2px solid #0b74de", background: "#fff", color: "#0b74de", fontWeight: 600, cursor: "pointer"
  },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    alignItems: "start",
  },
};
