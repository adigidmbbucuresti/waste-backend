import express from 'express';
import {
  getAllUsers,
  getUsersByInstitution,
  createUser,
  updateUser,
  deleteUser,
  assignUserToInstitution,
  removeUserFromInstitution
} from '../controllers/userController.js';
import { authenticateToken, requireRole, requireInstitutionRole } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// PLATFORM ADMIN ROUTES
// ============================================

/**
 * GET /api/users
 * Get all users (Platform Admin only)
 */
router.get(
  '/',
  authenticateToken,
  requireRole(['PLATFORM_ADMIN']),
  getAllUsers
);

/**
 * POST /api/users
 * Create new user (Platform Admin or Institution Admin)
 */
router.post(
  '/',
  authenticateToken,
  createUser
);

/**
 * PUT /api/users/:userId
 * Update user (Platform Admin or Institution Admin)
 */
router.put(
  '/:userId',
  authenticateToken,
  updateUser
);

/**
 * DELETE /api/users/:userId
 * Delete user (Platform Admin only)
 */
router.delete(
  '/:userId',
  authenticateToken,
  requireRole(['PLATFORM_ADMIN']),
  deleteUser
);

// ============================================
// INSTITUTION-SPECIFIC ROUTES
// ============================================

/**
 * GET /api/users/institution/:institutionId
 * Get users by institution
 */
router.get(
  '/institution/:institutionId',
  authenticateToken,
  getUsersByInstitution
);

/**
 * POST /api/users/:userId/institution
 * Assign user to institution
 */
router.post(
  '/:userId/institution',
  authenticateToken,
  requireRole(['PLATFORM_ADMIN']),
  assignUserToInstitution
);

/**
 * DELETE /api/users/:userId/institution/:institutionId
 * Remove user from institution
 */
router.delete(
  '/:userId/institution/:institutionId',
  authenticateToken,
  requireRole(['PLATFORM_ADMIN']),
  removeUserFromInstitution
);

export default router;
