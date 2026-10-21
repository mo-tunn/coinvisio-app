import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, NotificationProvider } from './context';
import { useAuth } from './context';
import { ProtectedRoute } from './components';
import Index from './pages/Index/Index';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Intro from './pages/Intro/Intro';
import Dashboard from './pages/Dashboard/Dashboard';
import Coins from './pages/Coins/Coins';
import Recommendations from './pages/Recommendations/Recommendations';
import Anomalies from './pages/Anomalies/Anomalies';
import Signals from './pages/Signals/Signals';
import Profile from './pages/Profile/Profile';
import Notifications from './pages/Notifications/Notifications';
import HubLayout from './layouts/HubLayout';
import AuthChoice from './pages/AuthChoice/AuthChoice';
import './index.css';

const IntroGate = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();

  const pendingEmail = (localStorage.getItem('cv_intro_pending') || '').toLowerCase();
  const userEmail = (user?.email || '').toLowerCase();

  if (!pendingEmail || !userEmail) return children;

  const seenKey = `cv_intro_seen:${pendingEmail}`;
  const seen = localStorage.getItem(seenKey) === 'true';

  if (!seen && pendingEmail === userEmail && location.pathname !== '/intro') {
    return <Navigate to="/intro" replace />;
  }

  return children;
};

/**
 * Main App Component
 * Entry point for routing and global providers
 */
function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth-choice" element={<AuthChoice />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/intro" element={<Intro />} />
            <Route path="/hub" element={<ProtectedRoute><IntroGate><HubLayout /></IntroGate></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="coins" element={<Coins />} />
              <Route path="coins/:symbol" element={<Coins />} />
              <Route path="market-analysis" element={<Signals />} />
              <Route path="ai-insights" element={<Recommendations />} />
              <Route path="anomalies" element={<Anomalies />} />
              <Route path="profile" element={<Profile />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
