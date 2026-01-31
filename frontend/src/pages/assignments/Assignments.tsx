import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Avatar,
  LinearProgress,
  Fab,
  Tooltip,
  Badge,
  Container,
  Tabs,
  Tab,
  CardMedia,
  CardActions,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Assignment as AssignmentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  School as SchoolIcon,
  Category as CategoryIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  PlayArrow as StartIcon,
  TrendingUp as TrendingIcon,
  Book as BookIcon,
  Code as CodeIcon,
  Quiz as QuizIcon,
  Article as EssayIcon,
  Build as ProjectIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  Star as StarIcon,
  Schedule as ScheduleIcon,
  FolderOpen as FolderOpenIcon,
  MenuBook as MenuBookIcon,
  Today as TodayIcon,
  Event as EventIcon,
  EventAvailable as EventAvailableIcon,
} from '@mui/icons-material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import axios from 'axios';

interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  type: string;
  course: {
    _id: string;
    title: string;
    code: string;
  };
  instructor: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  isPublished: boolean;
  maxScore: number;
  submissions?: any[];
  createdAt: string;
}

interface Course {
  _id: string;
  title: string;
  code: string;
}

interface CreateAssignmentForm {
  title: string;
  description: string;
  dueDate: Date | null;
  courseId: string;
  type: string;
  attachment: string;
}

const assignmentTypes = [
  { value: 'essay', label: 'Essay' },
  { value: 'project', label: 'Project' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'code', label: 'Code Assignment' },
];

const Assignments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [formData, setFormData] = useState<CreateAssignmentForm>({
    title: '',
    description: '',
    dueDate: new Date(),
    courseId: '',
    type: 'project',
    attachment: '',
  });

  useEffect(() => {
    fetchAssignments();
    if (user?.role === 'teacher') {
      fetchCourses();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching assignments for role:', user?.role);
      console.log('Token exists:', !!token);
      
      let response;
      
      if (user?.role === 'student') {
        console.log('Making request to: /api/assignments/my/assignments');
        response = await axios.get('/api/assignments/my/assignments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Student assignments response:', response.data);
      } else if (user?.role === 'teacher') {
        console.log('Making request to: /api/assignments/my-assignments');
        response = await axios.get('/api/assignments/my-assignments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Teacher assignments response:', response.data);
      } else if (user?.role === 'admin') {
        console.log('Making request to: /api/assignments (all assignments)');
        response = await axios.get('/api/assignments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Admin assignments response:', response.data);
      }
      
      const fetchedAssignments = response?.data?.data?.assignments || response?.data || [];
      console.log('Fetched assignments count:', fetchedAssignments.length);
      setAssignments(Array.isArray(fetchedAssignments) ? fetchedAssignments : []);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      console.error('Error response:', error.response?.data);
      setError('Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/courses/my/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data.data?.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleCreateAssignment = async () => {
    try {
      setCreating(true);
      setError('');
      
      // Frontend validation
      if (!formData.title.trim()) {
        setError('Assignment title is required');
        return;
      }
      
      if (!formData.description.trim()) {
        setError('Assignment description is required');
        return;
      }
      
      if (!formData.courseId) {
        setError('Please select a course');
        return;
      }
      
      if (!formData.dueDate) {
        setError('Due date is required');
        return;
      }
      
      const token = localStorage.getItem('token');
      const payload = {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate?.toISOString(),
        courseId: formData.courseId,
        type: formData.type,
        ...(formData.attachment && { attachment: formData.attachment }),
      };

      const response = await axios.post('/api/assignments/create', payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSuccess('Assignment created successfully!');
        setSidebarOpen(false);
        fetchAssignments();
        resetForm();
      }
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      setError(error.response?.data?.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/assignments/${selectedAssignment._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Assignment deleted successfully!');
      setDeleteDialogOpen(false);
      setSelectedAssignment(null);
      fetchAssignments();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      dueDate: new Date(),
      courseId: '',
      type: 'project',
      attachment: '',
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'essay': return '#4caf50';
      case 'project': return '#2196f3';
      case 'quiz': return '#ff9800';
      case 'code': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getAssignmentColor = (type: string) => {
    switch (type) {
      case 'quiz': return '#e74c3c';
      case 'assignment': return '#3498db';
      case 'project': return '#2ecc71';
      case 'exam': return '#f39c12';
      case 'essay': return '#4caf50';
      case 'code': return '#9c27b0';
      default: return '#95a5a6';
    }
  };

  const getAssignmentIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <QuizIcon />;
      case 'assignment': return <AssignmentIcon />;
      case 'project': return <FolderOpenIcon />;
      case 'exam': return <MenuBookIcon />;
      case 'essay': return <EditIcon />;
      case 'code': return <CodeIcon />;
      default: return <AssignmentIcon />;
    }
  };

  const getStatusInfo = (assignment: any) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'overdue',
        text: 'Overdue',
        color: '#e74c3c',
        icon: <WarningIcon />
      };
    } else if (diffDays === 0) {
      return {
        status: 'due-today',
        text: 'Due Today',
        color: '#f39c12',
        icon: <TodayIcon />
      };
    } else if (diffDays <= 2) {
      return {
        status: 'due-soon',
        text: 'Due Soon',
        color: '#e67e22',
        icon: <ScheduleIcon />
      };
    } else if (diffDays <= 7) {
      return {
        status: 'this-week',
        text: 'This Week',
        color: '#3498db',
        icon: <EventIcon />
      };
    } else {
      return {
        status: 'upcoming',
        text: 'Upcoming',
        color: '#2ecc71',
        icon: <EventAvailableIcon />
      };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || assignment.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <Layout title="Assignments">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress size={60} />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout title="Assignments">
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Modern Header with Gradient Background */}
          <Card 
            sx={{ 
              mb: 4, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              overflow: 'visible'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    📚 Assignments Hub
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    {user?.role === 'teacher' ? 'Manage and track your assignments' : 'Your learning journey awaits'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {assignments.length}
                      </Typography>
                      <Typography variant="body2">Total Assignments</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {assignments.filter(a => getStatusInfo(a).status === 'upcoming').length}
                      </Typography>
                      <Typography variant="body2">Upcoming</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {assignments.filter(a => getStatusInfo(a).status === 'overdue').length}
                      </Typography>
                      <Typography variant="body2">Overdue</Typography>
                    </Box>
                  </Box>
                </Box>
                
                {user?.role === 'teacher' && (
                  <Fab
                    size="large"
                    onClick={() => navigate('/assignments/create')}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      '&:hover': { 
                        bgcolor: 'rgba(255,255,255,0.3)',
                        transform: 'scale(1.1)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <AddIcon sx={{ fontSize: 30 }} />
                  </Fab>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Alerts */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3, borderRadius: 2 }} 
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert 
              severity="success" 
              sx={{ mb: 3, borderRadius: 2 }} 
              onClose={() => setSuccess('')}
            >
              {success}
            </Alert>
          )}

          {/* Search and Filter Bar */}
          <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                  placeholder="Search assignments or courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  sx={{ 
                    flexGrow: 1, 
                    minWidth: 300,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
                
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Filter by Type</InputLabel>
                  <Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    label="Filter by Type"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    {assignmentTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getAssignmentIcon(type.value)}
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort by"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="dueDate">Due Date</MenuItem>
                    <MenuItem value="created">Created Date</MenuItem>
                    <MenuItem value="title">Title</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          {/* Modern Assignments Grid */}
          {filteredAssignments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Card sx={{ p: 6, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box 
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      borderRadius: '50%', 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3
                    }}
                  >
                    <AssignmentIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
                    {searchQuery || filterType !== 'all' ? 'No matching assignments' : 'No assignments yet'}
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
                    {user?.role === 'teacher' 
                      ? 'Create engaging assignments to help your students learn and grow!' 
                      : 'Your assignments will appear here once your instructors post them.'}
                  </Typography>
                  {user?.role === 'teacher' && (
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/assignments/create')}
                      sx={{
                        borderRadius: 3,
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Create Your First Assignment
                    </Button>
                  )}
                </Box>
              </Card>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {filteredAssignments.map((assignment) => {
                const statusInfo = getStatusInfo(assignment);
                const assignmentColor = getAssignmentColor(assignment.type);
                
                return (
                  <Box 
                    key={assignment._id}
                    sx={{ 
                      width: { xs: '100%', md: '50%', lg: '33.333%' },
                      p: 1 
                    }}
                  >
                    <Card 
                      sx={{ 
                        height: '100%',
                        borderRadius: 3,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'visible',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                        }
                      }}
                    >
                      {/* Status Badge */}
                      <Chip
                        icon={statusInfo.icon}
                        label={statusInfo.text}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 16,
                          right: 16,
                          bgcolor: statusInfo.color,
                          color: 'white',
                          fontWeight: 600,
                          zIndex: 1,
                          '& .MuiChip-icon': {
                            color: 'white'
                          }
                        }}
                      />

                      {/* Card Header with Type Icon */}
                      <Box 
                        sx={{ 
                          background: `linear-gradient(135deg, ${assignmentColor} 0%, ${alpha(assignmentColor, 0.8)} 100%)`,
                          color: 'white',
                          p: 3,
                          position: 'relative'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: 'rgba(255,255,255,0.2)',
                              border: '2px solid rgba(255,255,255,0.3)'
                            }}
                          >
                            {getAssignmentIcon(assignment.type)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              {assignment.title}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              {assignment.type.charAt(0).toUpperCase() + assignment.type.slice(1)} Assignment
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Course Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: alpha(assignmentColor, 0.1) }}>
                            <SchoolIcon sx={{ fontSize: 14, color: assignmentColor }} />
                          </Avatar>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {assignment.course?.title || 'Unknown Course'}
                          </Typography>
                        </Box>

                        {/* Description */}
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            mb: 3, 
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.6
                          }}
                        >
                          {assignment.description || 'No description available'}
                        </Typography>

                        {/* Due Date */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1, 
                          p: 2,
                          bgcolor: alpha(statusInfo.color, 0.1),
                          borderRadius: 2,
                          mb: 2
                        }}>
                          <CalendarIcon sx={{ fontSize: 18, color: statusInfo.color }} />
                          <Typography variant="body2" sx={{ color: statusInfo.color, fontWeight: 600 }}>
                            Due: {formatDate(assignment.dueDate)}
                          </Typography>
                        </Box>

                        {/* Instructor Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: alpha(theme.palette.text.secondary, 0.1) }}>
                            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 'bold' }}>
                              {assignment.instructor?.firstName?.[0] || 'T'}
                            </Typography>
                          </Avatar>
                          <Typography variant="body2" color="text.secondary">
                            {assignment.instructor ? 
                              `${assignment.instructor.firstName} ${assignment.instructor.lastName}` : 
                              'Unknown Instructor'
                            }
                          </Typography>
                        </Box>
                      </CardContent>

                      {/* Action Buttons */}
                      <CardActions sx={{ p: 3, pt: 0, justifyContent: 'space-between' }}>
                        <Button
                          startIcon={<ViewIcon />}
                          onClick={() => navigate(`/assignments/${assignment._id}`)}
                          sx={{ 
                            color: assignmentColor,
                            fontWeight: 600,
                            '&:hover': {
                              bgcolor: alpha(assignmentColor, 0.1)
                            }
                          }}
                        >
                          View Details
                        </Button>
                        
                        {user?.role === 'teacher' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton 
                              size="small" 
                              sx={{ 
                                color: theme.palette.primary.main,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              sx={{ 
                                color: theme.palette.error.main,
                                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                              }}
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </CardActions>
                    </Card>
                  </Box>
                );
              })}
            </Box>
          )}

        {/* Create Assignment Sidebar */}
        <Drawer
          anchor="right"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: { xs: '100%', sm: 400 },
              p: 3
            }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2">
              Create Assignment
            </Typography>
            <IconButton onClick={() => setSidebarOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Title */}
            <TextField
              label="Assignment Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
              helperText="Enter a clear, descriptive title for the assignment"
            />

            {/* Course Selection */}
            <FormControl fullWidth required>
              <InputLabel>Course</InputLabel>
              <Select
                value={formData.courseId}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                label="Course"
              >
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    <Box>
                      <Typography variant="body1">{course.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {course.code}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Assignment Type */}
            <FormControl fullWidth required>
              <InputLabel>Assignment Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="Assignment Type"
              >
                {assignmentTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Chip
                      label={type.label}
                      size="small"
                      sx={{
                        bgcolor: getTypeColor(type.value),
                        color: 'white',
                        mr: 1
                      }}
                    />
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Due Date */}
            <DateTimePicker
              label="Due Date"
              value={formData.dueDate}
              onChange={(date) => setFormData({ ...formData, dueDate: date })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  helperText: "Select when the assignment is due"
                }
              }}
            />

            {/* Description */}
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={4}
              fullWidth
              required
              helperText="Provide detailed instructions for the assignment"
            />

            {/* Attachment URL */}
            <TextField
              label="Attachment URL (Optional)"
              value={formData.attachment}
              onChange={(e) => setFormData({ ...formData, attachment: e.target.value })}
              fullWidth
              helperText="Link to any supporting materials or files"
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
                onClick={handleCreateAssignment}
                disabled={creating || !formData.title || !formData.courseId || !formData.dueDate}
                fullWidth
                sx={{ bgcolor: '#2196f3' }}
              >
                {creating ? <CircularProgress size={24} /> : 'Create'}
              </Button>
            </Box>
          </Box>
        </Drawer>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Assignment</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedAssignment?.title}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteAssignment} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        </Container>
      </LocalizationProvider>
    </Layout>
  );
};

export default Assignments;
