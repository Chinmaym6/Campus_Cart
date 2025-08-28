import * as R from "./transactions.repo.js";

export async function getTransaction({ id, userId }) {
  const tx = await R.getTransaction(id);
  if (!tx) { const e=new Error("Transaction not found"); e.status=404; throw e; }
  if (tx.seller_id !== userId && tx.buyer_id !== userId) { const e=new Error("Forbidden"); e.status=403; throw e; }
  return tx;
}

export async function completeTransaction({ id, userId, metAt, locationNote }) {
  const tx = await R.getTransaction(id);
  if (!tx) { const e=new Error("Transaction not found"); e.status=404; throw e; }
  if (tx.seller_id !== userId && tx.buyer_id !== userId) { const e=new Error("Forbidden"); e.status=403; throw e; }
  if (tx.status !== "pending") { const e=new Error("Only pending transactions can be completed"); e.status=400; throw e; }
  return R.completeTransaction(id, { metAt, locationNote, itemId: tx.item_id });
}

export async function cancelTransaction({ id, userId }) {
  const tx = await R.getTransaction(id);
  if (!tx) { const e=new Error("Transaction not found"); e.status=404; throw e; }
  if (tx.seller_id !== userId && tx.buyer_id !== userId) { const e=new Error("Forbidden"); e.status=403; throw e; }
  if (tx.status !== "pending") { const e=new Error("Only pending transactions can be canceled"); e.status=400; throw e; }
  return R.cancelTransaction(id, { itemId: tx.item_id });
}
