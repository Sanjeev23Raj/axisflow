const prisma = require('../utils/db');
const logger = require('../utils/logger');

/**
 * Calculates metrics for a specific project.
 */
async function calculateProjectMetrics(projectId, user = null) {
  let stories = await prisma.userStory.findMany({
    where: { projectId },
    include: { tasks: true }
  });

  // Filter based on user role to avoid team interference
  if (user && user.role === 'TEAM_LEADER') {
    stories = stories.filter(s => s.assignedLeader === user.name || s.assignedLeader === user.email);
  } else if (user && user.role === 'TEAM_MEMBER') {
    const bobTeam = ['Charlie Member', 'Diana Member', 'Fiona Member', 'George Member', 'bob.leader@axisflow.io', 'Bob Leader'];
    const ethanTeam = ['Hannah Member', 'Ian Member', 'Julia Member', 'Kevin Member', 'ethan.leader@axisflow.io', 'Ethan Leader'];
    const userIdentifier = user.name || user.email;
    const isBobTeam = bobTeam.some(name => userIdentifier.toLowerCase().includes(name.toLowerCase().replace(' ', '.')) || userIdentifier.includes(name));
    const isEthanTeam = ethanTeam.some(name => userIdentifier.toLowerCase().includes(name.toLowerCase().replace(' ', '.')) || userIdentifier.includes(name));
    if (isBobTeam) {
      stories = stories.filter(s => s.assignedLeader === 'Bob Leader' || s.assignedLeader === 'bob.leader@axisflow.io');
    } else if (isEthanTeam) {
      stories = stories.filter(s => s.assignedLeader === 'Ethan Leader' || s.assignedLeader === 'ethan.leader@axisflow.io');
    }
  }

  const allTasks = stories.reduce((acc, story) => acc.concat(story.tasks), []);

  const totalStories = stories.length;
  const completedStories = stories.filter(s => s.status === 'COMPLETED').length;
  const blockedStories = stories.filter(s => s.status === 'BLOCKED').length;

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === 'COMPLETED').length;
  const blockedTasks = allTasks.filter(t => t.status === 'BLOCKED').length;

  const now = new Date();
  const overdueTasks = allTasks.filter(t => t.status !== 'COMPLETED' && new Date(t.deadline) < now).length;
  const activeTasksCount = totalTasks - completedTasks;

  // 1. Health Score Calculation
  const cRatio = totalTasks > 0 ? (completedTasks / totalTasks) : 1;
  const sRatio = totalStories > 0 ? (completedStories / totalStories) : 1;

  // Overdue Penalty: -10% per overdue task, cap at 30%
  const overduePenalty = Math.min(30, overdueTasks * 10);
  // Blocked Penalty: -15% per blocked story/task, cap at 30%
  const blockedPenalty = Math.min(30, (blockedStories + blockedTasks) * 15);

  let healthScore = Math.round((cRatio * 40 + sRatio * 35 + 25) - overduePenalty - blockedPenalty);
  healthScore = Math.max(0, Math.min(100, healthScore));

  let riskLevel = 'HEALTHY';
  if (healthScore < 50) {
    riskLevel = 'CRITICAL';
  } else if (healthScore < 80) {
    riskLevel = 'AT_RISK';
  }

  // 2. Risk Predictor Recommendations
  const recommendations = [];
  const risksDetected = [];

  if (totalTasks > 0 && (overdueTasks / totalTasks) > 0.2) {
    risksDetected.push('HIGH_OVERDUE_RATIO');
    recommendations.push(`Warning: Over ${Math.round((overdueTasks / totalTasks) * 100)}% of tasks are overdue. Consider adjusting timelines.`);
  } else if (overdueTasks > 0) {
    risksDetected.push('OVERDUE_TASKS_PRESENT');
    recommendations.push(`Note: There are ${overdueTasks} overdue tasks pending completion.`);
  }

  if (blockedStories > 0 || blockedTasks > 0) {
    risksDetected.push('BLOCKED_ITEMS');
    recommendations.push(`Critical: Found ${blockedStories} blocked user stories and ${blockedTasks} blocked tasks. Resolve dependencies immediately.`);
  }

  // Deadlines within next 48 hours
  const upcomingThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const approachingDeadlineTasks = allTasks.filter(t => t.status !== 'COMPLETED' && new Date(t.deadline) >= now && new Date(t.deadline) <= upcomingThreshold);
  if (approachingDeadlineTasks.length > 0) {
    risksDetected.push('APPROACHING_DEADLINES');
    recommendations.push(`Alert: ${approachingDeadlineTasks.length} task(s) are approaching their deadline in the next 48 hours.`);
  }

  // 3. Workload Balance Analysis
  const workloadStats = analyzeWorkload(allTasks);
  if (workloadStats.isImbalanced) {
    risksDetected.push('WORKLOAD_IMBALANCE');
    recommendations.push(`Imbalance: ${workloadStats.recommendation}`);
  }

  return {
    healthScore,
    riskLevel,
    stats: {
      totalStories,
      completedStories,
      blockedStories,
      totalTasks,
      completedTasks,
      blockedTasks,
      overdueTasks,
      activeTasksCount
    },
    risks: risksDetected,
    recommendations,
    workload: workloadStats
  };
}

/**
 * Computes workload distribution and returns balancer details
 */
function analyzeWorkload(tasks) {
  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED');
  if (activeTasks.length === 0) {
    return { isImbalanced: false, devWorkloads: [], recommendation: 'No active tasks to balance.' };
  }

  const priorityWeights = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 5 };
  const developerWorkloads = {};

  // Group by assigned developer
  activeTasks.forEach(task => {
    const dev = task.assignedTo || 'Unassigned';
    if (!developerWorkloads[dev]) {
      developerWorkloads[dev] = {
        name: dev,
        taskCount: 0,
        weight: 0,
        tasks: []
      };
    }
    developerWorkloads[dev].taskCount++;
    developerWorkloads[dev].weight += priorityWeights[task.priority] || 1;
    developerWorkloads[dev].tasks.push(task);
  });

  const devList = Object.values(developerWorkloads);
  if (devList.length <= 1) {
    return { isImbalanced: false, devWorkloads: devList, recommendation: 'Single assignee. No balancing possible.' };
  }

  // Calculate average weight
  const totalWeight = devList.reduce((sum, d) => sum + d.weight, 0);
  const avgWeight = totalWeight / devList.length;

  // Find max and min
  let maxDev = devList[0];
  let minDev = devList[0];

  devList.forEach(dev => {
    if (dev.weight > maxDev.weight) maxDev = dev;
    if (dev.weight < minDev.weight) minDev = dev;
  });

  // Imbalance if maxDev weight is twice the average workload of other developers
  const otherDevsCount = devList.length - 1;
  const sumOtherWeights = totalWeight - maxDev.weight;
  const avgOtherWeight = otherDevsCount > 0 ? (sumOtherWeights / otherDevsCount) : 0;

  const isImbalanced = maxDev.weight >= 2 * avgOtherWeight && maxDev.weight > 3;

  let recommendation = 'Workload is evenly distributed.';
  let suggestions = [];

  if (isImbalanced && maxDev.name !== 'Unassigned') {
    recommendation = `Developer "${maxDev.name}" is over-allocated (workload weight: ${maxDev.weight}) compared to others (average weight: ${avgOtherWeight.toFixed(1)}).`;
    
    // Suggest moving lowest priority, furthest deadline tasks
    const candidateTasks = [...maxDev.tasks].sort((a, b) => {
      const pDiff = (priorityWeights[a.priority] || 1) - (priorityWeights[b.priority] || 1);
      if (pDiff !== 0) return pDiff; // lower priority first
      return new Date(b.deadline) - new Date(a.deadline); // further deadline first
    });

    const targetDevs = devList.filter(d => d.name !== maxDev.name).sort((a, b) => a.weight - b.weight);

    if (candidateTasks.length > 0 && targetDevs.length > 0) {
      const taskToMove = candidateTasks[0];
      const targetDev = targetDevs[0];
      suggestions.push({
        taskId: taskToMove.id,
        taskTitle: taskToMove.title,
        fromDeveloper: maxDev.name,
        toDeveloper: targetDev.name,
        reason: `Reassign "${taskToMove.title}" (Priority: ${taskToMove.priority}) from ${maxDev.name} to ${targetDev.name} to balance the load.`
      });
    }
  }

  return {
    isImbalanced,
    devWorkloads: devList.map(d => ({ name: d.name, taskCount: d.taskCount, weight: d.weight })),
    recommendation,
    suggestions
  };
}

module.exports = {
  calculateProjectMetrics,
  analyzeWorkload
};
