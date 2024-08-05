import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const saltRounds = 10;

const hashPassword = async (password) => {
  return bcrypt.hash(password, saltRounds);
};

const main = async () => {
  // Create sample users with hashed passwords
  const user1 = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      password: await hashPassword('password123'),
      bio: 'Hello! I am Alice. Love traveling and coding.',
      location: {
        create: {
          latitude: 37.7749,
          longitude: -122.4194,
          placeName: 'San Francisco'
        }
      },
      avatars: {
        create: {
          url: 'avatar1.jpg'
        }
      }
    }
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob.smith@example.com',
      password: await hashPassword('password456'),
      bio: 'Hi, I’m Bob. I enjoy hiking and playing guitar.',
      location: {
        create: {
          latitude: 40.7128,
          longitude: -74.0060,
          placeName: 'New York City'
        }
      },
      avatars: {
        create: {
          url: 'avatar2.jpg'
        }
      }
    }
  });

  // Create a sample like
  await prisma.like.create({
    data: {
      likerId: user1.id,
      likedId: user2.id,
      createdAt: new Date()
    }
  });

  // Create a sample notification
  await prisma.notification.create({
    data: {
      userId: user2.id,
      type: 'Like',
      message: `User ${user1.name} liked your profile.`,
      isRead: false,
      createdAt: new Date()
    }
  });

  console.log('Database seeded successfully!');
};

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
