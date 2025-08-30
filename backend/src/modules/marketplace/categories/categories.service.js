import * as repo from "./categories.repo.js";

const DEFAULT_CATEGORIES = [
  { name: "Textbooks", slug: "textbooks" },
  { name: "Electronics", slug: "electronics" },
  { name: "Furniture", slug: "furniture" },
  { name: "Clothing", slug: "clothing" },
  { name: "Bikes", slug: "bikes" },
  { name: "Dorm Essentials", slug: "dorm-essentials" },
];

export async function seedDefaults() {
  await repo.ensureSeed(DEFAULT_CATEGORIES);
}

export async function list() {
  return repo.list();
}
