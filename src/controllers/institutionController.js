import { prisma } from '../config/database.js';

// ============================================
// GET ALL INSTITUTIONS
// ============================================
export const getAllInstitutions = async (req, res) => {
  try {
    const institutions = await prisma.institution.findMany({
      include: {
        users: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedInstitutions = institutions.map(inst => ({
      id: inst.id,
      name: inst.name,
      type: inst.type,
      territoryLevel: inst.territoryLevel,
      territoryCode: inst.territoryCode,
      isActive: inst.isActive,
      createdAt: inst.createdAt,
      usersCount: inst.users.length,
      users: inst.users.map(ui => ({
        id: ui.user.id,
        email: ui.user.email,
        role: ui.institutionRole
      }))
    }));

    res.json({
      success: true,
      data: { institutions: formattedInstitutions }
    });
  } catch (error) {
    console.error('Get all institutions error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea instituțiilor'
    });
  }
};

// ============================================
// GET INSTITUTION BY ID
// ============================================
export const getInstitutionById = async (req, res) => {
  try {
    const { institutionId } = req.params;

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      include: {
        users: {
          include: {
            user: true
          }
        }
      }
    });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Instituția nu a fost găsită'
      });
    }

    const formattedInstitution = {
      id: institution.id,
      name: institution.name,
      type: institution.type,
      territoryLevel: institution.territoryLevel,
      territoryCode: institution.territoryCode,
      isActive: institution.isActive,
      createdAt: institution.createdAt,
      updatedAt: institution.updatedAt,
      users: institution.users.map(ui => ({
        id: ui.user.id,
        email: ui.user.email,
        globalRole: ui.user.globalRole,
        institutionRole: ui.institutionRole,
        isActive: ui.user.isActive
      }))
    };

    res.json({
      success: true,
      data: { institution: formattedInstitution }
    });
  } catch (error) {
    console.error('Get institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea instituției'
    });
  }
};

// ============================================
// CREATE INSTITUTION
// ============================================
export const createInstitution = async (req, res) => {
  try {
    const { name, type, territoryLevel, territoryCode } = req.body;

    // Validare input
    if (!name || !type || !territoryLevel || !territoryCode) {
      return res.status(400).json({
        success: false,
        message: 'Toate câmpurile sunt obligatorii'
      });
    }

    // Verifică dacă instituția există deja (același nume + cod)
    const existing = await prisma.institution.findFirst({
      where: {
        name,
        territoryCode
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'O instituție cu acest nume și cod există deja'
      });
    }

    // Validare enums
    const validTypes = ['PRIMARIE_SECTOR', 'PMB', 'OPERATOR_SALUBRIZARE', 'MINISTER_MEDIU', 'GARDA_MEDIU', 'AGENTIE_MEDIU'];
    const validLevels = ['SECTOR', 'MUNICIPIU', 'JUDET', 'NATIONAL'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tip instituție invalid'
      });
    }

    if (!validLevels.includes(territoryLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Nivel teritorial invalid'
      });
    }

    // Creează instituția
    const newInstitution = await prisma.institution.create({
      data: {
        name,
        type,
        territoryLevel,
        territoryCode,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Instituție creată cu succes',
      data: { institution: newInstitution }
    });
  } catch (error) {
    console.error('Create institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea instituției'
    });
  }
};

// ============================================
// UPDATE INSTITUTION
// ============================================
export const updateInstitution = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { name, type, territoryLevel, territoryCode, isActive } = req.body;

    // Verifică dacă instituția există
    const existing = await prisma.institution.findUnique({
      where: { id: institutionId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Instituția nu a fost găsită'
      });
    }

    // Pregătește datele de update
    const updateData = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (territoryLevel) updateData.territoryLevel = territoryLevel;
    if (territoryCode) updateData.territoryCode = territoryCode;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    // Update instituție
    const updatedInstitution = await prisma.institution.update({
      where: { id: institutionId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Instituție actualizată cu succes',
      data: { institution: updatedInstitution }
    });
  } catch (error) {
    console.error('Update institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea instituției'
    });
  }
};

// ============================================
// DELETE INSTITUTION
// ============================================
export const deleteInstitution = async (req, res) => {
  try {
    const { institutionId } = req.params;

    // Verifică dacă instituția există
    const existing = await prisma.institution.findUnique({
      where: { id: institutionId },
      include: {
        users: true
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Instituția nu a fost găsită'
      });
    }

    // Verifică dacă are useri asociați
    if (existing.users.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Nu poți șterge o instituție cu utilizatori asociați. Elimină mai întâi utilizatorii.'
      });
    }

    // Șterge instituția
    await prisma.institution.delete({
      where: { id: institutionId }
    });

    res.json({
      success: true,
      message: 'Instituție ștearsă cu succes'
    });
  } catch (error) {
    console.error('Delete institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la ștergerea instituției'
    });
  }
};

// ============================================
// GET INSTITUTION STATISTICS
// ============================================
export const getInstitutionStatistics = async (req, res) => {
  try {
    // Total instituții
    const totalInstitutions = await prisma.institution.count();
    
    // Instituții active
    const activeInstitutions = await prisma.institution.count({
      where: { isActive: true }
    });

    // Grupare pe tip
    const byType = await prisma.institution.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    });

    // Grupare pe nivel teritorial
    const byLevel = await prisma.institution.groupBy({
      by: ['territoryLevel'],
      _count: {
        id: true
      }
    });

    res.json({
      success: true,
      data: {
        total: totalInstitutions,
        active: activeInstitutions,
        inactive: totalInstitutions - activeInstitutions,
        byType: byType.map(item => ({
          type: item.type,
          count: item._count.id
        })),
        byLevel: byLevel.map(item => ({
          level: item.territoryLevel,
          count: item._count.id
        }))
      }
    });
  } catch (error) {
    console.error('Get institution statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea statisticilor'
    });
  }
};
