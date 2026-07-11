import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Admin Himpunan",
      username: "admin",
      email: "admin@hmifukri.net",
      passwordHash,
      role: "PENGURUS",
      mustResetPassword: false,
    },
  });

  console.log(`Seeded admin account: ${admin.username} / admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
