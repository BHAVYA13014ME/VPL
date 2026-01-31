import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  Avatar,
  Chip,
  AppBar,
  Toolbar,
  useScrollTrigger,
  CircularProgress,
} from '@mui/material';
import {
  School as SchoolIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  Star as StarIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface FeaturedCourse {
  _id: string;
  title: string;
  shortDescription: string;
  instructor: { firstName: string; lastName: string; avatar?: string };
  category: string;
  duration: number;
  enrollmentCount: number;
  rating: { average: number; count: number };
  lessons: { title: string }[];
  thumbnail?: string;
}

// Demo modules for the featured course card
const demoModules = [
  'Python Fundamentals & Syntax',
  'Object-Oriented Programming',
  'Web Development with Django',
  'API Development & Integration',
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [featuredCourse, setFeaturedCourse] = useState<FeaturedCourse | null>(null);
  const [stats, setStats] = useState({ students: 0, courses: 0, completion: 0, rating: 0 });
  const [loading, setLoading] = useState(true);

  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 50,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch featured/popular course
      const coursesRes = await axios.get('/api/courses/popular?limit=1');
      if (coursesRes.data.data.courses.length > 0) {
        setFeaturedCourse(coursesRes.data.data.courses[0]);
      }
      
      // Set demo stats (in real app, fetch from analytics API)
      setStats({
        students: 50000,
        courses: 200,
        completion: 95,
        rating: 4.8
      });
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 30%, #34495e 60%, #1a2332 100%)',
      color: 'white',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Smoky cloud effect overlays */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(52, 73, 94, 0.4) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(44, 62, 80, 0.3) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 80%, rgba(26, 35, 50, 0.5) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        opacity: 0.8
      }} />
      {/* Warm glow from card area */}
      <Box sx={{
        position: 'absolute',
        top: '15%',
        right: '10%',
        width: '40%',
        height: '50%',
        background: 'radial-gradient(circle, rgba(211, 84, 0, 0.12) 0%, transparent 60%)',
        pointerEvents: 'none',
        filter: 'blur(80px)'
      }} />

      {/* Navbar */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          background: trigger ? 'rgba(26, 35, 50, 0.95)' : 'rgba(26, 35, 50, 0.7)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          transition: 'all 0.3s ease'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1.5, px: { xs: 2, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: 2, 
              background: '#d97534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <SchoolIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Typography variant="h6" fontWeight="700" sx={{ 
              color: 'white',
              letterSpacing: '-0.5px',
              fontSize: '1.3rem'
            }}>
              EduVerse
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
              <Typography 
                component={Link} 
                to="/" 
                sx={{ 
                  color: 'white', 
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  '&:hover': { color: '#d97534' },
                  transition: 'color 0.2s'
                }}
              >
                Home
              </Typography>
              <Typography 
                component={Link} 
                to="/courses" 
                sx={{ 
                  color: 'rgba(255,255,255,0.85)', 
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  '&:hover': { color: '#d97534' },
                  transition: 'color 0.2s'
                }}
              >
                Courses
              </Typography>
              {isAuthenticated && (
                <Typography 
                  component={Link} 
                  to="/dashboard" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.85)', 
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    '&:hover': { color: '#d97534' },
                    transition: 'color 0.2s'
                  }}
                >
                  Dashboard
                </Typography>
              )}
            </Box>

            {isAuthenticated ? (
              <Avatar 
                src={user?.profile?.profilePicture} 
                sx={{ 
                  width: 40,
                  height: 40,
                  bgcolor: '#d97534',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  }
                }}
                onClick={() => navigate('/dashboard')}
              >
                {user?.firstName?.[0]}
              </Avatar>
            ) : (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="text"
                  onClick={() => navigate('/login')}
                  sx={{
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    px: 2,
                    '&:hover': {
                      color: '#d97534',
                      bgcolor: 'transparent'
                    }
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/signup')}
                  sx={{
                    bgcolor: '#d97534',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    boxShadow: '0 4px 15px rgba(217, 117, 52, 0.3)',
                    '&:hover': {
                      bgcolor: '#c86329',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 6px 20px rgba(217, 117, 52, 0.4)',
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  Sign Up
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Container maxWidth="xl" sx={{ pt: { xs: 14, md: 18 }, pb: 10, position: 'relative', zIndex: 1 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: 'center',
          gap: { xs: 6, lg: 8 }
        }}>
          {/* Left Content */}
          <Box sx={{ flex: 1, maxWidth: { lg: '55%' } }}>
            {/* AI Badge */}
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(217, 117, 52, 0.2)',
              border: '1px solid rgba(217, 117, 52, 0.3)',
              borderRadius: 5,
              px: 2.5,
              py: 1,
              mb: 4
            }}>
              <DotIcon sx={{ color: '#d97534', fontSize: 8 }} />
              <Typography sx={{ color: '#d97534', fontSize: '0.85rem', fontWeight: 600 }}>
                New: AI-Powered Learning Paths
              </Typography>
            </Box>

            {/* Main Heading */}
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: { xs: '2.8rem', sm: '3.5rem', md: '4.5rem' },
                fontWeight: 600,
                lineHeight: 1.1,
                mb: 3,
                letterSpacing: '-1px'
              }}
            >
              <Box component="span" sx={{ color: '#e8dcc4' }}>
                Learn to Code.
              </Box>
              <br />
              <Box component="span" sx={{ color: '#d97534' }}>
                Build Your Future.
              </Box>
            </Typography>

            {/* Subtitle */}
            <Typography 
              sx={{ 
                color: 'rgba(255,255,255,0.7)',
                mb: 5,
                maxWidth: 550,
                lineHeight: 1.7,
                fontSize: '1.05rem'
              }}
            >
              Join thousands of developers mastering in-demand skills with project-based courses taught by industry experts from Google, Meta, and Amazon.
            </Typography>

            {/* CTA Buttons */}
            <Box sx={{ display: 'flex', gap: 2.5, mb: 7, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/courses')}
                sx={{
                  background: 'linear-gradient(135deg, #d97534 0%, #c86329 100%)',
                  borderRadius: 2,
                  px: 4,
                  py: 1.8,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 10px 30px rgba(217, 117, 52, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #c86329 0%, #b7551f 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 15px 35px rgba(217, 117, 52, 0.5)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Browse Courses
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<PlayIcon />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: 2,
                  px: 4,
                  py: 1.8,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.6)',
                    bgcolor: 'rgba(255,255,255,0.08)',
                  }
                }}
              >
                Watch Demo
              </Button>
            </Box>

            {/* Stats */}
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 4, sm: 6 },
              flexWrap: 'wrap'
            }}>
              <Box>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: 'white', mb: 0.5 }}>
                  {stats.students.toLocaleString()}+
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  Active Students
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: 'white', mb: 0.5 }}>
                  {stats.courses}+
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  Expert Courses
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: 'white', mb: 0.5 }}>
                  {stats.completion}%
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  Completion Rate
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: 'white', mb: 0.5 }}>
                  {stats.rating}
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  Average Rating
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Featured Course Card */}
          <Box sx={{ flex: 1, maxWidth: { lg: '42%' }, width: '100%' }}>
            <Card sx={{
              background: 'linear-gradient(145deg, rgba(80, 50, 40, 0.7) 0%, rgba(60, 40, 35, 0.85) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(217, 117, 52, 0.2)',
              borderRadius: 4,
              overflow: 'visible',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(217, 117, 52, 0.15)'
            }}>
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                {/* Top Row - Badge and Rating */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Chip
                    label="Featured Course"
                    size="small"
                    sx={{
                      bgcolor: '#d97534',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 26,
                      borderRadius: 1.5
                    }}
                  />
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: 'rgba(0,0,0,0.4)',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                  }}>
                    <StarIcon sx={{ color: '#ffc107', fontSize: 16 }} />
                    <Typography fontWeight="600" fontSize="0.85rem" color="white">
                      4.9
                    </Typography>
                  </Box>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: '#d97534' }} />
                  </Box>
                ) : (
                  <>
                    {/* Course Title */}
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'white', mb: 0.5, fontSize: '1.5rem' }}>
                      {featuredCourse?.title || 'Complete Python Masterclass'}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, fontSize: '0.9rem' }}>
                      {featuredCourse?.shortDescription || 'From Zero to Professional Developer'}
                    </Typography>

                    {/* Course Modules */}
                    <Box sx={{ mb: 2.5 }}>
                      {(featuredCourse?.lessons?.slice(0, 4).map(l => l.title) || demoModules).map((module, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <CheckIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                          <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>
                            {module}
                          </Typography>
                        </Box>
                      ))}
                      <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', ml: 4.5, mt: 0.5 }}>
                        +2 more modules
                      </Typography>
                    </Box>

                    {/* Course Info - Duration & Students */}
                    <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.6)' }}>
                        <TimeIcon sx={{ fontSize: 18 }} />
                        <Typography sx={{ fontSize: '0.85rem' }}>
                          {featuredCourse?.duration || 42} hours
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.6)' }}>
                        <PeopleIcon sx={{ fontSize: 18 }} />
                        <Typography sx={{ fontSize: '0.85rem' }}>
                          {(featuredCourse?.enrollmentCount || 12847).toLocaleString()} students
                        </Typography>
                      </Box>
                    </Box>

                    {/* Instructor & Enroll Button */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      pt: 3,
                      borderTop: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar 
                          src={featuredCourse?.instructor?.avatar}
                          sx={{ 
                            width: 44, 
                            height: 44,
                            bgcolor: '#d97534',
                            fontSize: '1rem',
                            fontWeight: 600
                          }}
                        >
                          {featuredCourse?.instructor?.firstName?.[0] || 'S'}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: 'white', fontSize: '0.9rem', lineHeight: 1.3 }}>
                            {featuredCourse?.instructor 
                              ? `${featuredCourse.instructor.firstName} ${featuredCourse.instructor.lastName}`
                              : 'Dr. Sarah Chen'
                            }
                          </Typography>
                          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>
                            Senior Engineer at Google
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        onClick={() => navigate(featuredCourse ? `/courses/${featuredCourse._id}` : '/courses')}
                        sx={{
                          bgcolor: '#d4c4a8',
                          color: '#2c2418',
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 2,
                          px: 2.5,
                          py: 1.1,
                          fontSize: '0.85rem',
                          '&:hover': { 
                            bgcolor: '#c4b498',
                            transform: 'translateY(-1px)'
                          },
                          transition: 'all 0.2s'
                        }}
                      >
                        Enroll Now
                      </Button>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>

      {/* Footer */}
      <Box sx={{ 
        bgcolor: 'rgba(0,0,0,0.3)', 
        py: 4,
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: 1.5, 
                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <SchoolIcon sx={{ color: 'white', fontSize: 18 }} />
              </Box>
              <Typography fontWeight="600" fontSize="0.95rem">EduVerse</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
              © 2026 EduVerse. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
