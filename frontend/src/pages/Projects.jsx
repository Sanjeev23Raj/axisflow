import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { projectService } from '../services/api';
import { FolderKanban, Plus, Calendar, Settings2, Trash2 } from 'lucide-react';

export default function Projects() {
  const { projects, refreshProjects, changeActiveProject } = useProjects();
  const { user } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('PLANNING');
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isManager = user?.role === 'MANAGER';
  const isLeader = user?.role === 'TEAM_LEADER' || user?.role === 'MANAGER';

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setStatus('PLANNING');
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (proj) => {
    setTitle(proj.title);
    setDescription(proj.description || '');
    setStatus(proj.status);
    setEditingId(proj.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await projectService.update(editingId, { title, description, status });
      } else {
        await projectService.create({ title, description, status });
      }
      setShowModal(false);
      refreshProjects();
    } catch (err) {
      console.error(err);
      alert('Error saving project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project? All associated stories, tasks, and reports will be deleted.')) {
      return;
    }

    try {
      await projectService.delete(id);
      refreshProjects();
    } catch (err) {
      console.error(err);
      alert('Error deleting project.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
          <p className="text-slate-500 text-sm">Create and configure software development projects</p>
        </div>
        {isManager && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  proj.status === 'ACTIVE' 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : proj.status === 'COMPLETED' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  {proj.status}
                </span>
                
                <div className="flex items-center gap-1.5">
                  {isLeader && (
                    <button
                      onClick={() => handleOpenEdit(proj)}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                  )}
                  {isManager && (
                    <button
                      onClick={() => handleDelete(proj.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{proj.title}</h3>
              <p className="text-slate-500 text-sm mt-2 line-clamp-3 leading-relaxed">
                {proj.description || 'No description provided.'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(proj.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingId ? 'Edit Project Settings' : 'Create Project'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Phoenix Rebuild"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="Optional details about the scope of the project."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Status
                </label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="PLANNING">PLANNING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
