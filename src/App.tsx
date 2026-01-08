import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ImageCacheProvider } from './contexts/ImageCacheContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import ClientsList from './pages/ClientsList';
import AgenciesList from './pages/AgenciesList';
import ClientCustomsView from './pages/ClientCustomsView';
import ClientProfilePage from './pages/ClientProfilePage';
import AllCustoms from './pages/AllCustoms';
import PendingTeamApproval from './pages/PendingTeamApproval';
import PendingDelivery from './pages/PendingDelivery';
import PendingCompletion from './pages/PendingCompletion';
import MyCustoms from './pages/MyCustoms';
import PublicClientView from './pages/PublicClientView';
import PublicAgencyView from './pages/PublicAgencyView';
import AgencyMetrics from './pages/AgencyMetrics';
import AgencyClientsList from './pages/AgencyClientsList';
import AgencyAllCustoms from './pages/AgencyAllCustoms';
import MobileClientView from './pages/MobileClientView';
import { ClientChatsPage } from './pages/ClientChatsPage';
import UserApprovals from './pages/UserApprovals';
import Attendance from './pages/Attendance';
import Assignments from './pages/Assignments';
import PlatformAssignmentsOverview from './pages/PlatformAssignmentsOverview';
import Calls from './pages/Calls';
import ClientDataManagement from './pages/ClientDataManagement';
import SMSMessaging from './pages/SMSMessaging';
import SceneLibrary from './pages/SceneLibrary';
import SceneAssignments from './pages/SceneAssignments';
import SceneViewerPage from './pages/SceneViewerPage';
import SalesTracker from './pages/SalesTracker';
import SalesManagement from './pages/SalesManagement';
import PendingSalesApproval from './pages/PendingSalesApproval';
import AllSalesView from './pages/AllSalesView';
import ChatterPerformance from './pages/ChatterPerformance';
import NotificationsPage from './pages/NotificationsPage';
import PayrollSheet from './pages/PayrollSheet';
import DebugLogsPage from './pages/DebugLogsPage';
import VibeCheckPage from './pages/VibeCheckPage';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients" 
              element={
                <ProtectedRoute>
                  <ClientsList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agencies" 
              element={
                <ProtectedRoute>
                  <AgenciesList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/client-profile/:clientId" 
              element={
                <ProtectedRoute>
                  <ClientProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients/:clientUsername" 
              element={
                <ProtectedRoute>
                  <ClientCustomsView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customs" 
              element={
                <ProtectedRoute>
                  <AllCustoms />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-customs" 
              element={
                <ProtectedRoute>
                  <MyCustoms />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sales-tracker" 
              element={
                <ProtectedRoute>
                  <SalesTracker />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pending-approval" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <PendingTeamApproval />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pending-delivery" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <PendingDelivery />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pending-completion" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <PendingCompletion />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chats" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ClientChatsPage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/user-approvals" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <UserApprovals />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/attendance" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Attendance />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/assignments" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Assignments />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/platform-assignments" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <PlatformAssignmentsOverview />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/calls" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Calls />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/client-data" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ClientDataManagement />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/sms-messaging" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <SMSMessaging />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/scene-library" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <SceneLibrary />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/scene-assignments" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <SceneAssignments />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/sales-management" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <SalesManagement />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/sales-management/pending" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <PendingSalesApproval />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/sales-management/all-sales" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <AllSalesView />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/sales-management/performance" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <ChatterPerformance />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/notifications" 
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/payroll" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <PayrollSheet />
                </ProtectedRoute>
              }
            />
            <Route path="/:clientUsername" element={<PublicClientView />} />
            <Route path="/agency/:agencySlug" element={<PublicAgencyView />} />
            <Route path="/agency/:agencySlug/analytics" element={<AgencyMetrics />} />
            <Route path="/agency/:agencySlug/clients" element={<AgencyClientsList />} />
            <Route path="/agency/:agencySlug/all-customs" element={<AgencyAllCustoms />} />
            <Route path="/app/:clientUsername" element={<MobileClientView />} />
            <Route path="/app/:clientUsername/scene/:assignmentId" element={<SceneViewerPage />} />
            <Route path="/app/:clientUsername/vibe-check" element={<VibeCheckPage />} />
            <Route path="/debug-logs" element={<DebugLogsPage />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ImageCacheProvider>
          <Router>
            <AnimatedRoutes />
          </Router>
        </ImageCacheProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;