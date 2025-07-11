import React, {useMemo, useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import {createTheme, ThemeProvider, CssBaseline} from '@mui/material';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import LandingPage from './pages/LandingPage';
import NewRequestForm from './pages/NewRequestForm';
import RequestList from './pages/RequestList';
import RequestBoard from './pages/RequestBoard';
import AssignmentsPage from './pages/AssignmentsPage';
import TeamsPage from './pages/TeamsPage';
import MachinesPage from './pages/MachinesPage';
import { SnackbarProvider } from './components/FeedbackSnackbar';

const DEFAULT_MACHINE_TYPES = ['Lathe', 'Milling Machine', 'Drill Press', 'Grinder', 'CNC Machine'];

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
        () => createTheme({palette: {mode: darkMode ? 'dark' : 'light'}}),
        [darkMode]
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/requests" element={<PrivateRoute><RequestList /></PrivateRoute>} />
                        <Route path="requests/board" element={<PrivateRoute><RequestBoard /></PrivateRoute>} />
                        <Route path="/assignments" element={<PrivateRoute><AssignmentsPage /></PrivateRoute>} />
                        <Route path="/teams" element={<PrivateRoute><TeamsPage /></PrivateRoute>} />
                        <Route path="/machines" element={<PrivateRoute><MachinesPage /></PrivateRoute>} />
                        <Route path="/requests/new" element={<PrivateRoute><NewRequestForm /></PrivateRoute>} />
                    </Routes>
                </BrowserRouter>
            </SnackbarProvider>
        </ThemeProvider>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);