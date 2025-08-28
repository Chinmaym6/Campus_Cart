import bcrypt from "bcryptjs";
export async function hashPassword(plain, rounds = 10) {
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(plain, salt);
}
export async function verifyPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}
