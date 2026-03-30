import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import RoomWorkspace from './pages/RoomWorkspace';
import AdminDashboard from './pages/AdminDashboard';
import UserSettings from './pages/UserSettings';
import FriendsPage from './pages/FriendsPage';
import ActivityFeedPage from './pages/ActivityFeedPage';
import { LiveblocksProvider } from "@liveblocks/react";
import { authEndpoint } from './liveblocks.config';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#000000] text-indigo-500">
      <div className="animate-pulse text-2xl font-bold tracking-tighter uppercase italic">COLLAB CODE HUB</div>
    </div>
  );

  if (!session) return <Navigate to="/auth" />;

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/friends"
        element={
          <ProtectedRoute>
            <FriendsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <ActivityFeedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <UserSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:roomId"
        element={
          <ProtectedRoute>
            <RoomWorkspace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/:roomId"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      {/* We use the standard LiveblocksProvider with authEndpoint */}
      <LiveblocksProvider authEndpoint={authEndpoint}>
        <BrowserRouter>
          <div className="relative min-h-screen w-full premium-gradient overflow-hidden">
            {/* Shifting Accent Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

            <div className="relative z-10 min-h-screen text-foreground font-sans antialiased">
              <AppRoutes />
            </div>
          </div>
        </BrowserRouter>
      </LiveblocksProvider>
    </AuthProvider>
  );
}

export default App;
