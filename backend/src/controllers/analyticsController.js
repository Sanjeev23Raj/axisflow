const prisma = require('../utils/db');
const logger = require('../utils/logger');
const { calculateProjectMetrics } = require('../services/metricsEngine');

const getDashboardMetrics = async (req, res) => {
  const { projectId } = req.query;

  try {
    let activeProjectId = projectId;
    if (!activeProjectId) {
      const activeProject = await prisma.project.findFirst({
        where: { status: 'ACTIVE' }
      });
      if (activeProject) {
        activeProjectId = activeProject.id;
      } else {
        const anyProject = await prisma.project.findFirst();
        if (anyProject) {
          activeProjectId = anyProject.id;
        }
      }
    }

    if (!activeProjectId) {
      return res.json({
        totalProjects: 0,
        totalStories: 0,
        totalTasks: 0,
        completedTasks: 0,
        healthScore: 100,
        riskLevel: 'HEALTHY',
        recommendations: [],
        devWorkloads: [],
        recentActivities: [],
        projectProgress: 0,
        projectTitle: 'No Project Found'
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: activeProjectId }
    });

    const metrics = await calculateProjectMetrics(activeProjectId, req.user);

    const totalProjects = await prisma.project.count();
    const totalStories = await prisma.userStory.count({ where: { projectId: activeProjectId } });
    const totalTasks = metrics.stats.totalTasks;
    const completedTasks = metrics.stats.completedTasks;
    
    const projectProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const recentActivities = await prisma.activityLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 15
    });

    // Provide full visibility to Team Members as requested by the user, while keeping their specific assignments highlighted
    return res.json({
      role: req.user.role,
      projectTitle: project.title,
      totalProjects,
      totalStories,
      totalTasks,
      completedTasks,
      healthScore: metrics.healthScore,
      riskLevel: metrics.riskLevel,
      recommendations: metrics.recommendations,
      devWorkloads: metrics.workload.devWorkloads,
      workloadBalancerSuggestions: metrics.workload.suggestions || [],
      recentActivities,
      projectProgress
    });

  } catch (error) {
    logger.error('Dashboard metrics error:', error.message);
    return res.status(500).json({ message: 'Server error loading dashboard metrics.' });
  }
};

module.exports = {
  getDashboardMetrics
};
