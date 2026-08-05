import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import PrivateRoute from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import StoryBoard from './pages/StoryBoard';
import SessionAudit from './pages/SessionAudit';

function AppLayout({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route 
              path="/" 
              element={
                <PrivateRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </PrivateRoute>
              } 
            />

            <Route 
              path="/projects" 
              element={
                <PrivateRoute>
                  <AppLayout>
                    <Projects />
                  </AppLayout>
                </PrivateRoute>
              } 
            />

            <Route 
              path="/board" 
              element={
                <PrivateRoute>
                  <AppLayout>
                    <StoryBoard />
                  </AppLayout>
                </PrivateRoute>
              } 
            />

            <Route 
              path="/sessions" 
              element={
                <PrivateRoute>
                  <AppLayout>
                    <SessionAudit />
                  </AppLayout>
                </PrivateRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ProjectProvider>
    </AuthProvider>
  );
}
