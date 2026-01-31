import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Container,
  Chip,
  Avatar,
  CircularProgress,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  Backdrop,
  LinearProgress,
  Stack,
  Paper
} from '@mui/material';
import {
  School,
  Analytics,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
  Unpublished as UnpublishedIcon,

  SelectAll as SelectAllIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  instructor: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  enrollmentCount: number;
  isPublished: boolean;
  thumbnail?: string;
  createdAt: string;
  rating?: {
    average: number;
    count: number;
  };
}

const AdminCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info'}>({
    open: false, 
    message: '', 
    severity: 'info'
  });
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/courses/my/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const courseData = response.data?.data?.courses || response.data?.courses || response.data || [];
        setCourses(Array.isArray(courseData) ? courseData : []);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setCourses([]);
        setSnackbar({
          open: true,
          message: 'Failed to fetch courses',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleTogglePublish = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/courses/${courseId}/toggle-publish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCourses(courses.map(course => 
        course._id === courseId 
          ? { ...course, isPublished: !course.isPublished }
          : course
      ));
      
      setSnackbar({
        open: true,
        message: 'Course status updated successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update course status',
        severity: 'error'
      });
    }
  };

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
    if (selectedCourses.length === 0) return;
    
    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/courses/bulk-action', {
        action,
        courseIds: selectedCourses
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (action === 'delete') {
        setCourses(courses.filter(course => !selectedCourses.includes(course._id)));
      } else {
        setCourses(courses.map(course => 
          selectedCourses.includes(course._id)
            ? { ...course, isPublished: action === 'publish' }
            : course
        ));
      }
      
      setSelectedCourses([]);
      setSnackbar({
        open: true,
        message: `Bulk ${action} completed successfully`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to perform bulk ${action}`,
        severity: 'error'
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCourses.length === filteredCourses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(filteredCourses.map(course => course._id));
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = (course.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${course.instructor?.firstName || ''} ${course.instructor?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'published' && course.isPublished) ||
      (filterStatus === 'unpublished' && !course.isPublished);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout title="Course Management">
        <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout title="Course Management">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Course Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage all courses on the platform
          </Typography>
        </Box>

        {/* Search and Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 300 }}
                />
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Courses</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                    <MenuItem value="unpublished">Unpublished</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={<SelectAllIcon />}
                  onClick={handleSelectAll}
                  size="small"
                >
                  {selectedCourses.length === filteredCourses.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>
              
              {/* Bulk Actions */}
              {selectedCourses.length > 0 && (
                <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {selectedCourses.length} course(s) selected
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => handleBulkAction('publish')}
                      disabled={bulkActionLoading}
                      startIcon={<PublishIcon />}
                    >
                      Publish
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      onClick={() => handleBulkAction('unpublish')}
                      disabled={bulkActionLoading}
                      startIcon={<UnpublishedIcon />}
                    >
                      Unpublish
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      onClick={() => handleBulkAction('delete')}
                      disabled={bulkActionLoading}
                      startIcon={<DeleteIcon />}
                    >
                      Delete
                    </Button>
                  </Stack>
                  {bulkActionLoading && <LinearProgress sx={{ mt: 1 }} />}
                </Paper>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Statistics Summary */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 3 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', flex: 1 }}>
            <CardContent>
              <Typography variant="h4">{courses.length}</Typography>
              <Typography variant="body2">Total Courses</Typography>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText', flex: 1 }}>
            <CardContent>
              <Typography variant="h4">{courses.filter(c => c.isPublished).length}</Typography>
              <Typography variant="body2">Published</Typography>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: 'warning.main', color: 'warning.contrastText', flex: 1 }}>
            <CardContent>
              <Typography variant="h4">{courses.filter(c => !c.isPublished).length}</Typography>
              <Typography variant="body2">Drafts</Typography>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText', flex: 1 }}>
            <CardContent>
              <Typography variant="h4">{courses.reduce((sum, course) => sum + (course.enrollmentCount || 0), 0)}</Typography>
              <Typography variant="body2">Total Enrollments</Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* Course Grid */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Courses ({filteredCourses.length})
            </Typography>
            
            {filteredCourses.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <School sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No courses found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'No courses have been created yet'
                  }
                </Typography>
              </Box>
            ) : (
              <Box 
                sx={{ 
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    sm: 'repeat(2, 1fr)', 
                    md: 'repeat(3, 1fr)'
                  },
                  gap: 3
                }}
              >
                {filteredCourses.map((course) => (
                  <Card 
                    key={course._id}
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      position: 'relative',
                      border: selectedCourses.includes(course._id) ? 2 : 1,
                      borderColor: selectedCourses.includes(course._id) ? 'primary.main' : 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                      }
                    }}
                  >
                      <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
                        <Checkbox
                          checked={selectedCourses.includes(course._id)}
                          onChange={() => handleSelectCourse(course._id)}
                          sx={{ bgcolor: 'background.paper', borderRadius: '50%' }}
                        />
                      </Box>
                      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setSelectedCourse(course);
                          }}
                          sx={{ bgcolor: 'background.paper' }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                      
                      {course.thumbnail ? (
                        <Box
                          sx={{
                            height: 200,
                            backgroundImage: `url(${course.thumbnail})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 200,
                            bgcolor: 'grey.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <School sx={{ fontSize: 48, color: 'grey.400' }} />
                        </Box>
                      )}
                      
                      <CardContent sx={{ flexGrow: 1, pt: course.thumbnail ? 2 : 6 }}>
                        <Stack spacing={1} sx={{ mb: 2 }}>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                            <Chip
                              label={course.isPublished ? 'Published' : 'Draft'}
                              color={course.isPublished ? 'success' : 'warning'}
                              size="small"
                            />
                            <Chip
                              label={course.category || 'Uncategorized'}
                              variant="outlined"
                              size="small"
                            />
                            <Chip
                              label={course.level || 'Not specified'}
                              variant="outlined"
                              size="small"
                              color="info"
                            />
                          </Stack>
                        </Stack>
                        
                        <Typography variant="h6" component="h3" gutterBottom sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {course.title || 'Untitled Course'}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {course.description || 'No description available'}
                        </Typography>
                        
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                          <Avatar sx={{ width: 24, height: 24 }} />
                          <Typography variant="body2">
                            {course.instructor ? 
                              `${course.instructor.firstName} ${course.instructor.lastName}` : 
                              'No instructor assigned'
                            }
                          </Typography>
                        </Stack>
                        
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {course.enrollmentCount || 0} student{(course.enrollmentCount || 0) !== 1 ? 's' : ''}
                          </Typography>
                          {course.rating && course.rating.average !== undefined && course.rating.count !== undefined && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <TrendingUpIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                              <Typography variant="caption">
                                {course.rating.average.toFixed(1)} ({course.rating.count})
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                        
                        <Typography variant="caption" color="text.secondary">
                          Created: {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'Date not available'}
                        </Typography>
                      </CardContent>
                    </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => {
            navigate(`/courses/${selectedCourse?._id}`);
            setAnchorEl(null);
          }}>
            <VisibilityIcon sx={{ mr: 1 }} /> View Details
          </MenuItem>
          <MenuItem onClick={() => {
            if (selectedCourse) {
              handleTogglePublish(selectedCourse._id);
            }
            setAnchorEl(null);
          }}>
            {selectedCourse?.isPublished ? <UnpublishedIcon sx={{ mr: 1 }} /> : <PublishIcon sx={{ mr: 1 }} />}
            {selectedCourse?.isPublished ? 'Unpublish' : 'Publish'}
          </MenuItem>
          <MenuItem onClick={() => {
            navigate(`/admin/courses/${selectedCourse?._id}/analytics`);
            setAnchorEl(null);
          }}>
            <Analytics sx={{ mr: 1 }} /> View Analytics
          </MenuItem>
          <MenuItem 
            onClick={() => {
              setDeleteDialogOpen(true);
              setAnchorEl(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedCourse?.title}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedCourse) {
                  setSelectedCourses([selectedCourse._id]);
                  handleBulkAction('delete');
                }
                setDeleteDialogOpen(false);
              }} 
              color="error"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Loading Backdrop for bulk actions */}
        <Backdrop open={bulkActionLoading} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <CircularProgress color="inherit" />
        </Backdrop>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({...snackbar, open: false})}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({...snackbar, open: false})}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Layout>
  );
};

export default AdminCourses;