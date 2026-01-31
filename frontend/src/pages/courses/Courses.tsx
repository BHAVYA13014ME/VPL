import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Drawer,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Avatar,
  Rating,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  Container,
  useTheme,
  alpha,
  InputAdornment,
  Fab,
  Snackbar,
  Backdrop
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
  Star as StarIcon,
  AccessTime as TimeIcon,
  Category as CategoryIcon,
  Assignment as AssignmentIcon,
  PlayArrow as PlayIcon,
  BookmarkBorder as BookmarkIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingIcon,
  Class as ClassIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  MonetizationOn as PaidIcon,
  LockOpen as FreeIcon,
  Language as LanguageIcon,
  Computer as ComputerIcon,
  Brush as BrushIcon,
  Business as BusinessIcon,
  Psychology as PsychologyIcon,
  PhotoCamera as PhotoIcon,
  MusicNote as MusicIcon,
  FitnessCenter as FitnessIcon,
  Science as ScienceIcon,
  Functions as MathIcon,
  MoreHoriz as MoreIcon,
  Publish as PublishIcon,
  Unpublished as UnpublishedIcon,
  Folder as FolderIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import axios from 'axios';
import '../../styles/Courses.css';

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
  };
  category: string;
  level: string;
  price: number;
  duration: number;
  thumbnail?: string;
  coverImage?: string;
  isPublished: boolean;
  isPaid: boolean;
  enrollmentCount: number;
  rating: {
    average: number;
    count: number;
  };
  tags: string[];
  prerequisites: string[];
  learningOutcomes: string[];
  totalLessons?: number;
  publishedLessons?: number;
  createdAt: string;
  isEnrolled?: boolean;
  enrollmentInfo?: {
    enrolledAt: string;
    progress: number;
    completedLessons: any[];
    grade?: number;
  };
}

interface CreateCourseForm {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  level: string;
  price: number;
  duration: number;
  prerequisites: string[];
  learningOutcomes: string[];
  tags: string[];
  thumbnail: string;
  coverImage: string;
  isPublished: boolean;
  isPaid: boolean;
}

const categories = [
  { value: 'programming', label: 'Programming' },
  { value: 'design', label: 'Design' },
  { value: 'business', label: 'Business' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'photography', label: 'Photography' },
  { value: 'music', label: 'Music' },
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'language', label: 'Language' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'science', label: 'Science' },
  { value: 'other', label: 'Other' }
];

const levels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

// Helper functions for icons and colors
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'programming': return <ComputerIcon />;
    case 'design': return <BrushIcon />;
    case 'business': return <BusinessIcon />;
    case 'marketing': return <TrendingIcon />;
    case 'photography': return <PhotoIcon />;
    case 'music': return <MusicIcon />;
    case 'health': return <PsychologyIcon />;
    case 'fitness': return <FitnessIcon />;
    case 'language': return <LanguageIcon />;
    case 'mathematics': return <MathIcon />;
    case 'science': return <ScienceIcon />;
    default: return <SchoolIcon />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'programming': return '#3498db';
    case 'design': return '#e74c3c';
    case 'business': return '#2ecc71';
    case 'marketing': return '#f39c12';
    case 'photography': return '#9b59b6';
    case 'music': return '#e67e22';
    case 'health': return '#1abc9c';
    case 'fitness': return '#e74c3c';
    case 'language': return '#f39c12';
    case 'mathematics': return '#3498db';
    case 'science': return '#2ecc71';
    default: return '#95a5a6';
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

const Courses: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const [formData, setFormData] = useState<CreateCourseForm>({
    title: '',
    description: '',
    shortDescription: '',
    category: 'programming',
    level: 'beginner',
    price: 0,
    duration: 0,
    prerequisites: [],
    learningOutcomes: [],
    tags: [],
    thumbnail: '',
    coverImage: '',
    isPublished: false,
    isPaid: false
  });

  const theme = useTheme();

  useEffect(() => {
    fetchCourses();
  }, [user, activeTab]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      let response;
      
      console.log('=== Fetching Courses ===');
      console.log('Active Tab:', activeTab);
      console.log('User Role:', user?.role);
      console.log('Token exists:', !!token);
      
      if (activeTab === 0) {
        // All courses or browsing
        const url = '/api/courses';
        
        // Build params object - only include non-empty values
        const params: any = {};
        if (filterCategory && filterCategory !== 'all') {
          params.category = filterCategory;
        }
        if (filterLevel && filterLevel !== 'all') {
          params.level = filterLevel;
        }
        if (searchQuery && searchQuery.trim()) {
          params.search = searchQuery.trim();
        }
        
        console.log('Calling:', url);
        console.log('Params:', params);
        
        if (user?.role === 'student') {
          // For students, show all published courses
          response = await axios.get(url, { params });
        } else {
          // For teachers, show all courses
          response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            params
          });
        }
      } else if (activeTab === 1) {
        // My courses
        const url = user?.role === 'student' 
          ? '/api/courses/my/enrolled' 
          : '/api/courses/my/courses';
        
        console.log('Calling:', url);
        
        if (user?.role === 'student') {
          response = await axios.get('/api/courses/my/enrolled', {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else if (user?.role === 'teacher') {
          response = await axios.get('/api/courses/my/courses', {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
      
      console.log('Response received:', response?.data);
      console.log('Courses count:', response?.data?.data?.courses?.length || 0);
      
      setCourses(response?.data?.data?.courses || []);
    } catch (error: any) {
      console.error('=== Error fetching courses ===');
      console.error('Error object:', error);
      console.error('Response data:', error?.response?.data);
      console.error('Response status:', error?.response?.status);
      console.error('Message:', error?.message);
      setError(error?.response?.data?.message || 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    try {
      setCreating(true);
      setError('');
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please log in to create a course');
        return;
      }

      if (user?.role !== 'teacher' && user?.role !== 'admin') {
        setError('Only teachers can create courses. Your current role: ' + (user?.role || 'unknown'));
        return;
      }

      if (!formData.title.trim() || formData.title.trim().length < 5) {
        setError('Course title must be at least 5 characters long');
        return;
      }

      if (!formData.description.trim() || formData.description.trim().length < 20) {
        setError('Course description must be at least 20 characters long');
        return;
      }

      if (!formData.category) {
        setError('Please select a course category');
        return;
      }

      const payload = {
        ...formData,
        prerequisites: formData.prerequisites.filter(p => p.trim()),
        learningOutcomes: formData.learningOutcomes.filter(l => l.trim()),
        tags: formData.tags.filter(t => t.trim())
      };

      console.log('Creating course with payload:', payload);
      console.log('User role:', user?.role);
      console.log('Token exists:', !!token);

      const response = await axios.post('/api/courses/create', payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Course creation response:', response.data);

      if (response.data.success) {
        setSuccess('Course created successfully!');
        setSidebarOpen(false);
        fetchCourses();
        resetForm();
      }
    } catch (error: any) {
      console.error('Error creating course:', error);
      console.error('Error response:', error.response?.data);
      
      // Log the specific validation errors
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
        error.response.data.errors.forEach((validationError: any, index: number) => {
          console.error(`Validation Error ${index + 1}:`, validationError);
        });
      }
      
      if (error.response?.status === 403) {
        setError('Access denied. You must be a teacher to create courses.');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (error.response?.status === 400 && error.response?.data?.errors) {
        // Show specific validation errors
        const errorMessages = error.response.data.errors.map((err: any) => 
          `${err.path || err.param || 'Field'}: ${err.msg || err.message}`
        ).join('; ');
        setError(`Validation failed: ${errorMessages}`);
      } else {
        setError(error.response?.data?.message || 'Failed to create course');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/courses/${selectedCourse._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Course deleted successfully!');
      setDeleteDialogOpen(false);
      setSelectedCourse(null);
      fetchCourses();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete course');
    }
  };

  const handleEnrollInCourse = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/courses/${courseId}/enroll`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Successfully enrolled in course!');
      fetchCourses();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to enroll in course');
    }
  };

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/courses/${courseId}`, 
        { isPublished: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setSuccess(`Course ${!currentStatus ? 'published' : 'unpublished'} successfully!`);
      fetchCourses();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update course status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      shortDescription: '',
      category: 'programming',
      level: 'beginner',
      price: 0,
      duration: 0,
      prerequisites: [],
      learningOutcomes: [],
      tags: [],
      thumbnail: '',
      coverImage: '',
      isPublished: false,
      isPaid: false
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      programming: '#2196f3',
      design: '#9c27b0',
      business: '#ff9800',
      marketing: '#e91e63',
      photography: '#4caf50',
      music: '#ff5722',
      health: '#8bc34a',
      fitness: '#ff5722',
      language: '#607d8b',
      mathematics: '#3f51b5',
      science: '#009688',
      other: '#795548'
    };
    return colors[category] || '#757575';
  };

  const formatDuration = (duration: number) => {
    if (duration < 1) return `${Math.round(duration * 60)} minutes`;
    if (duration === 1) return '1 hour';
    return `${duration} hours`;
  };

  if (loading) {
    return (
      <Layout title="Courses">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout title="Courses">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Modern Header with Gradient */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 30%, #34495e 60%, #1a2332 100%)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Background Pattern */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              opacity: 0.5
            }}
          />
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
            <Box sx={{ flex: { xs: 1, md: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    width: 64,
                    height: 64
                  }}
                >
                  <SchoolIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Learning Courses
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    {user?.role === 'teacher' 
                      ? 'Create and manage your educational content' 
                      : 'Discover courses that match your interests'}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {courses.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Total Courses
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {courses.filter(c => c.isPublished).length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Published
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {categories.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Categories
                  </Typography>
                </Box>
              </Box>
              
              {/* Create Course FAB */}
              {user?.role === 'teacher' && (
                <Fab
                  color="secondary"
                  sx={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.3)',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => setSidebarOpen(true)}
                >
                  <AddIcon />
                </Fab>
              )}
            </Box>
          </Box>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Modern Search and Filter Bar */}
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
              <Box sx={{ flex: { xs: 1, md: 1 } }}>
                <TextField
                  fullWidth
                  placeholder="Search courses by title, description, or instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      bgcolor: alpha('#667eea', 0.05),
                      '&:hover': {
                        bgcolor: alpha('#667eea', 0.08),
                      },
                      '&.Mui-focused': {
                        bgcolor: alpha('#667eea', 0.1),
                      }
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ flex: { xs: 1, sm: 0.5, md: 0.25 } }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="Category"
                    sx={{ borderRadius: 3 }}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getCategoryIcon(cat.value)}
                          {cat.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ flex: { xs: 1, sm: 0.5, md: 0.25 } }}>
                <FormControl fullWidth>
                  <InputLabel>Level</InputLabel>
                  <Select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    label="Level"
                    sx={{ borderRadius: 3 }}
                  >
                    <MenuItem value="">All Levels</MenuItem>
                    {levels.map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        <Chip
                          label={level.label}
                          size="small"
                          sx={{
                            bgcolor: getLevelColor(level.value),
                            color: 'white',
                            mr: 1
                          }}
                        />
                        {level.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Box sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                borderRadius: 3,
                mx: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                '&.Mui-selected': {
                  bgcolor: alpha('#667eea', 0.1),
                  color: '#667eea'
                }
              }
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon />
                  {user?.role === 'student' ? 'Browse Courses' : 'All Courses'}
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BookmarkIcon />
                  {user?.role === 'student' ? 'My Enrolled Courses' : 'My Created Courses'}
                </Box>
              } 
            />
          </Tabs>
        </Box>

        {/* Course Grid */}

        {/* Courses Grid */}
        <Box className="courses-grid">
          {courses.length === 0 ? (
            <Box sx={{ gridColumn: '1 / -1' }} className="courses-empty">
              <SchoolIcon className="courses-empty-icon" />
              <Typography variant="h5" className="courses-empty-text">
                No courses found
              </Typography>
              <Typography variant="body1" className="courses-empty-subtext">
                {user?.role === 'teacher' 
                  ? 'Create your first course to get started!' 
                  : activeTab === 0 
                    ? 'No courses match your criteria.' 
                    : 'You haven\'t enrolled in any courses yet.'}
              </Typography>
            </Box>
          ) : (
            courses.map((course) => (
              <Card 
                key={course._id}
                className="course-card"
                onClick={() => navigate(`/courses/${course._id}`)}
              >
                {/* Course Header with Gradient Background */}
                <Box className={`course-card-header ${course.category}`}>
                  {/* More Options Menu */}
                  {user?.role === 'teacher' && course.instructor?._id === user?._id && (
                    <Box className="course-more-menu">
                      <IconButton 
                        className="course-more-btn"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourse(course);
                        }}
                      >
                        <MoreIcon />
                      </IconButton>
                    </Box>
                  )}
                  
                  {/* Price Tag */}
                  {course.price > 0 ? (
                    <Box className="course-price-tag">
                      ${course.price}
                    </Box>
                  ) : (
                    <Box className="course-price-tag free">
                      FREE
                    </Box>
                  )}

                  {/* Course Title and Subtitle */}
                  <Box>
                    <Typography className="course-card-title">
                      {course.title}
                    </Typography>
                    <Typography className="course-card-subtitle">
                      {course.category.charAt(0).toUpperCase() + course.category.slice(1)} • {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                    </Typography>
                  </Box>

                  {/* Instructor Avatar */}
                  <Box className="course-instructor-avatar">
                    {course.instructor?.avatar ? (
                      <img src={course.instructor.avatar} alt={course.instructor.firstName} />
                    ) : (
                      <PersonIcon sx={{ fontSize: 32, color: getCategoryColor(course.category) }} />
                    )}
                  </Box>
                </Box>

                {/* Course Body */}
                <Box className="course-card-body">
                  {/* Instructor Name */}
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {course.instructor ? 
                      `${course.instructor.firstName} ${course.instructor.lastName}` : 
                      'Unknown Instructor'
                    }
                  </Typography>

                  {/* Description */}
                  <Typography className="course-description">
                    {course.shortDescription || course.description}
                  </Typography>

                  {/* Badges */}
                  <Box className="course-badges">
                    {user?.role === 'teacher' && course.instructor?._id === user?._id && (
                      <Chip
                        className={`course-badge ${course.isPublished ? 'published' : 'draft'}`}
                        label={course.isPublished ? 'Published' : 'Draft'}
                        size="small"
                        icon={course.isPublished ? <CheckCircleIcon /> : <ScheduleIcon />}
                      />
                    )}
                    {course.isEnrolled && (
                      <Chip
                        className="course-badge enrolled"
                        label="Enrolled"
                        size="small"
                        icon={<CheckCircleIcon />}
                      />
                    )}
                  </Box>

                  {/* Progress Bar (if enrolled) */}
                  {course.enrollmentInfo && (
                    <Box className="course-progress">
                      <Box className="course-progress-bar">
                        <Box 
                          className="course-progress-fill" 
                          sx={{ width: `${course.enrollmentInfo.progress}%` }}
                        />
                      </Box>
                      <Typography className="course-progress-text">
                        {course.enrollmentInfo.progress}% Complete
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Course Footer */}
                <Box className="course-card-footer">
                  {/* Meta Information */}
                  <Box className="course-meta">
                    <Box className="course-meta-item">
                      <PeopleIcon sx={{ fontSize: 16 }} />
                      <Typography variant="caption">{course.enrollmentCount}</Typography>
                    </Box>
                    <Box className="course-meta-item">
                      <TimeIcon sx={{ fontSize: 16 }} />
                      <Typography variant="caption">{formatDuration(course.duration)}</Typography>
                    </Box>
                    {course.rating.count > 0 && (
                      <Box className="course-meta-item course-rating">
                        <StarIcon sx={{ fontSize: 16, color: '#ffa726' }} />
                        <Typography variant="caption">{course.rating.average.toFixed(1)}</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Action Buttons */}
                  <Box className="course-actions">
                    {user?.role === 'teacher' && course.instructor?._id === user?._id ? (
                      <>
                        <IconButton 
                          className="course-action-btn"
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/courses/${course._id}/manage`);
                          }}
                          title="Edit Course"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          className="course-action-btn"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePublish(course._id, course.isPublished);
                          }}
                          title={course.isPublished ? 'Unpublish Course' : 'Publish Course'}
                          sx={{
                            color: course.isPublished ? '#ff9800' : '#4caf50'
                          }}
                        >
                          {course.isPublished ? <UnpublishedIcon fontSize="small" /> : <PublishIcon fontSize="small" />}
                        </IconButton>
                        <IconButton 
                          className="course-action-btn"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCourse(course);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete Course"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton className="course-action-btn" size="small">
                          <FolderIcon fontSize="small" />
                        </IconButton>
                        <IconButton className="course-action-btn" size="small">
                          <MoreIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </Box>
              </Card>
            ))
          )}
        </Box>

        {/* Create Course Sidebar */}
        <Drawer
          anchor="right"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: { xs: '100%', sm: 500 },
              p: 3
            }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2">
              Create Course
            </Typography>
            <IconButton onClick={() => setSidebarOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Title */}
            <TextField
              label="Course Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
              helperText="Enter a clear, descriptive title (minimum 5 characters)"
            />

            {/* Short Description */}
            <TextField
              label="Short Description"
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              fullWidth
              multiline
              rows={2}
              helperText="Brief overview that will appear in course cards"
            />

            {/* Description */}
            <TextField
              label="Full Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={4}
              fullWidth
              required
              helperText="Detailed description of what students will learn (minimum 20 characters)"
            />

            {/* Category */}
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Level */}
            <FormControl fullWidth required>
              <InputLabel>Level</InputLabel>
              <Select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                label="Level"
              >
                {levels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Price and Duration */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Price ($)"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
              />
              <TextField
                label="Duration (hours)"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                fullWidth
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Box>

            {/* Thumbnail and Cover Image URLs */}
            <TextField
              label="Thumbnail URL (Optional)"
              value={formData.thumbnail}
              onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
              fullWidth
              helperText="URL to course thumbnail image"
            />

            <TextField
              label="Cover Image URL (Optional)"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              fullWidth
              helperText="URL to course cover image"
            />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setSidebarOpen(false)}
                fullWidth
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateCourse}
                disabled={creating || !formData.title || !formData.description || !formData.category}
                fullWidth
                sx={{ bgcolor: '#2196f3' }}
              >
                {creating ? <CircularProgress size={24} /> : 'Create Course'}
              </Button>
            </Box>
          </Box>
        </Drawer>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Course</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedCourse?.title}"? This action cannot be undone and will remove all associated data.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteCourse} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default Courses;
