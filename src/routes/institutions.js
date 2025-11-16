// src/routes/institutions.js
const express = require('express');
const router = express.Router();
const institutionController = require('../controllers/institutionController');
const { authenticate } = require('../middleware/auth');

/**
 * Institution Routes
 * 
 * Permissions:
 * - PLATFORM_ADMIN: Full access to all institutions
 * - INSTITUTION_ADMIN: Read-only access to their own institution
 * - Others: No access
 */

// Get all institutions (PLATFORM_ADMIN only)
router.get('/', 
  authenticate,
  institutionController.getAllInstitutions
);

// Get single institution by ID
router.get('/:id',
  authenticate,
  institutionController.getInstitutionById
);

// Create new institution (PLATFORM_ADMIN only)
router.post('/',
  authenticate,
  institutionController.createInstitution
);

// Update institution (PLATFORM_ADMIN only)
router.put('/:id',
  authenticate,
  institutionController.updateInstitution
);

// Toggle institution active status (PLATFORM_ADMIN only)
router.patch('/:id/toggle-active',
  authenticate,
  institutionController.toggleInstitutionActive
);

// Delete institution (PLATFORM_ADMIN only)
router.delete('/:id',
  authenticate,
  institutionController.deleteInstitution
);

// Get users from specific institution
router.get('/:id/users',
  authenticate,
  institutionController.getInstitutionUsers
);

module.exports = router;
