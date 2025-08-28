import * as R from "./reports.repo.js";

export async function createReport(reporterId, body) {
  const payload = {
    target_type: body.target_type,
    target_id: Number(body.target_id),
    reason: body.reason.trim(),
    details: body.details?.trim() || null
  };
  return R.createReport(reporterId, payload);
}

export async function listMyReports(userId, page, pageSize) {
  return R.listReports({ reporterId: userId, page, pageSize });
}

export async function listAllReports(page, pageSize) {
  return R.listReports({ page, pageSize });
}

export async function resolveReport(id, resolverUserId) {
  return R.resolveReport(id, resolverUserId);
}
