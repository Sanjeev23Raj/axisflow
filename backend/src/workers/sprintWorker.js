const cron = require('node-cron');
const prisma = require('../utils/db');
const logger = require('../utils/logger');
const { calculateProjectMetrics } = require('../services/metricsEngine');
const { createNotification } = require('../controllers/notificationController');

/**
 * Executes the entire background task pipeline for a project, with exponential retries on failure.
 */
async function processProjectWorker(projectId, attempt = 1) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        userStories: {
          include: { tasks: true }
        }
      }
    });

    if (!project) return;

    logger.info(`[Worker] Executing project check for "${project.title}" (Attempt ${attempt}/3)`);

    // 1. Calculate Sprint Health & Risk Level
    const metrics = await calculateProjectMetrics(projectId);

    // 2. Generate Sprint Report (stored in SQLite)
    const report = await prisma.sprintReport.create({
      data: {
        projectId,
        healthScore: metrics.healthScore,
        riskLevel: metrics.riskLevel,
        summary: JSON.stringify({
          stats: metrics.stats,
          risks: metrics.risks,
          recommendations: metrics.recommendations,
          workload: metrics.workload
        })
      }
    });

    // 3. Remove Old Reports (Keep last 30 reports per project)
    const reportsToPrune = await prisma.sprintReport.findMany({
      where: { projectId },
      orderBy: { generatedAt: 'desc' },
      skip: 30
    });

    if (reportsToPrune.length > 0) {
      const ids = reportsToPrune.map(r => r.id);
      await prisma.sprintReport.deleteMany({
        where: { id: { in: ids } }
      });
    }

    // 4. Generate Capacity Planner Recommendations
    if (metrics.workload && metrics.workload.suggestions) {
      for (const sug of metrics.workload.suggestions) {
        // Check if a PENDING recommendation for this task already exists
        const exists = await prisma.capacityRecommendation.findFirst({
          where: {
            taskId: sug.taskId,
            projectId,
            status: 'PENDING'
          }
        });

        if (!exists) {
          await prisma.capacityRecommendation.create({
            data: {
              projectId,
              taskId: sug.taskId,
              taskTitle: sug.taskTitle,
              fromDev: sug.fromDeveloper,
              toDev: sug.toDeveloper,
              reason: sug.reason,
              status: 'PENDING'
            }
          });
          logger.info(`[Worker] Generated new capacity recommendation for task: "${sug.taskTitle}"`);
        }
      }
    }

    // 5. Project Auto-Completion check
    const allStoriesCompleted = project.userStories.length > 0 && project.userStories.every(s => s.status === 'COMPLETED');
    const allTasksCompleted = project.userStories.every(s => s.tasks.every(t => t.status === 'COMPLETED'));

    if (allStoriesCompleted && allTasksCompleted && project.status !== 'COMPLETED') {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'COMPLETED' }
      });

      // Find project members & notify them + manager
      const leaderEmails = project.userStories.map(s => s.assignedLeader).filter(Boolean);
      const memberNames = project.userStories.flatMap(s => s.tasks.map(t => t.assignedTo)).filter(Boolean);
      const uniqueNames = [...new Set([...leaderEmails, ...memberNames])];

      const members = await prisma.user.findMany({
        where: {
          OR: [
            { email: { in: uniqueNames } },
            { name: { in: uniqueNames } }
          ]
        }
      });

      const allUsersToNotify = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: members.map(m => m.id) } },
            { role: 'MANAGER' }
          ]
        }
      });

      for (const target of allUsersToNotify) {
        await createNotification(
          null, // system sender
          target.id,
          'Project Automatically Completed',
          `Project "${project.title}" has been automatically completed as all items are resolved.`,
          'SUCCESS'
        );
      }
      logger.info(`[Worker] Project automatically completed: "${project.title}"`);
    }

    logger.info(`[Worker] Completed checks for "${project.title}" successfully.`);
  } catch (error) {
    logger.error(`[Worker Error] Failed for project ${projectId}: ${error.message}`);
    
    // Failures retry after 30 seconds, up to 3 times
    if (attempt < 3) {
      logger.info(`[Worker] Scheduling retry in 30 seconds for project: ${projectId}`);
      setTimeout(() => {
        processProjectWorker(projectId, attempt + 1);
      }, 30 * 1000);
    } else {
      logger.error(`[Worker] Max retries (3) reached for project ${projectId}. Execution failed.`);
    }
  }
}

/**
 * Scans active tasks, stories, and projects and dispatches deadline reminders (< 24h)
 */
async function processReminders() {
  try {
    const now = new Date();
    const targetThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours out

    // 1. Task Reminders: Deadline < 24h AND status != COMPLETED -> Notify Team Member
    const tasks = await prisma.task.findMany({
      where: {
        status: { not: 'COMPLETED' },
        deadline: {
          gt: now,
          lte: targetThreshold
        }
      }
    });

    for (const t of tasks) {
      if (t.assignedTo) {
        const member = await prisma.user.findFirst({
          where: {
            OR: [
              { email: t.assignedTo },
              { name: t.assignedTo }
            ],
            role: 'TEAM_MEMBER' // ONLY Team Members receive task reminders
          }
        });

        if (member) {
          // Check if reminder was already sent recently (avoid duplicates)
          const sent = await prisma.notification.findFirst({
            where: {
              receiverId: member.id,
              title: 'Task Deadline Reminder',
              message: { contains: t.title }
            }
          });

          if (!sent) {
            await createNotification(
              null,
              member.id,
              'Task Deadline Reminder',
              `Your task "${t.title}" is approaching its deadline in less than 24 hours.`,
              'ALERT'
            );
            logger.info(`[Reminder] Sent task reminder to: ${member.email} for task: "${t.title}"`);
          }
        }
      }
    }

    // 2. Story Reminders: Deadline < 24h AND status != COMPLETED -> Notify Team Leader
    const stories = await prisma.userStory.findMany({
      where: {
        status: { not: 'COMPLETED' },
        deadline: {
          gt: now,
          lte: targetThreshold
        }
      }
    });

    for (const s of stories) {
      if (s.assignedLeader) {
        const leader = await prisma.user.findFirst({
          where: {
            OR: [
              { email: s.assignedLeader },
              { name: s.assignedLeader }
            ],
            role: 'TEAM_LEADER' // ONLY Leaders receive story reminders
          }
        });

        if (leader) {
          const sent = await prisma.notification.findFirst({
            where: {
              receiverId: leader.id,
              title: 'User Story Deadline Reminder',
              message: { contains: s.title }
            }
          });

          if (!sent) {
            await createNotification(
              null,
              leader.id,
              'User Story Deadline Reminder',
              `Your assigned User Story "${s.title}" has tasks ending in less than 24 hours.`,
              'ALERT'
            );
            logger.info(`[Reminder] Sent story reminder to leader: ${leader.email}`);
          }
        }
      }
    }

    // 3. Project Reminders: Deadline < 24h AND status != COMPLETED -> Notify Manager
    const projects = await prisma.project.findMany({
      where: {
        status: { not: 'COMPLETED' },
        deadline: {
          gt: now,
          lte: targetThreshold
        }
      }
    });

    for (const p of projects) {
      const managers = await prisma.user.findMany({
        where: { role: 'MANAGER' } // ONLY Managers receive project reminders
      });

      for (const mgr of managers) {
        const sent = await prisma.notification.findFirst({
          where: {
            receiverId: mgr.id,
            title: 'Project Deadline Reminder',
            message: { contains: p.title }
          }
        });

        if (!sent) {
          await createNotification(
            null,
            mgr.id,
            'Project Deadline Reminder',
            `Project "${p.title}" milestone deadline is approaching in less than 24 hours.`,
            'ALERT'
          );
          logger.info(`[Reminder] Sent project reminder to manager: ${mgr.email}`);
        }
      }
    }
  } catch (error) {
    logger.error(`[Reminder Engine Error]: ${error.message}`);
  }
}

/**
 * Main worker loop
 */
async function runWorker() {
  try {
    logger.info('[Worker] Executing scheduled cron background tasks...');
    const projects = await prisma.project.findMany({
      where: { status: { in: ['ACTIVE', 'PLANNING'] } }
    });

    for (const project of projects) {
      await processProjectWorker(project.id);
    }

    // Execute deadline reminders
    await processReminders();
  } catch (error) {
    logger.error(`[Worker Schedule Error]: ${error.message}`);
  }
}

function initWorker() {
  logger.info('Initializing Node-Cron background worker (Runs every 60s)');
  cron.schedule('*/1 * * * *', () => {
    runWorker();
  });
  
  // Run once immediately on startup
  runWorker();
}

module.exports = {
  initWorker,
  runWorker
};
