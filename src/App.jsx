import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { SettingsProvider } from '@/lib/SettingsContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Customers from '@/pages/Customers';
import CustomerDetail from '@/pages/CustomerDetail';
import Jobs from '@/pages/Jobs';
import JobDetail from '@/pages/JobDetail';
import Materials from '@/pages/Materials';
import Bids from '@/pages/Bids';
import Invoices from '@/pages/Invoices';
import Appointments from '@/pages/Appointments';
import Reminders from '@/pages/Reminders';
import BlueprintScanner from '@/pages/BlueprintScanner';
import EmailCenter from '@/pages/EmailCenter';
import SettingsPage from '@/pages/SettingsPage';
import Suppliers from '@/pages/Suppliers';
import InvoiceDetail from '@/pages/InvoiceDetail';
import Reports from '@/pages/Reports';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-muted border-t-secondary rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading BreezeBoss...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/bids" element={<Bids />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/blueprint-scanner" element={<BlueprintScanner />} />
        <Route path="/email-center" element={<EmailCenter />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <SettingsProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
        </SettingsProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App