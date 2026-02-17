import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.visitorInteraction.deleteMany();
  await prisma.memorialAccess.deleteMany();
  await prisma.memory.deleteMany();
  await prisma.lifeMoment.deleteMany();
  await prisma.memorial.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const passwordHash = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      passwordHash,
      displayName: 'Alice Johnson',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      passwordHash,
      displayName: 'Bob Smith',
    },
  });

  console.log(`  Created users: ${alice.displayName}, ${bob.displayName}`);

  // Create memorials
  const memorial1 = await prisma.memorial.create({
    data: {
      ownerId: alice.id,
      fullName: 'Margaret Ellis',
      dateOfBirth: '1935-03-12',
      dateOfPassing: '2024-11-08',
      biography:
        'Margaret was a beloved teacher, gardener, and grandmother. She spent 40 years inspiring young minds at Oakdale Elementary and was known for her rose garden that bloomed every spring without fail.',
      privacyLevel: 'PUBLIC',
    },
  });

  const memorial2 = await prisma.memorial.create({
    data: {
      ownerId: alice.id,
      fullName: 'Thomas Reed',
      dateOfBirth: '1948-07-22',
      dateOfPassing: '2025-01-15',
      biography:
        'Thomas was a jazz musician, a devoted father, and a quiet philosopher. His saxophone filled countless evenings with warmth and wonder.',
      privacyLevel: 'SHARED_LINK',
    },
  });

  const memorial3 = await prisma.memorial.create({
    data: {
      ownerId: bob.id,
      fullName: 'Amara Osei',
      dateOfBirth: '1960-01-05',
      dateOfPassing: '2025-09-20',
      biography:
        'Amara was a community leader, storyteller, and mother of four. Her laughter could fill any room, and her wisdom guided many.',
      privacyLevel: 'PRIVATE',
    },
  });

  console.log(`  Created 3 memorials`);

  // Create life moments
  await prisma.lifeMoment.createMany({
    data: [
      {
        memorialId: memorial1.id,
        title: 'Born in Springfield',
        description: 'Margaret was born on a spring morning in Springfield, Illinois.',
        date: '1935-03-12',
        sortOrder: 0,
      },
      {
        memorialId: memorial1.id,
        title: 'Started Teaching',
        description: 'Began her career at Oakdale Elementary, where she would teach for four decades.',
        date: '1958-09-01',
        sortOrder: 1,
      },
      {
        memorialId: memorial1.id,
        title: 'Married George Ellis',
        description: 'A summer wedding at the town chapel, surrounded by family and friends.',
        date: '1962-06-15',
        sortOrder: 2,
      },
      {
        memorialId: memorial1.id,
        title: 'Retired from Teaching',
        description: 'After 40 years of service, Margaret retired with a celebration that filled the school gymnasium.',
        date: '1998-06-15',
        sortOrder: 3,
      },
      {
        memorialId: memorial2.id,
        title: 'Born in New Orleans',
        date: '1948-07-22',
        sortOrder: 0,
      },
      {
        memorialId: memorial2.id,
        title: 'First Performance',
        description: 'Played his first gig at a local jazz club at age 16.',
        date: '1964-11-03',
        sortOrder: 1,
      },
    ],
  });

  console.log(`  Created life moments`);

  // Create memories
  await prisma.memory.createMany({
    data: [
      {
        memorialId: memorial1.id,
        authorId: alice.id,
        type: 'TRIBUTE',
        content: 'Grandma Margaret always had cookies waiting when we visited. Her kitchen smelled like cinnamon and love.',
      },
      {
        memorialId: memorial1.id,
        authorId: bob.id,
        type: 'TEXT',
        content: 'Mrs. Ellis was my favorite teacher. She made history come alive in ways I still remember decades later.',
      },
      {
        memorialId: memorial1.id,
        authorId: alice.id,
        type: 'QUOTE',
        content: '"Every garden needs patience, and every child needs kindness." — Margaret Ellis',
      },
      {
        memorialId: memorial2.id,
        authorId: alice.id,
        type: 'TRIBUTE',
        content: 'Dad, your music lives on in every note I hear. The saxophone in the corner still waits for you.',
      },
    ],
  });

  console.log(`  Created memories`);

  // Create shared link for memorial2
  await prisma.memorialAccess.create({
    data: {
      memorialId: memorial2.id,
      accessToken: 'demo-shared-link-token',
      permission: 'VIEW',
    },
  });

  // Give Bob contribute access to memorial1
  await prisma.memorialAccess.create({
    data: {
      memorialId: memorial1.id,
      userId: bob.id,
      email: bob.email,
      permission: 'CONTRIBUTE',
    },
  });

  console.log(`  Created access records`);

  // Create interactions
  await prisma.visitorInteraction.createMany({
    data: [
      {
        memorialId: memorial1.id,
        visitorId: bob.id,
        type: 'MESSAGE',
        content: 'Rest in peace, Mrs. Ellis. You made a real difference.',
      },
      {
        memorialId: memorial1.id,
        visitorId: bob.id,
        type: 'CANDLE',
      },
      {
        memorialId: memorial1.id,
        type: 'CANDLE',
      },
      {
        memorialId: memorial1.id,
        type: 'REACTION',
        reactionEmoji: '🤍',
      },
      {
        memorialId: memorial1.id,
        type: 'REACTION',
        reactionEmoji: '🌿',
      },
    ],
  });

  console.log(`  Created interactions`);
  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
