const prisma = require('../utils/db');
const logger = require('../utils/logger');
const { calculateProjectMetrics } = require('../services/metricsEngine');

const getReportsByProject = async (req, res) => {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ message: 'projectId is required.' });
  }

  // TEAM_MEMBER has restricted access to reports
  if (req.user.role === 'TEAM_MEMBER') {
    return res.status(403).json({ message: 'Access denied. Team members cannot view reports.' });
  }

  try {
    const reports = await prisma.sprintReport.findMany({
      where: { projectId },
      orderBy: { generatedAt: 'desc' },
      take: 30
    });
    return res.json(reports);
  } catch (error) {
    logger.error('Get reports error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving sprint reports.' });
  }
};

const triggerReportGeneration = async (req, res) => {
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ message: 'projectId is required.' });
  }

  if (req.user.role === 'TEAM_MEMBER') {
    return res.status(403).json({ message: 'Access denied. Team members cannot generate reports.' });
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const metrics = await calculateProjectMetrics(projectId, req.user);

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

    await prisma.activityLog.create({
      data: {
        action: 'REPORT_GENERATED',
        performedBy: req.user.email,
        entityType: 'SPRINT_REPORT',
        entityId: report.id
      }
    });

    // Prune reports (keep last 30)
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

    logger.info(`Sprint report manually generated for project: ${projectId}`);
    return res.status(201).json(report);
  } catch (error) {
    logger.error('Trigger report generation error:', error.message);
    return res.status(500).json({ message: 'Server error generating sprint report.' });
  }
};

module.exports = {
  getReportsByProject,
  triggerReportGeneration
};
