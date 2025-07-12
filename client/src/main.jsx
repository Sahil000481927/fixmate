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
import PayoutPage from './pages/PayoutPage';

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
            <CssBaseline/>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<LandingPage/>}/>
                    <Route path="/signup" element={<Signup/>}/>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/reset-password" element={<ResetPassword/>}/>
                    <Route path="/dashboard" element={
                        <PrivateRoute>
                            <Dashboard/>
                        </PrivateRoute>
                    }/>
                    <Route path="/requests" element={
                        <PrivateRoute>
                            <RequestList/>
                        </PrivateRoute>
                    }/>
                    <Route path="/requests/new" element={
                        <PrivateRoute>
                            <NewRequestForm/>
                        </PrivateRoute>
                    }/>
                    <Route path="/requests/board" element={
                        <PrivateRoute>
                            <RequestBoard/>
                        </PrivateRoute>
                    }/>
                    <Route path="/assignments" element={
                        <PrivateRoute>
                            <AssignmentsPage/>
                        </PrivateRoute>
                    }/>
                     <Route path="/teams" element={
                        <PrivateRoute>
                            <TeamsPage/>
                        </PrivateRoute>
                    }/>     
                    <Route path="/payout" element={
                        <PrivateRoute>
                            <PayoutPage/>
                        </PrivateRoute>
                    }/>
                    {/* Catch-all route for 404 */}
                    <Route path="*" element={<Login/>}/>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);