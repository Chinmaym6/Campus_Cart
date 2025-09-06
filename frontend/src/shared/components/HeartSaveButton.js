import React, { useState } from "react";
import api from "../../api/axios";
import { endpoints } from "../../api/endpoints";

export default function HeartSaveButton({ itemId, initialSaved = false, onChange }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialSaved);

  async function toggle() {
    if (saving) return;
    setSaving(true);
    try {
      if (!saved) {
        await api.post(endpoints.items.save(itemId));
        setSaved(true);
        onChange?.(true);
      } else {
        await api.delete(endpoints.items.unsave(itemId));
        setSaved(false);
        onChange?.(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Unsave" : "Save"}
      title={saved ? "Unsave" : "Save"}
      style={{
        position: "absolute",
        top: 8, right: 8,
        width: 36, height: 36,
        borderRadius: "50%",
        border: "none",
        background: "rgba(255,255,255,0.9)",
        boxShadow: "0 1px 6px rgba(0,0,0,.15)",
        cursor: saving ? "not-allowed" : "pointer",
        display: "grid",
        placeItems: "center",
      }}
      disabled={saving}
    >
      <span style={{ fontSize: 18, color: saved ? "#ef4444" : "#6b7280" }}>
        {saved ? "♥" : "♡"}
      </span>
    </button>
  );
}
