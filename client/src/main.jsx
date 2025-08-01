import React, { Suspense, useMemo, useEffect, useState } from 'react';
import { createTheme, ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SnackbarProvider } from './components/FeedbackSnackbar';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { auth } from './firebase-config';
import ReactDOM from 'react-dom/client';
// Pages (Lazy loaded)
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const RequestListPage = React.lazy(() => import('./pages/RequestListPage'));
const RequestBoardPage = React.lazy(() => import('./pages/RequestBoardPage'));
const AssignmentsPage = React.lazy(() => import('./pages/AssignmentsPage'));
const TeamsPage = React.lazy(() => import('./pages/TeamsPage'));
const MachinesPage = React.lazy(() => import('./pages/MachinesPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage'));
const CashoutPage = React.lazy(() => import('./pages/CashoutPage'));
const UnauthorizedPage = React.lazy(() => import('./pages/UnauthorizedPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

function SessionWatcher() {
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        const unsubscribe = auth.onIdTokenChanged((user) => {
            let path = location.pathname;
            // Treat empty path (e.g. "localhost:port") as "/"
            if (!path || path === "") path = "/";
            if (!user && path !== '/login' && path !== '/signup' && path !== '/') {
                navigate('/login', { replace: true });
            }
        });
        return unsubscribe;
    }, [navigate, location]);
    return null;
}

function App() {
    const getPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
    const [darkMode, setDarkMode] = useState(getPrefersDark());

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => setDarkMode(e.matches);
        mq.addEventListener('change', handleChange);
        return () => mq.removeEventListener('change', handleChange);
    }, []);

    const theme = useMemo(
        () => createTheme({ palette: { mode: darkMode ? 'dark' : 'light' } }),
        [darkMode]
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider>
                <ErrorBoundary>
                    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <SessionWatcher />
                        <Suspense fallback={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100vw' }}>
                            </Box>
                        }>
                            <Routes>
                                {/* Public routes */}
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/signup" element={<SignupPage />} />
                                <Route path="/reset-password" element={<ResetPasswordPage />} />
                                {/* Protected routes */}
                                <Route path="/dashboard" element={<PrivateRoute permission="viewDashboard"><DashboardPage /></PrivateRoute>} />
                                <Route path="/requests" element={<PrivateRoute permission="viewAllRequests"><RequestListPage /></PrivateRoute>} />
                                <Route path="/requests/board" element={<PrivateRoute permission="viewAllRequests"><RequestBoardPage /></PrivateRoute>} />
                                <Route path="/assignments" element={<PrivateRoute permission="getAssignmentsForUser"><AssignmentsPage /></PrivateRoute>} />
                                <Route path="/machines" element={<PrivateRoute permission="viewMachines"><MachinesPage /></PrivateRoute>} />
                                <Route path="/teams" element={<PrivateRoute permission="viewUsers"><TeamsPage /></PrivateRoute>} />
                                <Route path="/notifications" element={<PrivateRoute permission="viewNotifications"><NotificationsPage /></PrivateRoute>} />
                                <Route path="/history" element={<PrivateRoute permission="viewHistory"><HistoryPage /></PrivateRoute>} />
                                <Route path="/cashout" element={<PrivateRoute permission="viewCashout"><CashoutPage /></PrivateRoute>} />
                                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </Suspense>
                    </BrowserRouter>
                </ErrorBoundary>
            </SnackbarProvider>
        </ThemeProvider>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
