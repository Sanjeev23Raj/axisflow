import React, { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import api, { storyService, taskService } from '../services/api';
import { 
  Plus, Calendar, Trash2, Edit3, CheckCircle, MessageSquare,
  Clock, AlertCircle, Play, User2, KanbanSquare, CheckSquare, Send
} from 'lucide-react';

export default function StoryBoard() {
  const { activeProjectId } = useProjects();
  const { user } = useAuth();

  const [viewType, setViewType] = useState('stories'); // 'stories' or 'tasks'
  const [stories, setStories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedStoryId, setSelectedStoryId] = useState('ALL');
  
  // Task Comments State
  const [taskComments, setTaskComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Forms & Modal states
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyForm, setStoryForm] = useState({ title: '', description: '', priority: 'MEDIUM', status: 'TODO', assignedLeader: '', deadline: '' });
  const [editingStoryId, setEditingStoryId] = useState(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', priority: 'MEDIUM', status: 'TODO', deadline: '', storyId: '' });
  const [editingTaskId, setEditingTaskId] = useState(null);

  const isManager = user?.role === 'MANAGER';
  const isLeader = user?.role === 'TEAM_LEADER' || user?.role === 'MANAGER';
  const isMember = user?.role === 'TEAM_MEMBER';

  const fetchBoardData = async () => {
    if (!activeProjectId) return;
    try {
      const storyList = await storyService.getByProject(activeProjectId);
      
      // Rule: Team Leaders can only access/view stories assigned to them
      let finalStories = storyList;
      if (user?.role === 'TEAM_LEADER') {
        finalStories = storyList.filter(s => s.assignedLeader === user.email || s.assignedLeader === user.name);
      }
      setStories(finalStories);

      // Fetch all tasks for all stories of the active project
      const allTasks = [];
      for (const s of finalStories) {
        const tList = await taskService.getByStory(s.id);
        allTasks.push(...tList.map(t => ({ ...t, storyTitle: s.title })));
      }
      setTasks(allTasks);

      // Load all users for selectors
      const usersRes = await api.get('/auth/users');
      setUsersList(usersRes.data);
    } catch (err) {
      console.error('Error fetching board data:', err);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [activeProjectId, user]);

  const loadTaskComments = async (taskId) => {
    try {
      const res = await api.get(`/tasks/${taskId}/comments`);
      setTaskComments(res.data);
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  useEffect(() => {
    if (editingTaskId) {
      loadTaskComments(editingTaskId);
    } else {
      setTaskComments([]);
    }
  }, [editingTaskId]);

  const handleOpenCreateStory = () => {
    setStoryForm({ title: '', description: '', priority: 'MEDIUM', status: 'TODO', assignedLeader: '', deadline: '' });
    setEditingStoryId(null);
    setShowStoryModal(true);
  };

  const handleOpenEditStory = (story) => {
    setStoryForm({ 
      title: story.title, 
      description: story.description || '', 
      priority: story.priority, 
      status: story.status,
      assignedLeader: story.assignedLeader || '',
      deadline: story.deadline ? new Date(story.deadline).toISOString().split('T')[0] : ''
    });
    setEditingStoryId(story.id);
    setShowStoryModal(true);
  };

  const handleSaveStory = async (e) => {
    e.preventDefault();
    if (!storyForm.title) return;

    try {
      if (editingStoryId) {
        await storyService.update(editingStoryId, storyForm);
      } else {
        await storyService.create({ ...storyForm, projectId: activeProjectId });
      }
      setShowStoryModal(false);
      fetchBoardData();
    } catch (err) {
      console.error(err);
      alert('Failed to save user story.');
    }
  };

  const handleDeleteStory = async (id) => {
    if (!window.confirm('Delete this story? All associated tasks will be removed.')) return;
    try {
      await storyService.delete(id);
      fetchBoardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateTask = (storyId = '') => {
    setTaskForm({ 
      title: '', 
      description: '', 
      assignedTo: '', 
      priority: 'MEDIUM', 
      status: 'TODO', 
      deadline: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0], 
      storyId: storyId || (stories[0]?.id || '') 
    });
    setEditingTaskId(null);
    setShowTaskModal(true);
  };

  const handleOpenEditTask = (task) => {
    setTaskForm({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo || '',
      priority: task.priority,
      status: task.status,
      deadline: new Date(task.deadline).toISOString().split('T')[0],
      storyId: task.storyId
    });
    setEditingTaskId(task.id);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.storyId || !taskForm.deadline) return;

    // Rule: Manager cannot assign tasks directly to Team Members (locked in UI)
    if (isManager && taskForm.assignedTo) {
      alert('Managers cannot assign tasks directly to Team Members. This assignment must be performed by a Team Leader.');
      return;
    }

    try {
      if (editingTaskId) {
        await taskService.update(editingTaskId, taskForm);
      } else {
        await taskService.create(taskForm);
      }
      setShowTaskModal(false);
      fetchBoardData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save task.');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await taskService.delete(id);
      fetchBoardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !editingTaskId) return;

    try {
      await api.post(`/tasks/${editingTaskId}/comments`, { content: newComment });
      setNewComment('');
      loadTaskComments(editingTaskId);
    } catch (err) {
      console.error(err);
      alert('Failed to post comment.');
    }
  };

  const handleQuickStatusChange = async (type, id, originalObj, newStatus) => {
    try {
      if (type === 'story') {
        await storyService.update(id, { ...originalObj, status: newStatus });
      } else {
        await taskService.update(id, { ...originalObj, status: newStatus });
      }
      fetchBoardData();
    } catch (err) {
      console.error(err);
    }
  };

  // Columns layout setup
  const storyColumns = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];
  const taskColumns = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];

  const getPriorityBadgeColor = (p) => {
    switch (p) {
      case 'URGENT': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
    }
  };

  const leadersList = usersList.filter(u => u.role === 'TEAM_LEADER');
  const membersList = usersList.filter(u => u.role === 'TEAM_MEMBER');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sprint Board</h1>
          <p className="text-slate-500 text-xs">Manage User Stories and Tasks</p>
        </div>

        {/* View selection controls */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewType('stories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewType === 'stories' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KanbanSquare className="h-3.5 w-3.5" />
              <span>User Stories</span>
            </button>
            <button
              onClick={() => setViewType('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewType === 'tasks' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Tasks</span>
            </button>
          </div>

          {viewType === 'tasks' && (
            <select
              value={selectedStoryId}
              onChange={(e) => setSelectedStoryId(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Stories</option>
              {stories.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          )}

          {/* Role restrictions */}
          {((viewType === 'stories' && isManager) || (viewType === 'tasks' && isLeader)) && (
            <button
              onClick={() => viewType === 'stories' ? handleOpenCreateStory() : handleOpenCreateTask()}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add {viewType === 'stories' ? 'Story' : 'Task'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-6 items-start h-full">
        {viewType === 'stories' ? (
          storyColumns.map(col => {
            const filteredStories = stories.filter(s => s.status === col);
            return (
              <div key={col} className="w-80 shrink-0 bg-slate-100/60 p-4 rounded-2xl border border-slate-200/50 flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{col}</span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                    {filteredStories.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {filteredStories.map(story => (
                    <div 
                      key={story.id} 
                      className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${getPriorityBadgeColor(story.priority)}`}>
                            {story.priority}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            {isLeader && (
                              <button 
                                onClick={() => handleOpenEditStory(story)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                            )}
                            {isManager && (
                              <button 
                                onClick={() => handleDeleteStory(story.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 leading-snug">{story.title}</h4>
                        {story.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{story.description}</p>
                        )}
                        {story.assignedLeader && (
                          <span className="text-[10px] text-slate-600 font-semibold bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5 mt-2 inline-block">
                            Leader: {story.assignedLeader}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {story.tasks?.length || 0} Tasks
                        </span>

                        {isLeader ? (
                          <select
                            value={story.status}
                            onChange={(e) => handleQuickStatusChange('story', story.id, story, e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                          >
                            {storyColumns.map(sc => (
                              <option key={sc} value={sc}>{sc}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500">{story.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          taskColumns.map(col => {
            const filteredTasks = tasks.filter(t => {
              const statusMatch = t.status === col;
              const storyMatch = selectedStoryId === 'ALL' || t.storyId === selectedStoryId;
              return statusMatch && storyMatch;
            });
            return (
              <div key={col} className="w-80 shrink-0 bg-slate-100/60 p-4 rounded-2xl border border-slate-200/50 flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{col}</span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                    {filteredTasks.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {filteredTasks.map(task => {
                    const isAssignedToMe = task.assignedTo === user.name || task.assignedTo === user.email;
                    const canEditTask = isLeader || isAssignedToMe;
                    
                    return (
                      <div 
                        key={task.id} 
                        className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${getPriorityBadgeColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleOpenEditTask(task)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              {isLeader && (
                                <button 
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <h4 className="text-sm font-bold text-slate-800 leading-snug">{task.title}</h4>
                          <span className="text-[9px] font-semibold text-blue-500 truncate block mt-1">
                            {task.storyTitle}
                          </span>
                          {task.description && (
                            <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{task.description}</p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.deadline).toLocaleDateString()}
                            </span>
                            {task.assignedTo && (
                              <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <User2 className="h-2.5 w-2.5" />
                                {task.assignedTo}
                              </span>
                            )}
                          </div>

                          {canEditTask && (
                            <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                              <span className="text-[9px] font-semibold text-slate-400">Update Status:</span>
                              <select
                                value={task.status}
                                onChange={(e) => handleQuickStatusChange('task', task.id, task, e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500 rounded-lg px-1.5 py-0.5 focus:outline-none cursor-pointer"
                              >
                                {taskColumns.map(tc => (
                                  <option key={tc} value={tc}>{tc}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Story Modal */}
      {showStoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingStoryId ? 'Edit User Story' : 'Add User Story'}
            </h3>
            
            <form onSubmit={handleSaveStory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Title</label>
                <input
                  type="text" required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                  value={storyForm.title}
                  onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm h-20"
                  value={storyForm.description}
                  onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Assign Team Leader</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm cursor-pointer"
                    value={storyForm.assignedLeader}
                    onChange={(e) => setStoryForm({ ...storyForm, assignedLeader: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {leadersList.map(l => (
                      <option key={l.id} value={l.name}>{l.name} ({l.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Deadline</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                    value={storyForm.deadline}
                    onChange={(e) => setStoryForm({ ...storyForm, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Priority</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                    value={storyForm.priority}
                    onChange={(e) => setStoryForm({ ...storyForm, priority: e.target.value })}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Status</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                    value={storyForm.status}
                    onChange={(e) => setStoryForm({ ...storyForm, status: e.target.value })}
                  >
                    {storyColumns.map(sc => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button" onClick={() => setShowStoryModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal (includes assignment restriction checks and comments) */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-2xl border border-slate-100 flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
            {/* Form details section */}
            <div className="flex-1 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {editingTaskId ? 'Edit Task Details' : 'Add New Task'}
              </h3>
              
              <form onSubmit={handleSaveTask} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">User Story</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                    disabled={isMember}
                    value={taskForm.storyId}
                    onChange={(e) => setTaskForm({ ...taskForm, storyId: e.target.value })}
                  >
                    {stories.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Task Title</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                    disabled={isMember}
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Description</label>
                  <textarea
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm h-20"
                    disabled={isMember}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Assigned To</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm cursor-pointer"
                      disabled={isMember}
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {/* Rules: Managers cannot assign tasks directly to team members (locked in selector) */}
                      {isManager ? (
                        <option disabled value="">Disabled: Managers cannot assign tasks directly.</option>
                      ) : (
                        membersList.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Deadline</label>
                    <input
                      type="date" required
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                      disabled={isMember}
                      value={taskForm.deadline}
                      onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Priority</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Status</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm shadow-xs"
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    >
                      {taskColumns.map(tc => (
                        <option key={tc} value={tc}>{tc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button" onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>

            {/* Task comments section (visible only for existing tasks) */}
            {editingTaskId && (
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-150 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between max-h-[60vh] md:max-h-none">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span>Comments ({taskComments.length})</span>
                  </h4>

                  <div className="space-y-3 overflow-y-auto max-h-64 pr-1 mb-4">
                    {taskComments.length > 0 ? (
                      taskComments.map((c) => (
                        <div key={c.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs">
                          <div className="flex justify-between items-center font-bold text-slate-700 mb-1">
                            <span>{c.author}</span>
                            <span className="text-[9px] font-medium text-slate-400">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{c.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-6 text-xs font-medium">
                        No comments logged yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Add Comment input form */}
                <form onSubmit={handleAddComment} className="border-t border-slate-100 pt-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
