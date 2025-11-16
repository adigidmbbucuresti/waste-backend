import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// ============================================
// CONTROLLERS
// ============================================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validare input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email și parolă sunt obligatorii'
      });
    }

    // Caută utilizatorul
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        institutions: {
          include: {
            institution: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credențiale invalide'
      });
    }

    // Verifică dacă user e activ
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Contul este dezactivat'
      });
    }

    // Verifică parola
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credențiale invalide'
      });
    }

    // Generează tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Returnează datele utilizatorului (fără password)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.email.split('@')[0], // temporary
      globalRole: user.globalRole,
      institutions: user.institutions.map(ui => ({
        id: ui.institution.id,
        name: ui.institution.name,
        type: ui.institution.type,
        territoryLevel: ui.institution.territoryLevel,
        role: ui.institutionRole
      })),
      loginTime: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Autentificare reușită',
      data: {
        user: userData,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la autentificare'
    });
  }
};

export const logout = async (req, res) => {
  try {
    // În viitor, aici poți invalida refresh token-ul în DB
    // Pentru moment, logout-ul se face pe frontend prin ștergerea token-urilor

    res.json({
      success: true,
      message: 'Deconectare reușită'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la deconectare'
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    // req.user este setat de middleware-ul authenticateToken
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        institutions: {
          include: {
            institution: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizator nu a fost găsit'
      });
    }

    const userData = {
      id: user.id,
      email: user.email,
      name: user.email.split('@')[0], // temporary
      globalRole: user.globalRole,
      institutions: user.institutions.map(ui => ({
        id: ui.institution.id,
        name: ui.institution.name,
        type: ui.institution.type,
        territoryLevel: ui.institution.territoryLevel,
        role: ui.institutionRole
      }))
    };

    res.json({
      success: true,
      data: { user: userData }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea datelor utilizatorului'
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token lipsește'
      });
    }

    // Verifică refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Verifică dacă user există și e activ
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Utilizator invalid sau inactiv'
      });
    }

    // Generează un nou access token
    const newAccessToken = generateAccessToken(user.id);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Refresh token invalid sau expirat'
      });
    }

    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la reîmprospătarea token-ului'
    });
  }
};
