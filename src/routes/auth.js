import express from 'express';
import { login, logout, getCurrentUser, refreshToken } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (fără autentificare)
// ============================================

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { user, accessToken, refreshToken }
 */
router.post('/login', login);

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Returns: { accessToken }
 */
router.post('/refresh', refreshToken);

// ============================================
// PROTECTED ROUTES (necesită autentificare)
// ============================================

/**
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 * Returns: { message }
 */
router.post('/logout', authenticateToken, logout);

/**
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 * Returns: { user }
 */
router.get('/me', authenticateToken, getCurrentUser);

export default router;
