import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================
  // 1. Creează user admin
  // ============================================
  
  const adminEmail = 'admin@test.ro';
  const adminPassword = 'admin123'; // SCHIMBĂ ÎN PRODUCȚIE!

  // Verifică dacă există deja
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  let adminUser;

  if (existingAdmin) {
    console.log('✅ Admin user deja există:', adminEmail);
    adminUser = existingAdmin;
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        globalRole: 'PLATFORM_ADMIN',
        isActive: true
      }
    });

    console.log('✅ Created PLATFORM_ADMIN:', adminEmail);
    console.log('   Password:', adminPassword);
  }

  // ============================================
  // 2. Creează instituții test
  // ============================================

  const institutions = [
    {
      name: 'Primăria Sector 3',
      type: 'PRIMARIE_SECTOR',
      territoryLevel: 'SECTOR',
      territoryCode: 'S3'
    },
    {
      name: 'Primăria Sector 6',
      type: 'PRIMARIE_SECTOR',
      territoryLevel: 'SECTOR',
      territoryCode: 'S6'
    },
    {
      name: 'Primăria Municipiului București',
      type: 'PMB',
      territoryLevel: 'MUNICIPIU',
      territoryCode: 'B'
    },
    {
      name: 'Operator Salubrizare Sector 3',
      type: 'OPERATOR_SALUBRIZARE',
      territoryLevel: 'SECTOR',
      territoryCode: 'S3'
    }
  ];

  for (const inst of institutions) {
    const existing = await prisma.institution.findFirst({
      where: { 
        name: inst.name,
        territoryCode: inst.territoryCode 
      }
    });

    if (!existing) {
      await prisma.institution.create({ data: inst });
      console.log('✅ Created institution:', inst.name);
    } else {
      console.log('ℹ️  Institution already exists:', inst.name);
    }
  }

  // ============================================
  // 3. Creează useri test pentru fiecare instituție
  // ============================================

  const sector3 = await prisma.institution.findFirst({
    where: { territoryCode: 'S3', type: 'PRIMARIE_SECTOR' }
  });

  if (sector3) {
    // User admin pentru Sector 3
    const sector3AdminEmail = 'admin.s3@primarie.ro';
    const existingS3Admin = await prisma.user.findUnique({
      where: { email: sector3AdminEmail }
    });

    if (!existingS3Admin) {
      const hashedPassword = await bcrypt.hash('primarie123', 10);
      const s3Admin = await prisma.user.create({
        data: {
          email: sector3AdminEmail,
          passwordHash: hashedPassword,
          globalRole: 'STANDARD_USER',
          isActive: true
        }
      });

      await prisma.userInstitution.create({
        data: {
          userId: s3Admin.id,
          institutionId: sector3.id,
          institutionRole: 'INSTITUTION_ADMIN'
        }
      });

      console.log('✅ Created INSTITUTION_ADMIN for Sector 3:', sector3AdminEmail);
      console.log('   Password: primarie123');
    }

    // User editor pentru Sector 3
    const sector3EditorEmail = 'editor.s3@primarie.ro';
    const existingS3Editor = await prisma.user.findUnique({
      where: { email: sector3EditorEmail }
    });

    if (!existingS3Editor) {
      const hashedPassword = await bcrypt.hash('editor123', 10);
      const s3Editor = await prisma.user.create({
        data: {
          email: sector3EditorEmail,
          passwordHash: hashedPassword,
          globalRole: 'STANDARD_USER',
          isActive: true
        }
      });

      await prisma.userInstitution.create({
        data: {
          userId: s3Editor.id,
          institutionId: sector3.id,
          institutionRole: 'INSTITUTION_EDITOR'
        }
      });

      console.log('✅ Created INSTITUTION_EDITOR for Sector 3:', sector3EditorEmail);
      console.log('   Password: editor123');
    }
  }

  // ============================================
  // 4. Creează user REGULATOR_VIEWER
  // ============================================

  const regulatorEmail = 'regulator@mediu.gov.ro';
  const existingRegulator = await prisma.user.findUnique({
    where: { email: regulatorEmail }
  });

  if (!existingRegulator) {
    const hashedPassword = await bcrypt.hash('regulator123', 10);
    await prisma.user.create({
      data: {
        email: regulatorEmail,
        passwordHash: hashedPassword,
        globalRole: 'REGULATOR_VIEWER',
        isActive: true
      }
    });

    console.log('✅ Created REGULATOR_VIEWER:', regulatorEmail);
    console.log('   Password: regulator123');
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PLATFORM_ADMIN:     admin@test.ro / admin123');
  console.log('INSTITUTION_ADMIN:  admin.s3@primarie.ro / primarie123');
  console.log('INSTITUTION_EDITOR: editor.s3@primarie.ro / editor123');
  console.log('REGULATOR_VIEWER:   regulator@mediu.gov.ro / regulator123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
