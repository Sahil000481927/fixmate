import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Container,
    Box,
    Paper,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import {useNavigate} from 'react-router-dom';
import {useAuthState} from 'react-firebase-hooks/auth';
import {auth} from '../firebase-config';

export default function LandingPage() {
    const navigate = useNavigate();
    const [user, loading] = useAuthState(auth);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (user && !loading) {
        navigate('/dashboard');
        return null;
    }

    return (
        <Box>
            {/* Top Navigation */}
            <AppBar
                position="static"
                elevation={0}
                sx={{
                    backgroundColor: theme.palette.mode === 'dark'
                        ? theme.palette.background.paper
                        : '#fff',
                    color: theme.palette.mode === 'dark'
                        ? theme.palette.text.primary
                        : '#000',
                    borderBottom: '1px solid',
                    borderColor: theme.palette.divider,
                }}
            >
                <Toolbar sx={{justifyContent: 'space-between'}}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                        <img
                            src="/logo.svg"
                            alt="FixMate"
                            style={{
                                width: 36,
                                height: 36,
                                filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none',
                            }}
                        />
                        <Typography variant="h6" sx={{fontWeight: 600}}>
                            FixMate
                        </Typography>
                    </Box>
                    <Box>
                        <Button color="inherit" onClick={() => navigate('/login')}>
                            Login
                        </Button>
                        <Button
                            variant="contained"
                            sx={{ml: 2}}
                            onClick={() => navigate('/signup')}
                        >
                            Sign Up
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Hero Section */}
            <Box
                sx={{
                    height: {xs: 500, md: 600},
                    backgroundImage: 'url("/hero.jpg")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    color: '#fff',
                    px: 2,
                }}
            >
                <Box
                    sx={{
                        maxWidth: 700,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        p: 4,
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="h3" sx={{fontWeight: 700, mb: 2}}>
                        Simplify Maintenance. Empower Teams.
                    </Typography>
                    <Typography variant="h6" sx={{mb: 4}}>
                        Report issues, assign tasks, and track progress—all in one clean interface.
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        sx={{mr: 2}}
                        onClick={() => navigate('/signup')}
                    >
                        Get Started
                    </Button>
                    <Button
                        variant="outlined"
                        size="large"
                        color="inherit"
                        onClick={() => navigate('/login')}
                    >
                        Login
                    </Button>
                </Box>
            </Box>

            {/* Features Section */}
            <Container maxWidth="lg" sx={{py: 10}}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: {xs: 'column', md: 'row'},
                        justifyContent: 'space-between',
                        gap: 4,
                    }}
                >
                    {[{
                        icon: <BuildIcon fontSize="inherit"/>,
                        title: "Easy Request Submission",
                        desc: "Submit maintenance issues with photos and priority in seconds.",
                    }, {
                        icon: <TrackChangesIcon fontSize="inherit"/>,
                        title: "Live Task Tracking",
                        desc: "Follow real-time progress with a Kanban-style board.",
                    }, {
                        icon: <NotificationsActiveIcon fontSize="inherit"/>,
                        title: "Real-Time Notifications",
                        desc: "Get instant updates on assignments and task resolution.",
                    }].map(({icon, title, desc}) => (
                        <Paper
                            key={title}
                            elevation={3}
                            sx={{
                                flex: 1,
                                p: 4,
                                minHeight: 240,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                backgroundColor: theme.palette.mode === 'dark'
                                    ? theme.palette.background.paper
                                    : '#fff',
                                color: theme.palette.text.primary,
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6,
                                }
                            }}
                        >
                            <Box sx={{fontSize: 48, color: 'primary.main', mb: 2}}>
                                {icon}
                            </Box>
                            <Typography variant="h6" sx={{fontWeight: 600, mb: 1}}>
                                {title}
                            </Typography>
                            <Typography color="text.secondary">{desc}</Typography>
                        </Paper>
                    ))}
                </Box>
            </Container>

            {/* How It Works Section */}
            <Box
                sx={{
                    bgcolor: theme.palette.mode === 'dark'
                        ? theme.palette.background.paper
                        : '#f9fafc',
                    py: 10
                }}
            >
                <Container maxWidth="lg">
                    <Typography variant="h4" align="center" sx={{fontWeight: 700, mb: 6}}>
                        How It Works
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: {xs: 'column', md: 'row'},
                            justifyContent: 'space-between',
                            gap: 4,
                        }}
                    >
                        {[
                            ["Submit a Request", "Operators report issues with photo and priority level."],
                            ["Assign to Technician", "Leads assign tasks based on expertise and location."],
                            ["Track Until Resolved", "Status updates reflect progress from pending to done."]
                        ].map(([title, desc], index) => (
                            <Paper
                                key={title}
                                elevation={2}
                                sx={{
                                    flex: 1,
                                    p: 4,
                                    textAlign: 'left',
                                    minHeight: 200,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    backgroundColor: theme.palette.mode === 'dark'
                                        ? theme.palette.background.default
                                        : '#fff',
                                    color: theme.palette.text.primary,
                                }}
                            >
                                <Typography variant="h6" sx={{fontWeight: 600}}>
                                    {`${index + 1}. ${title}`}
                                </Typography>
                                <Typography color="text.secondary">{desc}</Typography>
                            </Paper>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* Footer */}
            <Box sx={{py: 4, bgcolor: theme.palette.background.default, textAlign: 'center'}}>
                <Typography variant="body2" color="text.secondary">
                    © {new Date().getFullYear()} FixMate. All rights reserved.
                </Typography>
            </Box>
        </Box>
    );
}