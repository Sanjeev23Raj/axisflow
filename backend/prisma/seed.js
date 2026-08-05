const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with multi-team production scope...');

  // Clean existing data
  await prisma.notification.deleteMany({});
  await prisma.capacityRecommendation.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.sprintReport.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.userStory.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Manager
  const manager = await prisma.user.create({
    data: {
      email: 'manager@sprintpulse.com',
      name: 'Alice Manager',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  // 2. Team Leaders
  const leader1 = await prisma.user.create({
    data: {
      email: 'bob.leader@sprintpulse.com',
      name: 'Bob Leader',
      password: hashedPassword,
      role: 'TEAM_LEADER',
    },
  });

  const leader2 = await prisma.user.create({
    data: {
      email: 'ethan.leader@sprintpulse.com',
      name: 'Ethan Leader',
      password: hashedPassword,
      role: 'TEAM_LEADER',
    },
  });

  // 3. Team Members (4 under Bob, 4 under Ethan)
  const bobMembers = [];
  const namesBob = ['Charlie Member', 'Diana Member', 'Fiona Member', 'George Member'];
  for (let i = 0; i < namesBob.length; i++) {
    const name = namesBob[i];
    const email = name.toLowerCase().replace(' ', '.') + '@sprintpulse.com';
    const u = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'TEAM_MEMBER' }
    });
    bobMembers.push(u);
  }

  const ethanMembers = [];
  const namesEthan = ['Hannah Member', 'Ian Member', 'Julia Member', 'Kevin Member'];
  for (let i = 0; i < namesEthan.length; i++) {
    const name = namesEthan[i];
    const email = name.toLowerCase().replace(' ', '.') + '@sprintpulse.com';
    const u = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'TEAM_MEMBER' }
    });
    ethanMembers.push(u);
  }

  console.log('Seeded 1 Manager, 2 Team Leaders, and 8 Team Members.');

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Projects
  const project1 = await prisma.project.create({
    data: {
      title: 'Phoenix Platform Rebuild',
      description: 'Migrating core microservices and UI to React/Node. Handled by Bob Leader\'s Team.',
      status: 'ACTIVE',
      deadline: nextWeek,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      title: 'Mobile App Beta v2',
      description: 'Planning React Native user onboarding interface. Handled by Ethan Leader\'s Team.',
      status: 'ACTIVE',
      deadline: nextWeek,
    },
  });

  // User Stories - Bob Leader (Team 1)
  const story1_1 = await prisma.userStory.create({
    data: {
      title: 'Backend Auth API & Session слайдер',
      description: 'Create login endpoints and SQLite sessions log table.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedLeader: 'Bob Leader',
      deadline: tomorrow,
      projectId: project1.id,
    },
  });

  const story1_2 = await prisma.userStory.create({
    data: {
      title: 'Analytics and Workload Balancer UI',
      description: 'Display standard deviations charts and PDF triggers.',
      priority: 'URGENT',
      status: 'TODO',
      assignedLeader: 'Bob Leader',
      deadline: nextWeek,
      projectId: project1.id,
    },
  });

  // User Stories - Ethan Leader (Team 2)
  const story2_1 = await prisma.userStory.create({
    data: {
      title: 'Mobile OTP Onboarding swipe panels',
      description: 'Build native swipe card components with micro-animations.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedLeader: 'Ethan Leader',
      deadline: tomorrow,
      projectId: project2.id,
    },
  });

  // Tasks - Bob Leader's team (Charlie, Diana, Fiona, George)
  await prisma.task.create({
    data: {
      title: 'Setup cookie parser middleware',
      description: 'Implement JWT cookies secure flags.',
      assignedTo: 'Charlie Member',
      priority: 'HIGH',
      status: 'COMPLETED',
      deadline: yesterday,
      storyId: story1_1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Create session db logging logic',
      description: 'Log session timestamps and user ids on login.',
      assignedTo: 'Charlie Member',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      deadline: tomorrow,
      storyId: story1_1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Implement Recharts component',
      description: 'Configure pie/bar charts for metrics.',
      assignedTo: 'Diana Member',
      priority: 'MEDIUM',
      status: 'TODO',
      deadline: nextWeek,
      storyId: story1_2.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Setup pdf download triggers',
      description: 'Integrate jspdf export utilities.',
      assignedTo: 'Fiona Member',
      priority: 'LOW',
      status: 'TODO',
      deadline: nextWeek,
      storyId: story1_2.id,
    },
  });

  // Tasks - Ethan Leader's team (Hannah, Ian, Julia, Kevin)
  await prisma.task.create({
    data: {
      title: 'Write OTP auth native screen',
      description: 'Secure native token keys input.',
      assignedTo: 'Hannah Member',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      deadline: tomorrow,
      storyId: story2_1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Design onboarding visual icons',
      description: 'Draw SVG illustrations with clean aesthetics.',
      assignedTo: 'Ian Member',
      priority: 'MEDIUM',
      status: 'TODO',
      deadline: nextWeek,
      storyId: story2_1.id,
    },
  });

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
