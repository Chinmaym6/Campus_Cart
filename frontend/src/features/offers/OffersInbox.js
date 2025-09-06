import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { endpoints } from "../../api/endpoints";

export default function OffersInbox() {
  const [role, setRole] = useState("buyer");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load(r) {
    setLoading(true); setErr("");
    try {
      const { data } = await api.get(endpoints.offers.mine + `?role=${r}`);
      setRows(data.offers || []);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(role); }, [role]);

  async function accept(id) {
    if (!window.confirm("Accept this offer?")) return;
    try { await api.post(endpoints.offers.accept(id)); load(role); }
    catch (e) { alert(e?.response?.data?.error || "Failed"); }
  }
  async function reject(id) {
    if (!window.confirm("Reject this offer?")) return;
    try { await api.post(endpoints.offers.reject(id)); load(role); }
    catch (e) { alert(e?.response?.data?.error || "Failed"); }
  }
  async function withdraw(id) {
    if (!window.confirm("Withdraw this offer?")) return;
    try { await api.post(endpoints.offers.withdraw(id)); load(role); }
    catch (e) { alert(e?.response?.data?.error || "Failed"); }
  }

  return (
    <main style={{ padding: "1.5rem" }}>
      <h2>Offers</h2>

      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button onClick={() => setRole("buyer")} style={tab(role==="buyer")}>I’m Buyer</button>
        <button onClick={() => setRole("seller")} style={tab(role==="seller")}>I’m Seller</button>
      </div>

      {loading ? <p>Loading…</p> : err ? <p style={{ color: "red" }}>{err}</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Item</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Who</th>
                <th>When</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.title || r.item_id}</td>
                  <td>₹{(r.amount_cents/100).toFixed(2)}</td>
                  <td>{r.status}</td>
                  <td>
                    {role==="buyer"
                      ? `${r.seller_first_name || ""} ${r.seller_last_name || ""}`
                      : `${r.buyer_first_name || ""} ${r.buyer_last_name || ""}`}
                  </td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    {role==="seller" && r.status==="pending" && (
                      <>
                        <button onClick={() => accept(r.id)} style={btnSm}>Accept</button>{" "}
                        <button onClick={() => reject(r.id)} style={btnDanger}>Reject</button>
                      </>
                    )}
                    {role==="buyer" && r.status==="pending" && (
                      <button onClick={() => withdraw(r.id)} style={btnSm}>Withdraw</button>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "#6b7280" }}>No offers</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const tab = (active) => ({
  padding: "8px 12px", borderRadius: 8,
  border: active ? "2px solid #0b74de" : "1px solid #d1d5db",
  background: active ? "#e6f0fe" : "#fff",
  cursor: "pointer", fontWeight: 600
});
const table = { width: "100%", borderCollapse: "collapse" };
const btnSm = { padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" };
const btnDanger = { padding: "6px 10px", borderRadius: 8, border: "1px solid #ef4444", color: "#ef4444", background: "#fff", cursor: "pointer" };
