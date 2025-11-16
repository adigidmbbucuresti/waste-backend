// src/routes/stats.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticate } = require('../middleware/auth');

/**
 * Statistics Routes
 * 
 * Permissions:
 * - /admin: PLATFORM_ADMIN only
 * - /institution/:id: PLATFORM_ADMIN or INSTITUTION_ADMIN (own institution only)
 */

// Get admin statistics (PLATFORM_ADMIN only)
router.get('/admin',
  authenticate,
  statsController.getAdminStats
);

// Get institution statistics
router.get('/institution/:institutionId',
  authenticate,
  statsController.getInstitutionStats
);

module.exports = router;
