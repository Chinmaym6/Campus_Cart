import * as S from "./reports.service.js";

export async function createReport(req, res, next) {
  try {
    const report = await S.createReport(req.user.id, req.body);
    res.status(201).json({ report });
  } catch (e) { next(e); }
}

export async function listMyReports(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = await S.listMyReports(req.user.id, Number(page), Number(pageSize));
    res.json(result);
  } catch (e) { next(e); }
}

export async function listAllReports(req, res, next) {
  try {
    // TODO: in future check req.user.role === 'admin'
    const { page = 1, pageSize = 50 } = req.query;
    const result = await S.listAllReports(Number(page), Number(pageSize));
    res.json(result);
  } catch (e) { next(e); }
}

export async function resolveReport(req, res, next) {
  try {
    // TODO: in future check admin role
    const id = Number(req.params.id);
    const report = await S.resolveReport(id, req.user.id);
    res.json({ report });
  } catch (e) { next(e); }
}
