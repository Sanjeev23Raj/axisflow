import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Connects directly to Backend Express port
  withCredentials: true, // Enables HttpOnly cookie exchanges
  headers: {
    'Content-Type': 'application/json',
  }
});

// Response interceptor to catch session expiry (status 419)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 419) {
      // Invalidate frontend session and redirect ONLY if not already on the login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getSessions: async () => {
    const res = await api.get('/auth/sessions');
    return res.data;
  }
};

export const projectService = {
  getAll: async () => {
    const res = await api.get('/projects');
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/projects/${id}`);
    return res.data;
  },
  create: async (projectData) => {
    const res = await api.post('/projects', projectData);
    return res.data;
  },
  update: async (id, projectData) => {
    const res = await api.put(`/projects/${id}`, projectData);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/projects/${id}`);
    return res.data;
  }
};

export const storyService = {
  getByProject: async (projectId) => {
    const res = await api.get(`/stories?projectId=${projectId}`);
    return res.data;
  },
  create: async (storyData) => {
    const res = await api.post('/stories', storyData);
    return res.data;
  },
  update: async (id, storyData) => {
    const res = await api.put(`/stories/${id}`, storyData);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/stories/${id}`);
    return res.data;
  }
};

export const taskService = {
  getByStory: async (storyId) => {
    const res = await api.get(`/tasks?storyId=${storyId}`);
    return res.data;
  },
  getMyTasks: async () => {
    const res = await api.get('/tasks/my');
    return res.data;
  },
  create: async (taskData) => {
    const res = await api.post('/tasks', taskData);
    return res.data;
  },
  update: async (id, taskData) => {
    const res = await api.put(`/tasks/${id}`, taskData);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/tasks/${id}`);
    return res.data;
  }
};

export const reportService = {
  getByProject: async (projectId) => {
    const res = await api.get(`/reports?projectId=${projectId}`);
    return res.data;
  },
  trigger: async (projectId) => {
    const res = await api.post('/reports/trigger', { projectId });
    return res.data;
  }
};

export const analyticsService = {
  getDashboard: async (projectId = '') => {
    const res = await api.get(`/analytics/dashboard?projectId=${projectId}`);
    return res.data;
  }
};

export default api;
