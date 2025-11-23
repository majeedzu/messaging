// Reusable auth middleware for API routes
import { getUserFromToken } from '../utils.js';

export async function requireAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token');
  }
  const token = authHeader.split(' ')[1];
  const user = await getUserFromToken(token);
  if (!user) {
    throw new Error('Unauthorized: Invalid token');
  }
  return user;
}