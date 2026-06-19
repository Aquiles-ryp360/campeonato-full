import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding database...\n');

  // ------------------------------------------------------------------
  // Admin user
  // ------------------------------------------------------------------
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@campeonato.com' },
    update: {},
    create: {
      email: 'admin@campeonato.com',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`  ✓ Admin user created (${admin.email})`);

  // ------------------------------------------------------------------
  // Championship
  // ------------------------------------------------------------------
  const championship = await prisma.championship.upsert({
    where: { slug: 'campeonato-apertura-2025' },
    update: {},
    create: {
      name: 'Campeonato Apertura 2025',
      slug: 'campeonato-apertura-2025',
      description: 'Campeonato oficial de apertura de la temporada 2025',
      logo: null,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-12-15'),
      status: 'ACTIVE',
    },
  });
  console.log(`  ✓ Championship created (${championship.name})`);

  // ------------------------------------------------------------------
  // Categories
  // ------------------------------------------------------------------
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'primera-a' },
      update: {},
      create: {
        name: 'Primera A',
        slug: 'primera-a',
        description: 'Categoría principal / Primera división',
        championshipId: championship.id,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'sub-20' },
      update: {},
      create: {
        name: 'Sub 20',
        slug: 'sub-20',
        description: 'Categoría juvenil Sub 20',
        championshipId: championship.id,
      },
    }),
  ]);
  console.log(`  ✓ ${categories.length} categories created`);

  // ------------------------------------------------------------------
  // Seasons
  // ------------------------------------------------------------------
  const season = await prisma.season.upsert({
    where: { slug: 'apertura-2025' },
    update: {},
    create: {
      name: 'Apertura 2025',
      slug: 'apertura-2025',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-07-30'),
      status: 'ACTIVE',
      championshipId: championship.id,
    },
  });
  console.log(`  ✓ Season created (${season.name})`);

  // ------------------------------------------------------------------
  // Fields
  // ------------------------------------------------------------------
  const fields = await Promise.all([
    prisma.field.upsert({
      where: { name: 'Estadio Nacional' },
      update: {},
      create: {
        name: 'Estadio Nacional',
        address: 'Av. del Estadio s/n, Centro',
        city: 'Ciudad Capital',
        capacity: 50000,
        facilities: 'Iluminación, Vestuarios, Cabina de prensa',
        isActive: true,
      },
    }),
    prisma.field.upsert({
      where: { name: 'Complejo Deportivo Municipal' },
      update: {},
      create: {
        name: 'Complejo Deportivo Municipal',
        address: 'Calle Los Deportes 123',
        city: 'Ciudad Capital',
        capacity: 5000,
        facilities: 'Iluminación, Vestuarios, Estacionamiento',
        isActive: true,
      },
    }),
    prisma.field.upsert({
      where: { name: 'Cancha Sintética Norte' },
      update: {},
      create: {
        name: 'Cancha Sintética Norte',
        address: 'Av. Norte 456',
        city: 'Ciudad Capital',
        capacity: 1500,
        facilities: 'Iluminación, Vestuarios',
        isActive: true,
      },
    }),
  ]);
  console.log(`  ✓ ${fields.length} fields created`);

  // ------------------------------------------------------------------
  // Referees
  // ------------------------------------------------------------------
  const referees = await Promise.all([
    createReferee('Carlos', 'González', 'CR-001'),
    createReferee('Miguel', 'Rodríguez', 'CR-002'),
    createReferee('José', 'Martínez', 'CR-003'),
    createReferee('Luis', 'Fernández', 'CR-004'),
  ]);
  console.log(`  ✓ ${referees.length} referees created`);

  // ------------------------------------------------------------------
  // Teams, delegates & players
  // ------------------------------------------------------------------
  const teamData = [
    { name: 'Club Atlético Capital',       shortName: 'Capital',    city: 'Ciudad Capital' },
    { name: 'Deportivo del Sur',           shortName: 'Del Sur',    city: 'Villa Sur' },
    { name: 'FC Norte Unido',              shortName: 'Norte',      city: 'Ciudad Norte' },
    { name: 'Real Este FC',                shortName: 'Real Este',  city: 'San Este' },
    { name: 'Academia Deportiva Oeste',    shortName: 'Oeste',      city: 'Villa Oeste' },
    { name: 'Sportivo Central',            shortName: 'Central',    city: 'Ciudad Central' },
  ];

  const teams: any[] = [];
  for (const t of teamData) {
    const slug = t.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const delegate = await prisma.delegate.upsert({
      where: { email: `delegado.${slug}@campeonato.com` },
      update: {},
      create: {
        name: `Delegado ${t.shortName}`,
        email: `delegado.${slug}@campeonato.com`,
        phone: `+56 9 1234 ${String(1000 + teams.length).slice(1)}`,
        isActive: true,
      },
    });

    const team = await prisma.team.upsert({
      where: { slug },
      update: {},
      create: {
        name: t.name,
        slug,
        shortName: t.shortName,
        city: t.city,
        logo: null,
        isActive: true,
        delegateId: delegate.id,
        categoryId: categories[0].id,
        seasonId: season.id,
      },
    });

    // Create 6–8 players per team
    const playerCount = 6 + (teams.length % 3);
    const playerNames = getPlayerNamesForTeam(t.shortName, playerCount);
    for (const p of playerNames) {
      await prisma.player.upsert({
        where: { email: `${p.email}` },
        update: {},
        create: {
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          birthDate: new Date(
            1995 + Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 12),
            1 + Math.floor(Math.random() * 28),
          ),
          position: p.position,
          jerseyNumber: p.number,
          isActive: true,
          teamId: team.id,
        },
      });
    }

    teams.push(team);
    console.log(`  ✓ Team "${t.name}" created with ${playerCount} players`);
  }

  // ------------------------------------------------------------------
  // Fixture: Round-robin matches
  // ------------------------------------------------------------------
  const matchDay = new Date('2025-03-08');
  let matchNumber = 1;

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const fieldIdx = (i + j) % fields.length;
      const kickoff = new Date(matchDay);
      kickoff.setHours(16, 0, 0, 0);

      await prisma.match.upsert({
        where: { id: `seed-match-${matchNumber}` },
        update: {},
        create: {
          id: `seed-match-${matchNumber}`,
          matchNumber,
          round: i + 1,
          kickoff,
          status: matchNumber <= 5 ? 'PLAYED' : 'SCHEDULED',
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
          seasonId: season.id,
          categoryId: categories[0].id,
          fieldId: fields[fieldIdx].id,
          refereeId: referees[i % referees.length].id,
          homeScore: matchNumber <= 5 ? Math.floor(Math.random() * 5) : null,
          awayScore: matchNumber <= 5 ? Math.floor(Math.random() * 5) : null,
        },
      });

      matchDay.setDate(matchDay.getDate() + 7);
      matchNumber++;
    }
  }
  console.log(`  ✓ ${matchNumber - 1} matches generated (fixture)`);

  console.log('\n✅  Seed completed successfully.');
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
async function createReferee(firstName: string, lastName: string, license: string) {
  return prisma.referee.upsert({
    where: { license },
    update: {},
    create: {
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@campeonato.com`,
      phone: `+56 9 8765 ${String(1000 + Math.floor(Math.random() * 9000)).slice(0, 4)}`,
      license,
      isActive: true,
    },
  });
}

function getPlayerNamesForTeam(team: string, count: number) {
  const positions = ['GOALKEEPER', 'DEFENDER', 'DEFENDER', 'MIDFIELDER', 'MIDFIELDER', 'FORWARD', 'FORWARD', 'MIDFIELDER'];
  const names = [
    { first: 'Juan', last: 'Pérez' }, { first: 'Carlos', last: 'López' },
    { first: 'Andrés', last: 'Silva' }, { first: 'Diego', last: 'Rojas' },
    { first: 'Pablo', last: 'Torres' }, { first: 'Sergio', last: 'Ramírez' },
    { first: 'Luis', last: 'Morales' }, { first: 'Jorge', last: 'Ortiz' },
    { first: 'Felipe', last: 'Castro' }, { first: 'Matías', last: 'Núñez' },
    { first: 'Tomás', last: 'Vargas' }, { first: 'Nicolás', last: 'Fuentes' },
  ];

  const used: string[] = [];
  return Array.from({ length: count }, (_, i) => {
    const n = names[i % names.length];
    const email = `${n.first.toLowerCase()}.${n.last.toLowerCase()}.${team.toLowerCase()}@example.com`;
    used.push(email);
    return {
      firstName: n.first,
      lastName: n.last,
      email,
      position: positions[i % positions.length] as any,
      number: i + 1,
    };
  });
}

main()
  .catch((err) => {
    console.error('\n❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
