const {PrismaClient} = require('./node_modules/.prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRawUnsafe("SHOW TABLES LIKE 'company_settings'");
    if (tables.length > 0) {
      await prisma.$executeRawUnsafe("RENAME TABLE company_settings TO companies");
      console.log('Renamed company_settings -> companies');
    } else {
      console.log('company_settings not found, skipping.');
    }
  } catch(e) {
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
