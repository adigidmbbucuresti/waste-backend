import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';

// ============================================
// MIDDLEWARE DE AUTENTIFICARE
// ============================================

export const authenticateToken = async (req, res, next) => {
  try {
    // Extrage token din header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de autentificare lipsește'
      });
    }

    // Verifică token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Caută utilizatorul în baza de date
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        institutions: {
          include: {
            institution: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Utilizator invalid sau inactiv'
      });
    }

    // Atașează user la request
    req.user = {
      id: user.id,
      email: user.email,
      globalRole: user.globalRole,
      institutions: user.institutions.map(ui => ({
        id: ui.institution.id,
        name: ui.institution.name,
        type: ui.institution.type,
        role: ui.institutionRole
      }))
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Token invalid'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token expirat'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Eroare la autentificare'
    });
  }
};

// ============================================
// MIDDLEWARE DE AUTORIZARE PE BAZĂ DE ROL
// ============================================

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Neautentificat'
      });
    }

    const hasRole = allowedRoles.includes(req.user.globalRole);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea necesară',
        required: allowedRoles,
        current: req.user.globalRole
      });
    }

    next();
  };
};

// ============================================
// MIDDLEWARE DE AUTORIZARE PE INSTITUȚIE
// ============================================

export const requireInstitutionRole = (allowedRoles, institutionIdParam = 'institutionId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Neautentificat'
      });
    }

    // PLATFORM_ADMIN poate accesa orice
    if (req.user.globalRole === 'PLATFORM_ADMIN') {
      return next();
    }

    const institutionId = req.params[institutionIdParam] || req.body[institutionIdParam];

    if (!institutionId) {
      return res.status(400).json({
        success: false,
        message: 'ID instituție lipsește'
      });
    }

    // Verifică dacă user face parte din instituție cu rol corespunzător
    const userInstitution = req.user.institutions.find(
      inst => inst.id === institutionId
    );

    if (!userInstitution) {
      return res.status(403).json({
        success: false,
        message: 'Nu faci parte din această instituție'
      });
    }

    const hasRole = allowedRoles.includes(userInstitution.role);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea necesară pentru această instituție',
        required: allowedRoles,
        current: userInstitution.role
      });
    }

    next();
  };
};
