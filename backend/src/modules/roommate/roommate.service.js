import * as R from "./roommate.repo.js";

export function computeCompatibility(viewer, target, meters = null) {
  const W = { lifestyle: 45, practical: 40, preferences: 15 };
  let lifestyle = 0, practical = 0, prefs = 0;

  const L = { each: 9 }; // 5 signals * 9 = 45
  const diff01 = (a,b)=> (a==null || b==null) ? 0.5 : Math.min(1, Math.abs(a-b)/4);
  const clean = 1 - diff01(viewer?.cleanliness_level, target.cleanliness_level);
  const noise = 1 - diff01(viewer?.noise_tolerance, target.noise_tolerance);
  const guests= 1 - diff01(viewer?.guests_level, target.guests_level);
  const social= 1 - diff01(viewer?.social_level, target.social_level);
  const sleepMatch = (() => {
    const a = viewer?.sleep, b = target.sleep;
    if (!a || !b) return 0.6;
    if (a === "flexible" || b === "flexible") return 0.9;
    return a === b ? 1 : 0.4;
  })();
  lifestyle = L.each * (clean + noise + guests + social + sleepMatch);

  const P = { budget: 18, movein: 10, distance: 12 };
  const overlap = (() => {
    const aMin = viewer?.budget_min_cents, aMax = viewer?.budget_max_cents;
    const bMin = target.budget_min_cents, bMax = target.budget_max_cents;
    if ([aMin,aMax,bMin,bMax].some(v=>v==null)) return 0.6;
    const lo = Math.max(aMin, bMin), hi = Math.min(aMax, bMax);
    if (hi <= lo) return 0;
    const range = Math.max(aMax - aMin, bMax - bMin, 1);
    return Math.min(1, (hi - lo) / range);
  })();
  const moveIn = (() => {
    const a = viewer?.move_in_date ? new Date(viewer.move_in_date) : null;
    const b = target.move_in_date ? new Date(target.move_in_date) : null;
    if (!a || !b) return 0.6;
    const delta = Math.abs(a - b) / (1000*3600*24);
    if (delta <= 15) return 1;
    if (delta <= 45) return 0.8;
    if (delta <= 90) return 0.5;
    return 0.2;
  })();
  const distance = (() => {
    if (meters==null) return 0.6;
    if (meters <= 500) return 1;
    if (meters <= 2000) return 0.9;
    if (meters <= 5000) return 0.8;
    if (meters <= 10000) return 0.6;
    if (meters <= 20000) return 0.4;
    return 0.25;
  })();
  practical = (overlap * P.budget) + (moveIn * P.movein) + (distance * P.distance);

  const prefBool = (a, b) => (a==null || b==null) ? 0.7 : (a === b ? 1 : 0.25);
  const smoking = prefBool(viewer?.smoking, target.smoking);
  const pets    = prefBool(viewer?.pets, target.pets);
  const alcohol = prefBool(viewer?.alcohol, target.alcohol);
  const gender  = (() => {
    const g = target.gender_pref || "any";
    if (g === "any") return 1;
    if (!viewer?.gender_pref) return 0.8;
    return viewer.gender_pref === "any" || viewer.gender_pref === g ? 1 : 0.4;
  })();
  prefs = (smoking + pets + alcohol + gender) / 4 * W.preferences;

  const score = Math.round(lifestyle + practical + prefs);
  return {
    score_percent: Math.max(0, Math.min(100, score)),
    breakdown: {
      lifestyle: Math.round(lifestyle),
      practical: Math.round(practical),
      preferences: Math.round(prefs),
      details: {
        cleanliness: clean, noise, guests, sleepMatch, social,
        budget_overlap: overlap, move_in_alignment: moveIn, distance_factor: distance
      }
    }
  };
}

const num = (v)=>Number.isFinite(Number(v)) ? Number(v) : null;
const bool = (v)=> (v===undefined || v===null) ? null : (String(v).toLowerCase() === "true");

export async function createPost(userId, body) {
  const payload = {
    title: body.title?.trim(),
    description: body.description?.trim() || null,
    budget_min_cents: num(body.budget_min_cents),
    budget_max_cents: num(body.budget_max_cents),
    preferred_lat: body.preferred_lat != null ? Number(body.preferred_lat) : null,
    preferred_lon: body.preferred_lon != null ? Number(body.preferred_lon) : null,
    move_in_date: body.move_in_date || null,
    lease_months: body.lease_months != null ? Number(body.lease_months) : null,
    housing: body.housing || "apartment",
    gender_pref: body.gender_pref || "any",
    cleanliness_level: body.cleanliness_level != null ? Number(body.cleanliness_level) : null,
    noise_tolerance: body.noise_tolerance != null ? Number(body.noise_tolerance) : null,
    guests_level: body.guests_level != null ? Number(body.guests_level) : null,
    sleep: body.sleep || "flexible",
    study_style: body.study_style || null,
    social_level: body.social_level != null ? Number(body.social_level) : null,
    smoking: bool(body.smoking),
    pets: bool(body.pets),
    alcohol: bool(body.alcohol),
  };
  if (!payload.title) { const e=new Error("title is required"); e.status=400; throw e; }
  return R.createPost(userId, payload);
}

export async function updatePost(userId, id, body) {
  const own = await R.getPostById(id);
  if (!own) { const e=new Error("Post not found"); e.status=404; throw e; }
  if (own.user_id !== userId) { const e=new Error("Forbidden"); e.status=403; throw e; }

  const patch = {};
  [
    "title","description","budget_min_cents","budget_max_cents","preferred_lat","preferred_lon",
    "move_in_date","lease_months","housing","gender_pref","cleanliness_level","noise_tolerance",
    "guests_level","sleep","study_style","social_level","smoking","pets","alcohol"
  ].forEach(k=>{ if (body[k] !== undefined) patch[k] = body[k]; });

  const updated = await R.updatePost(id, patch);
  await R.deleteCachedMatchesForPost(id);
  return updated;
}

export async function deletePost(userId, id) {
  const own = await R.getPostById(id);
  if (!own) { const e=new Error("Post not found"); e.status=404; throw e; }
  if (own.user_id !== userId) { const e=new Error("Forbidden"); e.status=403; throw e; }
  await R.deletePost(id);
  await R.deleteCachedMatchesForPost(id);
}

export async function getPostById(id) {
  return R.getPostById(id);
}

export async function searchPosts(q) {
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(q.pageSize) || 20));
  const filters = {
    q: q.q?.trim() || null,
    budgetMin: q.budgetMin ? Number(q.budgetMin) : null,
    budgetMax: q.budgetMax ? Number(q.budgetMax) : null,
    fromDate: q.fromDate || null,
    toDate: q.toDate || null,
    housing: q.housing || null,
    gender: q.gender || null,
    lat: q.lat ? Number(q.lat) : null,
    lon: q.lon ? Number(q.lon) : null,
    radiusKm: q.radiusKm ? Number(q.radiusKm) : null,
    sort: q.sort || "newest"
  };
  return R.searchPosts(filters, { page, pageSize });
}

export async function getCompatibilityForPost({ viewerId, postId }) {
  const viewer = await R.getLatestPostForUser(viewerId);
  if (!viewer) { const e=new Error("Create your roommate post first to compute compatibility"); e.status=400; throw e; }
  const target = await R.getPostById(postId);
  if (!target) { const e=new Error("Post not found"); e.status=404; throw e; }

  const meters = await R.getDistanceMeters(viewer, target);
  const { score_percent, breakdown } = computeCompatibility(viewer, target, meters);

  await R.upsertMatch(viewerId, postId, score_percent, breakdown);
  return { score_percent, breakdown, cached: true };
}

export async function listTopMatchesForMe({ viewerId, min, page, pageSize }) {
  const me = await R.getLatestPostForUser(viewerId);
  if (!me) { const e=new Error("Create your roommate post first to see matches"); e.status=400; throw e; }
  const { rows, total } = await R.listCachedMatches(viewerId, min, { page, pageSize });
  return { matches: rows, page, pageSize, total };
}
