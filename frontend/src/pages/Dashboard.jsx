import React, { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import api, { analyticsService, reportService } from '../services/api';
import { jsPDF } from 'jspdf';
import { 
  Activity, AlertTriangle, CheckCircle2, Circle, 
  HelpCircle, RefreshCw, Sparkles, User, ShieldAlert,
  ArrowRight, Download, Check, X, FileText, Eye, ListFilter,
  Clock, CheckSquare, BarChart, User2, Star
} from 'lucide-react';

export default function Dashboard() {
  const { activeProjectId, activeProject, activeProjects } = useProjects();
  const { user } = useAuth();
  
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportTriggering, setReportTriggering] = useState(false);
  
  // Dashboard Task Filter State
  const [showCompleted, setShowCompleted] = useState(false);
  const [projectTasks, setProjectTasks] = useState([]);
  
  // Capacity Recommendations State
  const [recommendations, setRecommendations] = useState([]);
  const [actioningRec, setActioningRec] = useState(null);

  // Previous Reports State
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);

  const isManager = user?.role === 'MANAGER';
  const isLeader = user?.role === 'TEAM_LEADER' || user?.role === 'MANAGER';
  const isMember = user?.role === 'TEAM_MEMBER';

  const fetchDashboardData = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    setError('');
    try {
      // Fetch Live metrics
      const data = await analyticsService.getDashboard(activeProjectId);
      setMetrics(data);

      // Fetch Tasks for Completed filter
      const stories = await api.get(`/stories?projectId=${activeProjectId}`);
      const allTasks = [];
      for (const s of stories.data) {
        const tasksRes = await api.get(`/tasks?storyId=${s.id}`);
        allTasks.push(...tasksRes.data.map(t => ({ ...t, storyTitle: s.title })));
      }
      setProjectTasks(allTasks);

      // Fetch Capacity Recommendations (Pending ones)
      const recsRes = await api.get(`/recommendations?projectId=${activeProjectId}`);
      setRecommendations(recsRes.data);

      // Fetch Sprint Reports list
      const reportsRes = await reportService.getByProject(activeProjectId);
      setReports(reportsRes.data);
    } catch (err) {
      setError('Failed to fetch dashboard metrics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeProjectId]);

  const handleTriggerReport = async () => {
    if (!activeProjectId) return;
    setReportTriggering(true);
    try {
      const newReport = await reportService.trigger(activeProjectId);
      await fetchDashboardData();
      setSelectedReport(newReport);
    } catch (err) {
      console.error(err);
      alert('Failed to generate report.');
    } finally {
      setReportTriggering(false);
    }
  };

  const handleApproveRecommendation = async (id) => {
    setActioningRec(id);
    try {
      await api.post(`/recommendations/${id}/approve`);
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error approving recommendation.');
    } finally {
      setActioningRec(null);
    }
  };

  const handleRejectRecommendation = async (id) => {
    setActioningRec(id);
    try {
      await api.post(`/recommendations/${id}/reject`);
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert('Error rejecting recommendation.');
    } finally {
      setActioningRec(null);
    }
  };

  const handleQuickStatusChange = async (taskId, originalObj, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { ...originalObj, status: newStatus });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const downloadReportPDF = (reportData) => {
    if (!reportData) return;

    let summary = {};
    try {
      summary = JSON.parse(reportData.summary);
    } catch (e) {
      summary = reportData.summary;
    }

    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("AxisFlow - Axis Report", 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated Time: ${new Date(reportData.generatedAt).toLocaleString()}`, 14, y);
    doc.text(`Project Name: ${activeProject?.title || 'Phoenix Rebuild'}`, 14, y + 5);
    y += 18;

    // Divider line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, y, 196, y);
    y += 10;

    // Metrics Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("Axis Summary & KPIs", 14, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Axis Health Score: ${reportData.healthScore} / 100 (${reportData.riskLevel})`, 14, y);
    y += 6;

    const stats = summary.stats || {};
    doc.text(`Total Stories: ${stats.totalStories || 0}  |  Completed Stories: ${stats.completedStories || 0}`, 14, y);
    y += 6;
    doc.text(`Total Tasks: ${stats.totalTasks || 0}  |  Completed Tasks: ${stats.completedTasks || 0}`, 14, y);
    y += 6;
    doc.text(`Blocked Tasks/Stories: ${stats.blockedTasks || 0}  |  Overdue Tasks: ${stats.overdueTasks || 0}`, 14, y);
    y += 12;

    // Recommendations section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Axis Risks & Recommendations", 14, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const recs = summary.recommendations || [];
    if (recs.length > 0) {
      recs.forEach(rec => {
        const textLines = doc.splitTextToSize(`• ${rec}`, 180);
        textLines.forEach(line => {
          doc.text(line, 14, y);
          y += 5;
        });
      });
    } else {
      doc.text("No high risks detected. Axis remains stable.", 14, y);
      y += 6;
    }
    y += 8;

    // Workload Balance
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Developer Workloads", 14, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const workloadList = summary.workload?.devWorkloads || [];
    if (workloadList.length > 0) {
      workloadList.forEach(w => {
        doc.text(`• ${w.name}: ${w.taskCount} Tasks (Workload Weight: ${w.weight})`, 14, y);
        y += 6;
      });
    } else {
      doc.text("No developer allocations tracked.", 14, y);
      y += 6;
    }

    doc.save(`axisflow-report-${reportData.id.slice(0, 8)}.pdf`);
  };

  if (activeProjects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-md text-center py-16 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
          <HelpCircle className="mx-auto h-16 w-16 text-blue-500 animate-pulse" />
          <h3 className="mt-4 text-xl font-bold text-slate-800">No Active Projects</h3>
          <p className="mt-2 text-sm text-slate-500">
            There are no currently active projects. Go to the Projects page to set one to ACTIVE, or check back later.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !metrics) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Loading Axis Details...</p>
        </div>
      </div>
    );
  }

  // Filter Tasks list based on "Show Completed"
  const filteredTasks = projectTasks.filter(t => showCompleted ? true : t.status !== 'COMPLETED');

  // Filter Tasks assigned specifically to current Team Member
  const myTasks = projectTasks.filter(t => t.assignedTo === user?.name || t.assignedTo === user?.email);
  const myActiveTasks = myTasks.filter(t => t.status !== 'COMPLETED');
  const myCompletedTasksCount = myTasks.filter(t => t.status === 'COMPLETED').length;
  const myProgressPercent = myTasks.length > 0 ? Math.round((myCompletedTasksCount / myTasks.length) * 100) : 0;

  const getHealthTagColor = (score) => {
    if (score >= 80) return 'bg-green-50 text-green-700 border-green-200';
    if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const getHealthEmoji = (score) => {
    if (score >= 80) return '🟢 Healthy';
    if (score >= 50) return '🟡 At Risk';
    return '🔴 Critical';
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 comic-bg">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-wider">Axis Analytics Dashboard</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest bg-spidey-yellow/20 px-2 py-0.5 border border-black inline-block mt-1">Axis metrics & predictive warnings for {activeProject?.title}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {isLeader && (
            <button 
              onClick={handleTriggerReport}
              disabled={reportTriggering}
              className="flex items-center gap-2 px-5 py-2.5 border-3 border-black bg-spidey-red text-white hover:bg-red-600 disabled:opacity-50 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>{reportTriggering ? 'Generating...' : 'Generate Report'}</span>
            </button>
          )}
        </div>
      </div>

      {metrics && (
        <>
          {/* General Details Metrics grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-sm font-semibold text-slate-400">Total Projects</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{metrics.totalProjects}</h3>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-sm font-semibold text-slate-400">Project Progress</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{metrics.projectProgress}%</h3>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all" 
                  style={{ width: `${metrics.projectProgress}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-400">Axis Health Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-slate-800">{metrics.healthScore}</h3>
                  <span className="text-sm text-slate-400">/ 100</span>
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full border uppercase ${getHealthTagColor(metrics.healthScore)}`}>
                {getHealthEmoji(metrics.healthScore)}
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-400">Axis Risk Level</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{metrics.riskLevel}</h3>
              </div>
              <div className={`p-3 rounded-xl ${metrics.riskLevel === 'HEALTHY' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Dynamic Tracking Pad and WIP Section for Team Members */}
          {isMember && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Member Progress Tracking Circle */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">My Progress</h3>
                  <p className="text-xs text-slate-400">Completed tasks ratio in active axis</p>
                </div>
                
                <div className="my-6 flex flex-col items-center justify-center relative">
                  <div className="w-28 h-28 rounded-full border-8 border-slate-100 flex items-center justify-center relative overflow-hidden">
                    <span className="text-2xl font-black text-slate-800">{myProgressPercent}%</span>
                    <div 
                      className="absolute inset-0 border-8 border-blue-500 rounded-full transition-all"
                      style={{ clipPath: `polygon(50% 50%, 50% 0%, ${myProgressPercent >= 25 ? '100% 0%' : '50% 0%'}, ${myProgressPercent >= 50 ? '100% 100%' : '50% 0%'}, ${myProgressPercent >= 75 ? '0% 100%' : '50% 0%'}, ${myProgressPercent === 100 ? '0% 0%' : '50% 0%'})` }}
                    ></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-4">
                    {myCompletedTasksCount} of {myTasks.length} tasks completed
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex justify-between">
                  <span>Assigned to: {user.name}</span>
                  <span className="text-blue-500">Active Axis</span>
                </div>
              </div>

              {/* Developer WIP Tracking Pad */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
                    <span>My Axis Tracking Pad (Work in Progress)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">Quickly update status of your active axis tasks below</p>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {myActiveTasks.length > 0 ? (
                      myActiveTasks.map((t) => (
                        <div key={t.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{t.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Story: {t.storyTitle}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[9px] font-semibold text-slate-400">Due: {new Date(t.deadline).toLocaleDateString()}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                t.priority === 'URGENT' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                              }`}>{t.priority}</span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <select
                              value={t.status}
                              onChange={(e) => handleQuickStatusChange(t.id, t, e.target.value)}
                              className="bg-white border border-slate-200 text-xs font-semibold text-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                            >
                              <option value="TODO">TODO</option>
                              <option value="IN_PROGRESS">IN PROGRESS</option>
                              <option value="BLOCKED">BLOCKED</option>
                              <option value="COMPLETED">COMPLETED</option>
                            </select>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-xl border border-dashed">
                        No active/pending tasks found. Great job!
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-4 border-t border-slate-100 pt-3 flex justify-between">
                  <span>Task details change instantly affects axis health score</span>
                  <span className="font-bold text-slate-500">Live tracker</span>
                </div>
              </div>
            </div>
          )}

          {/* Risk alerts & Capacity Balance Manual Approval Recommendations */}
          {!isMember && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sprint Risk Predictor */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Axis Risk Predictor</h3>
                    <span className="text-xs text-slate-400">Auto-detected risks</span>
                  </div>
                  <div className="space-y-3">
                    {metrics.recommendations?.length > 0 ? (
                      metrics.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm leading-relaxed">
                          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex gap-3 p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>All systems nominal. No sprint risks detected.</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-4 italic border-t border-slate-100 pt-3">
                  Calculations based on task statuses and deadlines.
                </div>
              </div>

              {/* Capacity Balancer: Manual Action Approval UI */}
              {isLeader && (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Capacity Balancer recommendations</h3>
                      <span className="text-xs text-slate-400">Manual approval required</span>
                    </div>
                    
                    <div className="space-y-3">
                      {recommendations.length > 0 ? (
                        recommendations.map((rec) => (
                          <div key={rec.id} className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm flex items-start justify-between gap-4">
                            <div>
                              <p className="font-bold text-blue-900">Move: {rec.taskTitle}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                From: <span className="font-bold text-slate-700">{rec.fromDev}</span> &rarr; To:{' '}
                                <span className="font-bold text-slate-700">{rec.toDev}</span>
                              </p>
                              <p className="text-xs text-slate-600 mt-2 bg-white px-2 py-1 rounded-md border border-slate-100">
                                {rec.reason}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleApproveRecommendation(rec.id)}
                                disabled={actioningRec === rec.id}
                                className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                                title="Approve & Reassign"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRejectRecommendation(rec.id)}
                                disabled={actioningRec === rec.id}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer"
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex gap-3 p-3 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl text-sm">
                          <CheckCircle2 className="h-5 w-5 text-slate-400 shrink-0" />
                          <span>Workloads are balanced. No capacity planners needed.</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-4 italic border-t border-slate-100 pt-3">
                    Pending actions automatically generated by minute cron balance analytics.
                  </div>
                </div>
              )}
            </div>
          )}

        </>
      )}

      {/* View Reports Modal */}
      {showReportsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span>Historical Axis Reports</span>
              </h3>
              <button 
                onClick={() => setShowReportsModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-semibold text-slate-600">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Report ID</th>
                    <th className="px-4 py-3">Health Score</th>
                    <th className="px-4 py-3">Risk Level</th>
                    <th className="px-4 py-3">Generated Time</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{rep.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800">{rep.healthScore}</span> / 100
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          rep.riskLevel === 'HEALTHY' ? 'bg-green-50 text-green-700 border-green-150' : 'bg-red-50 text-red-700 border-red-150'
                        }`}>
                          {rep.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{new Date(rep.generatedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedReport(rep)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => downloadReportPDF(rep)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-400">
                        No previous reports found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Selected Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-2xl p-6 flex flex-col max-h-[85vh] overflow-y-auto rounded-none">
            <div className="flex justify-between items-center border-b-4 border-black pb-3 mb-4">
              <h3 className="text-xl font-black text-black flex items-center gap-2">
                <FileText className="h-5 w-5 text-spidey-blue" />
                <span>Axis Report Details</span>
              </h3>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-1 border-2 border-black bg-spidey-yellow text-black hover:bg-yellow-400 cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              <div className="p-4 bg-spidey-yellow/10 border-3 border-black shadow-[4px_4px_0px_#000] rounded-none">
                <p className="text-sm font-black text-black">Project Name: {activeProject?.title}</p>
                <p className="text-xs text-slate-700 font-bold mt-1">Generated: {new Date(selectedReport.generatedAt).toLocaleString()}</p>
                <p className="text-xs text-slate-700 font-bold mt-0.5">Report ID: <span className="font-mono text-slate-600 font-normal">{selectedReport.id}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border-3 border-black shadow-[4px_4px_0px_#000] rounded-none">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Axis Health Score</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-spidey-blue">{selectedReport.healthScore}</span>
                    <span className="text-xs text-slate-500 font-bold">/ 100</span>
                  </div>
                </div>

                <div className="p-4 bg-white border-3 border-black shadow-[4px_4px_0px_#000] rounded-none">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Risk Assessment</span>
                  <div className="text-lg font-black text-spidey-red mt-2 uppercase">{selectedReport.riskLevel}</div>
                </div>
              </div>

              {/* Summary KPIs */}
              <div>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Axis KPIs</h4>
                <div className="p-4 bg-white border-3 border-black shadow-[4px_4px_0px_#000] grid grid-cols-2 sm:grid-cols-4 gap-4 text-center rounded-none">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">Stories</p>
                    <p className="text-lg font-black text-black mt-1">
                      {(() => {
                        try {
                          const s = JSON.parse(selectedReport.summary);
                          return s.stats?.totalStories || 0;
                        } catch(e) { return 0; }
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">Completed Stories</p>
                    <p className="text-lg font-black text-green-600 mt-1">
                      {(() => {
                        try {
                          const s = JSON.parse(selectedReport.summary);
                          return s.stats?.completedStories || 0;
                        } catch(e) { return 0; }
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">Tasks</p>
                    <p className="text-lg font-black text-black mt-1">
                      {(() => {
                        try {
                          const s = JSON.parse(selectedReport.summary);
                          return s.stats?.totalTasks || 0;
                        } catch(e) { return 0; }
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">Completed Tasks</p>
                    <p className="text-lg font-black text-green-600 mt-1">
                      {(() => {
                        try {
                          const s = JSON.parse(selectedReport.summary);
                          return s.stats?.completedTasks || 0;
                        } catch(e) { return 0; }
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommendations and Workload */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Risks & Insights</h4>
                <div className="space-y-2">
                  {(() => {
                    try {
                      const s = JSON.parse(selectedReport.summary);
                      const recs = s.recommendations || [];
                      return recs.length > 0 ? (
                        recs.map((r, i) => (
                          <div key={i} className="flex gap-2 p-3 bg-red-50 border-2 border-black text-black font-bold rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs">
                            <AlertTriangle className="h-4.5 w-4.5 text-spidey-red shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 bg-green-50 border-2 border-black text-black font-bold rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs">
                          No high-priority risks observed for this axis.
                        </div>
                      );
                    } catch(e) {
                      return <p className="text-xs text-slate-400">Failed to parse stats.</p>;
                    }
                  })()}
                </div>
              </div>

              {/* Download PDF CTA */}
              <div className="pt-4 border-t-4 border-black flex justify-end gap-3">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 border-3 border-black bg-white hover:bg-slate-50 text-black text-xs font-black uppercase rounded-none shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadReportPDF(selectedReport)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-spidey-red hover:bg-red-600 text-white text-xs font-black uppercase rounded-none border-3 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
