// src/controllers/statsController.js
const pool = require('../config/database');

/**
 * Statistics Controller
 * Provides dashboard statistics for different user roles
 */

/**
 * Get admin statistics
 * Only for PLATFORM_ADMIN
 */
exports.getAdminStats = async (req, res) => {
  try {
    const { role } = req.user;

    // Check permission
    if (role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform admin only.'
      });
    }

    // Get total users count
    const usersResult = await pool.query(
      'SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL'
    );
    const totalUsers = parseInt(usersResult.rows[0].total);

    // Get active users count
    const activeUsersResult = await pool.query(
      'SELECT COUNT(*) as total FROM users WHERE is_active = true AND deleted_at IS NULL'
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].total);

    // Get users by role
    const usersByRoleResult = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE deleted_at IS NULL
      GROUP BY role
      ORDER BY role
    `);
    const usersByRole = usersByRoleResult.rows.map(row => ({
      role: row.role,
      count: parseInt(row.count)
    }));

    // Get total institutions
    const institutionsResult = await pool.query(
      'SELECT COUNT(*) as total FROM institutions WHERE deleted_at IS NULL'
    );
    const totalInstitutions = parseInt(institutionsResult.rows[0].total);

    // Get active institutions
    const activeInstitutionsResult = await pool.query(
      'SELECT COUNT(*) as total FROM institutions WHERE is_active = true AND deleted_at IS NULL'
    );
    const activeInstitutions = parseInt(activeInstitutionsResult.rows[0].total);

    // Get institutions by type
    const institutionsByTypeResult = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM institutions
      WHERE deleted_at IS NULL
      GROUP BY type
      ORDER BY type
    `);
    const institutionsByType = institutionsByTypeResult.rows.map(row => ({
      type: row.type,
      count: parseInt(row.count)
    }));

    // Get recent activity (last 10 users created)
    const recentUsersResult = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.created_at,
        i.name as institution_name
      FROM users u
      LEFT JOIN user_institutions ui ON u.id = ui.user_id AND ui.deleted_at IS NULL
      LEFT JOIN institutions i ON ui.institution_id = i.id AND i.deleted_at IS NULL
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    const recentUsers = recentUsersResult.rows;

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          byRole: usersByRole
        },
        institutions: {
          total: totalInstitutions,
          active: activeInstitutions,
          inactive: totalInstitutions - activeInstitutions,
          byType: institutionsByType
        },
        recentActivity: {
          recentUsers: recentUsers
        }
      }
    });

  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin statistics',
      error: error.message
    });
  }
};

/**
 * Get institution statistics
 * For INSTITUTION_ADMIN - their own institution only
 * For PLATFORM_ADMIN - any institution
 */
exports.getInstitutionStats = async (req, res) => {
  try {
    const { role, institutionIds } = req.user;
    const { institutionId } = req.params;

    // Check permission
    if (role === 'PLATFORM_ADMIN') {
      // Platform admin can view any institution
    } else if (role === 'INSTITUTION_ADMIN') {
      // Institution admin can only view their own institution
      if (!institutionIds.includes(parseInt(institutionId))) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own institution statistics.'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Get institution details
    const institutionResult = await pool.query(
      'SELECT * FROM institutions WHERE id = $1 AND deleted_at IS NULL',
      [institutionId]
    );

    if (institutionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    const institution = institutionResult.rows[0];

    // Get total users in this institution
    const usersResult = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      INNER JOIN user_institutions ui ON u.id = ui.user_id
      WHERE ui.institution_id = $1 
        AND u.deleted_at IS NULL 
        AND ui.deleted_at IS NULL
    `, [institutionId]);
    const totalUsers = parseInt(usersResult.rows[0].total);

    // Get active users
    const activeUsersResult = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      INNER JOIN user_institutions ui ON u.id = ui.user_id
      WHERE ui.institution_id = $1 
        AND u.is_active = true 
        AND u.deleted_at IS NULL 
        AND ui.deleted_at IS NULL
    `, [institutionId]);
    const activeUsers = parseInt(activeUsersResult.rows[0].total);

    // Get users by role in this institution
    const usersByRoleResult = await pool.query(`
      SELECT u.role, COUNT(DISTINCT u.id) as count
      FROM users u
      INNER JOIN user_institutions ui ON u.id = ui.user_id
      WHERE ui.institution_id = $1 
        AND u.deleted_at IS NULL 
        AND ui.deleted_at IS NULL
      GROUP BY u.role
      ORDER BY u.role
    `, [institutionId]);
    const usersByRole = usersByRoleResult.rows.map(row => ({
      role: row.role,
      count: parseInt(row.count)
    }));

    // Get recent users from this institution
    const recentUsersResult = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.created_at,
        u.is_active
      FROM users u
      INNER JOIN user_institutions ui ON u.id = ui.user_id
      WHERE ui.institution_id = $1 
        AND u.deleted_at IS NULL 
        AND ui.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT 10
    `, [institutionId]);
    const recentUsers = recentUsersResult.rows;

    res.json({
      success: true,
      data: {
        institution: {
          id: institution.id,
          name: institution.name,
          type: institution.type,
          sector: institution.sector,
          isActive: institution.is_active
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          byRole: usersByRole
        },
        recentActivity: {
          recentUsers: recentUsers
        }
      }
    });

  } catch (error) {
    console.error('Error getting institution stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get institution statistics',
      error: error.message
    });
  }
};

module.exports = exports;
