import React, { createContext, useState, useEffect, useContext } from 'react';
import { projectService } from '../services/api';
import { useAuth } from './AuthContext';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshProjects = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await projectService.getAll();
      setProjects(list);

      const activeList = list.filter(p => p.status === 'ACTIVE');
      setActiveProjects(activeList);

      if (activeList.length === 1) {
        // Rule: If only one ACTIVE project exists -> Auto-select it
        setActiveProjectId(activeList[0].id);
        setActiveProject(activeList[0]);
      } else if (activeList.length > 1) {
        // Rule: If multiple ACTIVE projects exist -> Default to first or keep active if still exists in list
        const exists = activeList.some(p => p.id === activeProjectId);
        if (!activeProjectId || !exists) {
          setActiveProjectId(activeList[0].id);
          setActiveProject(activeList[0]);
        } else {
          const current = activeList.find(p => p.id === activeProjectId);
          setActiveProject(current);
        }
      } else {
        // Rule: If no ACTIVE project exists -> Show Empty State
        setActiveProjectId('');
        setActiveProject(null);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, [user]);

  const changeActiveProject = (id) => {
    setActiveProjectId(id);
    const proj = projects.find(p => p.id === id);
    setActiveProject(proj || null);
  };

  const value = {
    projects,
    activeProjects,
    activeProjectId,
    activeProject,
    loading,
    refreshProjects,
    changeActiveProject
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
