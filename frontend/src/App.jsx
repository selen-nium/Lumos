import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoutes';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import ModulePage from './pages/ModulePage';
import LearningStatsPage from './pages/LearningStatsPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import InboxPage from './pages/InboxPage';
import MessagesPage from './pages/MessagesPage';
import StudyGroupsPage from './pages/StudyGroupsPage';
import GroupChatPage from './pages/GroupChatPage';
// import AdminPage from './pages/AdminPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Protected routes */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />
          
          <Route path="/home" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          
          <Route path="/module/:moduleId" element={
            <ProtectedRoute>
              <ModulePage />
            </ProtectedRoute>
          } />
          
          <Route path="/stats" element={
            <ProtectedRoute>
              <LearningStatsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/community" element={
            <ProtectedRoute>
              <CommunityPage />
            </ProtectedRoute>
          } />
          
          <Route path="/inbox" element={
            <ProtectedRoute>
              <InboxPage />
            </ProtectedRoute>
          } />
          
          <Route path="/messages/:connectionId" element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          } />

          <Route path="/study-groups" element={
            <ProtectedRoute>
              <StudyGroupsPage />
            </ProtectedRoute>
          } />

          <Route path="/study-groups/:groupId" element={
            <ProtectedRoute>
              <GroupChatPage />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Admin route
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPage />
            </ProtectedRoute>
          } /> */}
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;