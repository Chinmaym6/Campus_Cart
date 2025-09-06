import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/axios";
import { endpoints } from "../../../api/endpoints";
import { assetUrl } from "../../../shared/utils/url";
import HeartSaveButton from "../../../shared/components/HeartSaveButton";

export default function ItemDetails() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");
  const [showOffer, setShowOffer] = useState(false);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(endpoints.items.details(id));
        setItem(data.item);
      } catch (e) {
        setErr(e?.response?.data?.error || "Failed to load");
      }
    })();
  }, [id]);

  async function submitOffer(e) {
    e.preventDefault();
    try {
      const payload = {
        item_id: Number(id),
        amount_cents: Math.round(Number(amount || 0) * 100),
        message: msg || undefined
      };
      await api.post(endpoints.offers.create, payload);
      alert("Offer sent!");
      setShowOffer(false);
      setAmount(""); setMsg("");
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to send offer");
    }
  }

  if (err) return <p style={{ color: "red", padding: 16 }}>{err}</p>;
  if (!item) return <p style={{ padding: 16 }}>Loading…</p>;

  return (
    <main style={{ padding: 16 }}>
      <h2>{item.title}</h2>
      <p>₹{(item.price_cents / 100).toFixed(2)}</p>

      <div style={{ position: "relative", marginBottom: 12 }}>
        {item.photos?.[0] ? (
          <div style={{ width: "100%", height: 320, overflow: "hidden", borderRadius: 12, background: "#f3f4f6" }}>
            <img src={assetUrl(item.photos[0])} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ width: "100%", height: 320, borderRadius: 12, background: "#f3f4f6" }} />
        )}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <HeartSaveButton itemId={item.id} initialSaved={item.is_saved} />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
        {(item.photos || []).slice(1).map((p, i) => (
          <div key={i} style={{ width: "100%", height: 140, background: "#f3f4f6", overflow: "hidden", borderRadius: 8 }}>
            <img src={assetUrl(p)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ))}
      </div>

      <p style={{ marginTop: 12 }}>{item.description}</p>
      <p>Condition: {item.condition}</p>
      <p>Seller: {item.seller?.first_name} {item.seller?.last_name}</p>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button style={btn} onClick={() => setShowOffer(true)}>Make Offer</button>
        {/* You can add "Message Seller" later when sockets are enabled */}
      </div>

      {showOffer && (
        <div style={modal.backdrop} onClick={() => setShowOffer(false)}>
          <div style={modal.card} onClick={(e) => e.stopPropagation()}>
            <h3>Make an Offer</h3>
            <form onSubmit={submitOffer}>
              <div style={{ marginTop: 8 }}>
                <label>Offer amount (₹)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={input}
                  required
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <label>Message (optional)</label>
                <textarea value={msg} onChange={e => setMsg(e.target.value)} style={{ ...input, height: 100 }} />
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowOffer(false)} style={btnGhost}>Cancel</button>
                <button type="submit" style={btn}>Send Offer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const btn = { padding: "10px 14px", borderRadius: 8, border: "none", background: "#0b74de", color: "#fff", fontWeight: 600, cursor: "pointer" };
const btnGhost = { padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" };
const input = { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db" };

const modal = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 50 },
  card: { width: "min(520px, 92vw)", background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,.2)" }
};
