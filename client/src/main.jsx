import React from 'react';
import ReactDOM from 'react-dom/client';
import {createTheme, ThemeProvider, CssBaseline} from '@mui/material';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = createTheme({palette: {mode: prefersDark ? 'dark' : 'light'}});

const App = () => (
    <ThemeProvider theme={theme}>
        <CssBaseline/>
        <BrowserRouter>
            <Routes>
                <Route path="/signup" element={<Signup/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/reset-password" element={<ResetPassword/>}/>
                <Route path="/dashboard" element={
                    <PrivateRoute>
                        <Dashboard/>
                    </PrivateRoute>
                }/>
                <Route path="*" element={<Login/>}/> {/* Optional fallback route */}
            </Routes>
        </BrowserRouter>
    </ThemeProvider>
);

// Render the App component into the root element
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
