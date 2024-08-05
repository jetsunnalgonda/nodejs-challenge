import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getAvatars() {
  try {
    const avatars = await prisma.avatar.findMany(); // Fetch all avatars from the database
    return avatars;
  } catch (error) {
    console.error('Error fetching avatars:', error);
    throw error;
  }
}