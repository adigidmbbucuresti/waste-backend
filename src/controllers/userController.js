import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';

// ============================================
// GET ALL USERS (Platform Admin only)
// ============================================
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        institutions: {
          include: {
            institution: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      globalRole: user.globalRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      institutions: user.institutions.map(ui => ({
        id: ui.institution.id,
        name: ui.institution.name,
        type: ui.institution.type,
        role: ui.institutionRole
      }))
    }));

    res.json({
      success: true,
      data: { users: formattedUsers }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea utilizatorilor'
    });
  }
};

// ============================================
// GET USERS BY INSTITUTION (Institution Admin)
// ============================================
export const getUsersByInstitution = async (req, res) => {
  try {
    const { institutionId } = req.params;

    // Verifică dacă instituția există
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId }
    });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Instituția nu a fost găsită'
      });
    }

    const userInstitutions = await prisma.userInstitution.findMany({
      where: { institutionId },
      include: {
        user: true,
        institution: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedUsers = userInstitutions.map(ui => ({
      id: ui.user.id,
      email: ui.user.email,
      globalRole: ui.user.globalRole,
      isActive: ui.user.isActive,
      institutionRole: ui.institutionRole,
      createdAt: ui.user.createdAt
    }));

    res.json({
      success: true,
      data: { 
        institution: {
          id: institution.id,
          name: institution.name
        },
        users: formattedUsers 
      }
    });
  } catch (error) {
    console.error('Get users by institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea utilizatorilor'
    });
  }
};

// ============================================
// CREATE USER (Platform Admin or Institution Admin)
// ============================================
export const createUser = async (req, res) => {
  try {
    const { email, password, globalRole, institutionId, institutionRole } = req.body;

    // Validare input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email și parolă sunt obligatorii'
      });
    }

    // Verifică dacă email-ul există deja
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email-ul este deja utilizat'
      });
    }

    // Validare: Institution Admin poate crea doar STANDARD_USER
    if (req.user.globalRole === 'STANDARD_USER' && globalRole !== 'STANDARD_USER') {
      return res.status(403).json({
        success: false,
        message: 'Nu poți crea utilizatori cu acest rol'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Creează user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        globalRole: globalRole || 'STANDARD_USER',
        isActive: true
      }
    });

    // Dacă e specificată o instituție, creează legătura
    if (institutionId && institutionRole) {
      await prisma.userInstitution.create({
        data: {
          userId: newUser.id,
          institutionId,
          institutionRole
        }
      });
    }

    // Obține user-ul cu instituțiile
    const userWithInstitutions = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: {
        institutions: {
          include: {
            institution: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Utilizator creat cu succes',
      data: {
        user: {
          id: userWithInstitutions.id,
          email: userWithInstitutions.email,
          globalRole: userWithInstitutions.globalRole,
          isActive: userWithInstitutions.isActive,
          institutions: userWithInstitutions.institutions.map(ui => ({
            id: ui.institution.id,
            name: ui.institution.name,
            role: ui.institutionRole
          }))
        }
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea utilizatorului'
    });
  }
};

// ============================================
// UPDATE USER
// ============================================
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, globalRole, isActive, password } = req.body;

    // Verifică dacă user-ul există
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      });
    }

    // Validare: Institution Admin nu poate modifica global role
    if (req.user.globalRole === 'STANDARD_USER' && globalRole) {
      return res.status(403).json({
        success: false,
        message: 'Nu poți modifica rolul global'
      });
    }

    // Verifică dacă email-ul nou este deja folosit
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email-ul este deja utilizat'
        });
      }
    }

    // Pregătește datele de update
    const updateData = {};
    if (email) updateData.email = email.toLowerCase();
    if (globalRole) updateData.globalRole = globalRole;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        institutions: {
          include: {
            institution: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Utilizator actualizat cu succes',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          globalRole: updatedUser.globalRole,
          isActive: updatedUser.isActive,
          institutions: updatedUser.institutions.map(ui => ({
            id: ui.institution.id,
            name: ui.institution.name,
            role: ui.institutionRole
          }))
        }
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea utilizatorului'
    });
  }
};

// ============================================
// DELETE USER
// ============================================
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verifică dacă user-ul există
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      });
    }

    // Nu permite ștergerea propriului cont
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Nu poți șterge propriul cont'
      });
    }

    // Șterge user-ul (user_institutions vor fi șterse automat prin CASCADE)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: 'Utilizator șters cu succes'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la ștergerea utilizatorului'
    });
  }
};

// ============================================
// ASSIGN USER TO INSTITUTION
// ============================================
export const assignUserToInstitution = async (req, res) => {
  try {
    const { userId } = req.params;
    const { institutionId, institutionRole } = req.body;

    if (!institutionId || !institutionRole) {
      return res.status(400).json({
        success: false,
        message: 'ID instituție și rol sunt obligatorii'
      });
    }

    // Verifică dacă user-ul există
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizatorul nu a fost găsit'
      });
    }

    // Verifică dacă instituția există
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId }
    });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Instituția nu a fost găsită'
      });
    }

    // Verifică dacă legătura există deja
    const existing = await prisma.userInstitution.findUnique({
      where: {
        userId_institutionId: {
          userId,
          institutionId
        }
      }
    });

    if (existing) {
      // Update rol dacă există
      await prisma.userInstitution.update({
        where: {
          userId_institutionId: {
            userId,
            institutionId
          }
        },
        data: { institutionRole }
      });

      return res.json({
        success: true,
        message: 'Rol actualizat cu succes'
      });
    }

    // Creează legătura nouă
    await prisma.userInstitution.create({
      data: {
        userId,
        institutionId,
        institutionRole
      }
    });

    res.json({
      success: true,
      message: 'Utilizator atribuit la instituție cu succes'
    });
  } catch (error) {
    console.error('Assign user to institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la atribuirea utilizatorului'
    });
  }
};

// ============================================
// REMOVE USER FROM INSTITUTION
// ============================================
export const removeUserFromInstitution = async (req, res) => {
  try {
    const { userId, institutionId } = req.params;

    // Verifică dacă legătura există
    const userInstitution = await prisma.userInstitution.findUnique({
      where: {
        userId_institutionId: {
          userId,
          institutionId
        }
      }
    });

    if (!userInstitution) {
      return res.status(404).json({
        success: false,
        message: 'Utilizatorul nu face parte din această instituție'
      });
    }

    // Șterge legătura
    await prisma.userInstitution.delete({
      where: {
        userId_institutionId: {
          userId,
          institutionId
        }
      }
    });

    res.json({
      success: true,
      message: 'Utilizator eliminat din instituție cu succes'
    });
  } catch (error) {
    console.error('Remove user from institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la eliminarea utilizatorului din instituție'
    });
  }
};
