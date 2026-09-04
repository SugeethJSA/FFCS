import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding FFCS database...");

  // Categories – extend as your club evolves
  const categories = [
    { name: "Event Participation", slug: "event", description: "Attending & participating in club events", color: "#6366f1", icon: "Calendar" },
    { name: "Technical Contribution", slug: "technical", description: "Code, projects, PRs, research", color: "#0ea5e9", icon: "Code2" },
    { name: "Volunteering", slug: "volunteering", description: "On-ground help, logistics, mentoring", color: "#10b981", icon: "HeartHandshake" },
    { name: "Outreach & Content", slug: "outreach", description: "Socials, blogs, designs, outreach", color: "#f59e0b", icon: "Megaphone" },
    { name: "Competition Wins", slug: "wins", description: "Hackathons, contests, podium finishes", color: "#ec4899", icon: "Trophy" },
    { name: "Workshop & Mentoring", slug: "workshop", description: "Hosting workshops, mentoring juniors", color: "#8b5cf6", icon: "GraduationCap" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }
  console.log(`✓ ${categories.length} categories ready`);

  // Default admin – CHANGE CREDENTIALS IMMEDIATELY after first deploy
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@ffcs.club";
  const adminUser = process.env.SEED_ADMIN_USERNAME || "admin";
  const adminPass = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const hash = await bcrypt.hash(adminPass, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      username: adminUser,
      displayName: "Club Admin",
      passwordHash: hash,
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`✓ Admin user: ${admin.username} (${admin.email})`);

  // Demo members (only in dev)
  if (process.env.SEED_DEMO === "true") {
    const demoNames = ["Aarav Sharma", "Priya Nair", "Kabir Das", "Ananya Rao", "Vikram Singh"];
    for (let i = 0; i < demoNames.length; i++) {
      const name = demoNames[i];
      const username = name.toLowerCase().replace(/\s+/g, "");
      const email = `${username}@vitstudent.ac.in`;
      const exists = await prisma.user.findUnique({ where: { username } });
      if (exists) continue;
      const u = await prisma.user.create({
        data: {
          email,
          username,
          displayName: name,
          passwordHash: await bcrypt.hash("Demo1234!", 12),
          role: Role.MEMBER,
        },
      });
      const cat = await prisma.category.findFirst();
      if (cat) {
        await prisma.point.create({
          data: {
            recipientId: u.id,
            awardedById: admin.id,
            amount: 20 + i * 15,
            reason: "Demo seed points",
            where: "Seed Event 2026",
            how: "Participation + contribution",
            categoryId: cat.id,
          },
        });
        await prisma.user.update({
          where: { id: u.id },
          data: { totalPoints: { increment: 20 + i * 15 } },
        });
      }
    }
    console.log("✓ Demo members seeded");
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
