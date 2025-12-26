import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Pages
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import SetupWizardPage from "@/pages/SetupWizardPage";
import DashboardPage from "@/pages/DashboardPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import NewProjectPage from "@/pages/NewProjectPage";
import SetupGroupsPage from "@/pages/setup/SetupGroupsPage";
import SetupWorkItemsPage from "@/pages/setup/SetupWorkItemsPage";
import SetupRolesPage from "@/pages/setup/SetupRolesPage";
import SetupSettingsPage from "@/pages/setup/SetupSettingsPage";
import UsersPage from "@/pages/UsersPage";

// Layout
import DashboardLayout from "@/components/layout/DashboardLayout";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to setup wizard if setup not completed and user is admin
  if (!user.setup_completed && user.is_admin) {
    return <Navigate to="/setup-wizard" replace />;
  }
  
  return children;
};

// Setup Wizard Route - only for admins who haven't completed setup
const SetupWizardRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If setup is already completed, redirect to dashboard
  if (user.setup_completed) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }
  
  if (user) {
    // Check if setup is completed
    if (!user.setup_completed && user.is_admin) {
      return <Navigate to="/setup-wizard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      
      {/* Setup Wizard */}
      <Route path="/setup-wizard" element={<SetupWizardRoute><SetupWizardPage /></SetupWizardRoute>} />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<NewProjectPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="setup/groups" element={<SetupGroupsPage />} />
        <Route path="setup/workitems" element={<SetupWorkItemsPage />} />
        <Route path="setup/roles" element={<SetupRolesPage />} />
        <Route path="setup/settings" element={<SetupSettingsPage />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
            <Toaster position="top-right" richColors />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
