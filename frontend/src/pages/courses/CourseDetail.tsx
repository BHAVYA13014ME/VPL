import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Chip,
  Avatar,
  Rating,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Paper,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tab,
  Tabs,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PlayCircleOutline as PlayIcon,
  Article as ArticleIcon,
  Quiz as QuizIcon,
  PictureAsPdf as PdfIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  ArrowBack as ArrowBackIcon,
  PlayArrow as StartIcon,
  Language as LanguageIcon,
  Description as DescriptionIcon,
  VideoLibrary as VideoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

interface Lesson {
  _id: string;
  title: string;
  description?: string;
  content: string;
  type: 'video' | 'text' | 'pdf' | 'interactive' | 'quiz';
  videoUrl?: string;
  pdfUrl?: string;
  duration: number;
  order: number;
  isPublished: boolean;
  resources?: {
    title: string;
    url: string;
    type: 'link' | 'file' | 'video';
  }[];
  quiz?: {
    questions: {
      question: string;
      type: 'multiple_choice' | 'true_false' | 'short_answer';
      options: string[];
      correctAnswer?: string;
      explanation?: string;
      points: number;
    }[];
    passingScore: number;
    timeLimit: number;
  };
}

interface Course {
  _id: string;
  title: string;
  description: string;
  shortDescription?: string;
  instructor: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    profile?: {
      bio?: string;
    };
  };
  category: string;
  level: string;
  price: number;
  currency: string;
  thumbnail?: string;
  coverImage?: string;
  lessons: Lesson[];
  prerequisites: string[];
  learningOutcomes: string[];
  tags: string[];
  language: string;
  duration: number;
  isPublished: boolean;
  isPaid: boolean;
  enrollmentCount: number;
  rating: {
    average: number;
    count: number;
  };
  reviews: {
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    rating: number;
    comment?: string;
    createdAt: string;
  }[];
  createdAt: string;
}

interface EnrollmentInfo {
  enrolledAt: string;
  progress: number;
  completedLessons: string[];
}

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentInfo, setEnrollmentInfo] = useState<EnrollmentInfo | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedModule, setExpandedModule] = useState<string | false>(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [completingLesson, setCompletingLesson] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
    checkEnrollmentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log('Fetching course details for ID:', id);
      
      const response = await axios.get(`/api/courses/${id}`, { headers });
      
      console.log('Course details response:', response.data);
      
      if (response.data.success) {
        const courseData = response.data.data.course;
        setCourse(courseData);
        
        // Auto-expand first module
        if (courseData.lessons?.length > 0) {
          setExpandedModule('module-0');
        }
        
        // If user is the instructor of this course or admin, give them full access
        if (user && courseData.instructor) {
          const isInstructor = courseData.instructor._id === user._id;
          const isAdmin = user.role === 'admin';
          
          if (isInstructor || isAdmin) {
            setIsEnrolled(true);
            setEnrollmentInfo({
              enrolledAt: courseData.createdAt,
              progress: 100,
              completedLessons: courseData.lessons?.map((l: any) => l._id) || []
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching course:', error);
      setError(error.response?.data?.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) return;

      // Teachers and admins don't need to check enrollment - they have full access
      // They can view courses they created or have admin access to
      if (user.role === 'teacher' || user.role === 'admin') {
        // For teachers/admins, check if they're the instructor of this course
        // This will be determined when course data is fetched
        return;
      }

      // Only students need to check enrollment status
      if (user.role === 'student') {
        const response = await axios.get('/api/courses/my/enrolled', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          const enrolledCourse = response.data.data.courses.find(
            (c: any) => c._id === id
          );
          if (enrolledCourse) {
            setIsEnrolled(true);
            setEnrollmentInfo(enrolledCourse.enrollmentInfo);
          }
        }
      }
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.post(
        `/api/courses/${id}/enroll`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setIsEnrolled(true);
        setEnrollmentInfo({
          enrolledAt: response.data.data.enrolledAt,
          progress: 0,
          completedLessons: []
        });
        // Refresh course data
        fetchCourseDetails();
      }
    } catch (error: any) {
      console.error('Error enrolling:', error);
      setError(error.response?.data?.message || 'Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    try {
      setEnrolling(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`/api/courses/${id}/enroll`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setIsEnrolled(false);
        setEnrollmentInfo(null);
      }
    } catch (error: any) {
      console.error('Error unenrolling:', error);
      setError(error.response?.data?.message || 'Failed to unenroll from course');
    } finally {
      setEnrolling(false);
    }
  };

  const handleModuleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedModule(isExpanded ? panel : false);
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (isEnrolled || !course?.isPaid) {
      setSelectedLesson(lesson);
      setLessonDialogOpen(true);
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedLesson || !course) return;
    
    try {
      setCompletingLesson(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `/api/courses/${course._id}/lessons/${selectedLesson._id}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Update enrollment info with new progress
        setEnrollmentInfo(prev => ({
          ...prev!,
          progress: response.data.data.progress,
          completedLessons: response.data.data.completedLessons
        }));
        
        // Refresh course details to update UI
        await checkEnrollmentStatus();
      }
    } catch (error: any) {
      console.error('Error marking lesson as complete:', error);
      setError(error.response?.data?.message || 'Failed to mark lesson as complete');
    } finally {
      setCompletingLesson(false);
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayIcon color="primary" />;
      case 'text': return <ArticleIcon color="secondary" />;
      case 'pdf': return <PdfIcon color="error" />;
      case 'quiz': return <QuizIcon color="warning" />;
      default: return <DescriptionIcon />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return '#2ecc71';
      case 'intermediate': return '#f39c12';
      case 'advanced': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Group lessons into modules (every 5 lessons = 1 module)
  const groupLessonsIntoModules = (lessons: Lesson[]) => {
    const modules: { title: string; lessons: Lesson[] }[] = [];
    const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
    
    for (let i = 0; i < sortedLessons.length; i += 5) {
      const moduleIndex = Math.floor(i / 5) + 1;
      modules.push({
        title: `Module ${moduleIndex}`,
        lessons: sortedLessons.slice(i, i + 5)
      });
    }
    
    return modules;
  };

  if (loading) {
    return (
      <Layout title="Course Details">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Layout>
    );
  }

  if (error && !course) {
    return (
      <Layout title="Course Details">
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/courses')}>
            Back to Courses
          </Button>
        </Box>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout title="Course Details">
        <Box sx={{ p: 3 }}>
          <Alert severity="warning">Course not found</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/courses')} sx={{ mt: 2 }}>
            Back to Courses
          </Button>
        </Box>
      </Layout>
    );
  }

  const modules = groupLessonsIntoModules(course.lessons || []);
  const totalLessons = course.lessons?.length || 0;
  const completedLessons = enrollmentInfo?.completedLessons?.length || 0;
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <Layout title={course?.title || 'Course Details'}>
      <Box sx={{ pb: 4 }}>
        {/* Hero Section */}
        <Box
          sx={{
            background: course.coverImage 
              ? `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${course.coverImage})`
              : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'white',
            py: 6,
            px: 3,
          }}
        >
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Button 
              startIcon={<ArrowBackIcon />} 
              onClick={() => navigate('/courses')}
              sx={{ color: 'white', mb: 2 }}
            >
              Back to Courses
            </Button>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 60%' }, minWidth: 0 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={course.category} 
                    sx={{ bgcolor: alpha('#fff', 0.2), color: 'white' }} 
                  />
                  <Chip 
                    label={course.level} 
                    sx={{ bgcolor: getLevelColor(course.level), color: 'white' }} 
                  />
                  {course.isPaid ? (
                    <Chip label={`$${course.price}`} sx={{ bgcolor: '#f39c12', color: 'white' }} />
                  ) : (
                    <Chip label="Free" sx={{ bgcolor: '#2ecc71', color: 'white' }} />
                  )}
                </Box>
                
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                  {course.title}
                </Typography>
                
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 3 }}>
                  {course.shortDescription || course.description.substring(0, 150)}...
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rating value={course.rating.average} precision={0.1} readOnly size="small" />
                    <Typography>
                      {course.rating.average.toFixed(1)} ({course.rating.count} reviews)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PeopleIcon fontSize="small" />
                    <Typography>{course.enrollmentCount} students</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimeIcon fontSize="small" />
                    <Typography>{course.duration} hours</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <VideoIcon fontSize="small" />
                    <Typography>{totalLessons} lessons</Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={course.instructor.avatar} sx={{ width: 48, height: 48 }}>
                    {course.instructor.firstName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>Created by</Typography>
                    <Typography fontWeight="bold">
                      {course.instructor.firstName} {course.instructor.lastName}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 35%' }, minWidth: 0 }}>
                <Card sx={{ p: 3 }}>
                  {course.thumbnail && (
                    <Box
                      component="img"
                      src={course.thumbnail}
                      alt={course.title}
                      sx={{
                        width: '100%',
                        borderRadius: 1,
                        mb: 2,
                        aspectRatio: '16/9',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  
                  {isEnrolled && enrollmentInfo && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Your Progress
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={progressPercentage} 
                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {completedLessons} of {totalLessons} lessons completed ({Math.round(progressPercentage)}%)
                      </Typography>
                    </Box>
                  )}
                  
                  {!isEnrolled ? (
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<StartIcon />}
                      onClick={handleEnroll}
                      disabled={enrolling}
                      sx={{ mb: 2 }}
                    >
                      {enrolling ? <CircularProgress size={24} /> : (
                        course.isPaid ? `Enroll for $${course.price}` : 'Enroll for Free'
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        startIcon={<PlayIcon />}
                        onClick={() => {
                          if (course.lessons?.length > 0) {
                            handleLessonClick(course.lessons[0]);
                          }
                        }}
                        sx={{ mb: 1 }}
                      >
                        Continue Learning
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        color="error"
                        onClick={handleUnenroll}
                        disabled={enrolling}
                      >
                        Unenroll
                      </Button>
                    </>
                  )}
                  
                  {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    This course includes:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><VideoIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary={`${totalLessons} lessons`} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><TimeIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary={`${course.duration} hours of content`} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><LanguageIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary={course.language || 'English'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><SchoolIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Certificate of completion" />
                    </ListItem>
                  </List>
                </Card>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Content Section */}
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, mt: 4 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 60%' }, minWidth: 0 }}>
              {/* Tabs */}
              <Paper sx={{ mb: 3 }}>
                <Tabs 
                  value={activeTab} 
                  onChange={(_, value) => setActiveTab(value)}
                  variant="fullWidth"
                >
                  <Tab label="Curriculum" />
                  <Tab label="Overview" />
                  <Tab label="Reviews" />
                </Tabs>
              </Paper>

              {/* Curriculum Tab */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Course Content
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {modules.length} modules • {totalLessons} lessons • {course.duration} hours total
                  </Typography>
                  
                  {modules.map((module, moduleIndex) => (
                    <Accordion 
                      key={`module-${moduleIndex}`}
                      expanded={expandedModule === `module-${moduleIndex}`}
                      onChange={handleModuleChange(`module-${moduleIndex}`)}
                      sx={{ mb: 1 }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                          <Box>
                            <Typography fontWeight="bold">{module.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {module.lessons.length} lessons • {formatDuration(module.lessons.reduce((acc, l) => acc + l.duration, 0))}
                            </Typography>
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        <List disablePadding>
                          {module.lessons.map((lesson, lessonIndex) => {
                            const isCompleted = enrollmentInfo?.completedLessons?.includes(lesson._id);
                            const isLocked = !isEnrolled && course.isPaid;
                            
                            return (
                              <ListItem
                                key={lesson._id}
                                disablePadding
                                sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                              >
                                <ListItemButton
                                  onClick={() => handleLessonClick(lesson)}
                                  disabled={isLocked}
                                  sx={{ py: 2 }}
                                >
                                  <ListItemIcon>
                                    {isLocked ? (
                                      <LockIcon color="disabled" />
                                    ) : isCompleted ? (
                                      <CheckCircleIcon color="success" />
                                    ) : (
                                      getLessonIcon(lesson.type)
                                    )}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={
                                      <Typography fontWeight={isCompleted ? 'normal' : 'medium'}>
                                        {moduleIndex * 5 + lessonIndex + 1}. {lesson.title}
                                      </Typography>
                                    }
                                    secondary={
                                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Chip 
                                          label={lesson.type} 
                                          size="small" 
                                          variant="outlined"
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                          {formatDuration(lesson.duration)}
                                        </Typography>
                                      </Box>
                                    }
                                    secondaryTypographyProps={{ component: 'div' }}
                                  />
                                </ListItemButton>
                              </ListItem>
                            );
                          })}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}

              {/* Overview Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    About this course
                  </Typography>
                  <Typography paragraph sx={{ whiteSpace: 'pre-line' }}>
                    {course.description}
                  </Typography>
                  
                  {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        What you'll learn
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {course.learningOutcomes.map((outcome, index) => (
                          <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%' }, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                              <Typography variant="body2">{outcome}</Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Prerequisites
                      </Typography>
                      <List dense>
                        {course.prerequisites.map((prereq, index) => (
                          <ListItem key={index}>
                            <ListItemIcon><CheckCircleIcon color="primary" fontSize="small" /></ListItemIcon>
                            <ListItemText primary={prereq} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  {course.tags && course.tags.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Tags
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {course.tags.map((tag, index) => (
                          <Chip key={index} label={tag} variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {/* Reviews Tab */}
              {activeTab === 2 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Typography variant="h2" fontWeight="bold">
                      {course.rating.average.toFixed(1)}
                    </Typography>
                    <Box>
                      <Rating value={course.rating.average} precision={0.1} readOnly />
                      <Typography color="text.secondary">
                        {course.rating.count} reviews
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 3 }} />
                  
                  {course.reviews && course.reviews.length > 0 ? (
                    <List>
                      {course.reviews.map((review, index) => (
                        <React.Fragment key={index}>
                          <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                            <Avatar 
                              src={review.user?.avatar} 
                              sx={{ mr: 2 }}
                            >
                              {review.user?.firstName?.[0]}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography fontWeight="bold">
                                  {review.user?.firstName} {review.user?.lastName}
                                </Typography>
                                <Rating value={review.rating} size="small" readOnly />
                              </Box>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {new Date(review.createdAt).toLocaleDateString()}
                              </Typography>
                              {review.comment && (
                                <Typography>{review.comment}</Typography>
                              )}
                            </Box>
                          </ListItem>
                          {index < course.reviews.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Typography color="text.secondary">No reviews yet</Typography>
                  )}
                </Box>
              )}
            </Box>

            {/* Sidebar - Instructor Info */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 35%' }, minWidth: 0 }}>
              <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Instructor
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar 
                    src={course.instructor.avatar} 
                    sx={{ width: 64, height: 64 }}
                  >
                    {course.instructor.firstName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography fontWeight="bold">
                      {course.instructor.firstName} {course.instructor.lastName}
                    </Typography>
                  </Box>
                </Box>
                {course.instructor.profile?.bio && (
                  <Typography variant="body2" color="text.secondary">
                    {course.instructor.profile.bio}
                  </Typography>
                )}
              </Paper>
            </Box>
          </Box>
        </Box>

        {/* Lesson Content Dialog */}
        <Dialog
          open={lessonDialogOpen}
          onClose={() => setLessonDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          {selectedLesson && (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getLessonIcon(selectedLesson.type)}
                  <Typography variant="h6">{selectedLesson.title}</Typography>
                </Box>
                <IconButton onClick={() => setLessonDialogOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                {selectedLesson.type === 'video' && selectedLesson.videoUrl && (
                  <Box sx={{ mb: 2 }}>
                    <video
                      controls
                      style={{ width: '100%', maxHeight: '400px' }}
                      src={`${API_BASE_URL}${selectedLesson.videoUrl}`}
                    />
                  </Box>
                )}
                
                {selectedLesson.type === 'pdf' && selectedLesson.pdfUrl && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      href={`${API_BASE_URL}${selectedLesson.pdfUrl}`}
                      target="_blank"
                      startIcon={<PdfIcon />}
                    >
                      Open PDF
                    </Button>
                  </Box>
                )}
                
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {selectedLesson.content}
                </Typography>
                
                {selectedLesson.description && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body2">
                      {selectedLesson.description}
                    </Typography>
                  </Box>
                )}
                
                {selectedLesson.resources && selectedLesson.resources.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Resources
                    </Typography>
                    <List dense>
                      {selectedLesson.resources.map((resource, index) => (
                        <ListItem key={index}>
                          <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                          <ListItemText 
                            primary={
                              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                {resource.title}
                              </a>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                
                {selectedLesson.type === 'quiz' && selectedLesson.quiz && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      This lesson contains a quiz with {selectedLesson.quiz.questions.length} questions.
                      Passing score: {selectedLesson.quiz.passingScore}%
                      Time limit: {selectedLesson.quiz.timeLimit} minutes
                    </Alert>
                    <Button variant="contained" color="primary">
                      Start Quiz
                    </Button>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setLessonDialogOpen(false)}>Close</Button>
                {isEnrolled && selectedLesson && (
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleMarkComplete}
                    disabled={completingLesson || enrollmentInfo?.completedLessons?.includes(selectedLesson._id)}
                    startIcon={enrollmentInfo?.completedLessons?.includes(selectedLesson._id) ? <CheckCircleIcon /> : null}
                  >
                    {enrollmentInfo?.completedLessons?.includes(selectedLesson._id) 
                      ? 'Completed' 
                      : completingLesson 
                        ? <CircularProgress size={20} /> 
                        : 'Mark as Complete'
                    }
                  </Button>
                )}
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </Layout>
  );
};

export default CourseDetail;
