import React, { useEffect, useState } from "react";
import api from "../../../api/axios";
import { endpoints } from "../../../api/endpoints";
import { useNavigate } from "react-router-dom";

export default function CreateItem() {
  const nav = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", category_id: "", condition: "good",
    price_cents: "", is_negotiable: true, latitude: "", longitude: ""
  });
  const [photos, setPhotos] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get(endpoints.categories.list).then(({data}) => setCategories(data.categories || []));
  }, []);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => {
      if (v !== "" && v !== null && v !== undefined) fd.append(k, v);
    });
    photos.forEach(f => fd.append("photos", f));

    try {
      const { data } = await api.post(endpoints.items.create, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      nav(`/marketplace/${data.item.id}`);
    } catch (e) {
      const apiErr = e?.response?.data;
      if (apiErr?.details?.length) setErr(apiErr.details.map(d=>d.message).join(" · "));
      else setErr(apiErr?.error || "Failed to create item");
    }
  }

  return (
    <main style={{ padding: "1.5rem" }}>
      <h2>Sell an Item</h2>
      <form onSubmit={onSubmit} style={styles.form}>
        <input name="title" placeholder="Title" value={form.title} onChange={onChange} required />
        <textarea name="description" placeholder="Description" value={form.description} onChange={onChange} rows={4} />
        <select name="category_id" value={form.category_id} onChange={onChange} required>
          <option value="">Select category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="condition" value={form.condition} onChange={onChange}>
          <option value="new">New</option>
          <option value="like_new">Like new</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
        <input name="price_cents" type="number" placeholder="Price (₹)" value={form.price_cents} onChange={onChange} required />
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="is_negotiable" checked={form.is_negotiable} onChange={onChange} /> Negotiable
        </label>

        <label>Photos (up to 8)
          <input type="file" multiple accept="image/*" onChange={e => setPhotos([...e.target.files])} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input name="latitude" placeholder="Lat (optional)" value={form.latitude} onChange={onChange} />
          <input name="longitude" placeholder="Lon (optional)" value={form.longitude} onChange={onChange} />
        </div>

        <button type="submit" style={styles.btn}>Create</button>
      </form>
      {err && <p style={{ color: "red" }}>{err}</p>}
    </main>
  );
}

const styles = {
  form: { display: "grid", gap: 12, maxWidth: 540 },
  btn: { padding: "10px 14px", borderRadius: 8, border: "none", background: "#0b74de", color: "#fff", cursor: "pointer", width: 160 }
};
