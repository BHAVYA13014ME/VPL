import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Tooltip,
  LinearProgress,
  Snackbar,
  Skeleton,
  Alert as MuiAlert,
  Fade
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VideoLibrary as VideoIcon,
  Article as ArticleIcon,
  PictureAsPdf as PdfIcon,
  Quiz as QuizIcon,
  PlayCircle as PlayIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIcon,
  CloudUpload as UploadIcon,
  Announcement as AnnouncementIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AttachFile as AttachFileIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

interface Lesson {
  _id: string;
  title: string;
  description: string;
  content: string;
  type: 'video' | 'text' | 'pdf' | 'interactive' | 'quiz';
  videoUrl?: string;
  pdfUrl?: string;
  duration: number;
  order: number;
  isPublished: boolean;
  resources: { title: string; url: string; type: string }[];
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  isImportant: boolean;
  attachments?: { filename: string; originalName: string; path: string; size: number; mimeType: string }[];
  createdAt: string;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  lessons: Lesson[];
  announcements: Announcement[];
  enrollmentCount: number;
  isPublished: boolean;
}

const menuItems = [
  { text: 'Dashboard', icon: <SchoolIcon />, path: '/teacher' },
  { text: 'My Courses', icon: <SchoolIcon />, path: '/courses' },
  { text: 'Assignments', icon: <AssignmentIcon />, path: '/assignments' },
];

const TeacherCourseManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info'}>({open: false, message: '', severity: 'info'});
  const [success, setSuccess] = useState('');

  // Lesson Dialog State
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    content: '',
    type: 'text' as 'video' | 'text' | 'pdf' | 'interactive' | 'quiz',
    duration: 0,
    isPublished: false,
  });
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);

  // Announcement Dialog State
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    isImportant: false,
  });
  const [announcementFiles, setAnnouncementFiles] = useState<File[]>([]);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  // Delete Confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'lesson' | 'announcement'; id: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourse(response.data.data.course);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch course');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLessonDialog = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        description: lesson.description || '',
        content: lesson.content,
        type: lesson.type,
        duration: lesson.duration,
        isPublished: lesson.isPublished,
      });
    } else {
      setEditingLesson(null);
      setLessonForm({
        title: '',
        description: '',
        content: '',
        type: 'text',
        duration: 0,
        isPublished: false,
      });
    }
    setLessonFile(null);
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = async () => {
    try {
      setSavingLesson(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('title', lessonForm.title);
      formData.append('description', lessonForm.description);
      formData.append('content', lessonForm.content);
      formData.append('type', lessonForm.type);
      formData.append('duration', lessonForm.duration.toString());
      formData.append('isPublished', lessonForm.isPublished.toString());
      
      if (lessonFile) {
        if (lessonForm.type === 'video') {
          formData.append('video', lessonFile);
        } else if (lessonForm.type === 'pdf') {
          formData.append('pdf', lessonFile);
        }
      }

      if (editingLesson) {
        await axios.put(
          `/api/courses/${id}/lessons/${editingLesson._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        setSuccess('Module updated successfully!');
      } else {
        await axios.post(
          `/api/courses/${id}/lessons`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        setSuccess('Module added successfully!');
      }

      setLessonDialogOpen(false);
      fetchCourse();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save module');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!itemToDelete || itemToDelete.type !== 'lesson') return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/courses/${id}/lessons/${itemToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Module deleted successfully!');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchCourse();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete module');
    }
  };

  const handleOpenAnnouncementDialog = () => {
    setAnnouncementForm({ title: '', content: '', isImportant: false });
    setAnnouncementFiles([]);
    setAnnouncementDialogOpen(true);
  };

  const handleSaveAnnouncement = async () => {
    try {
      setSavingAnnouncement(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('title', announcementForm.title);
      formData.append('content', announcementForm.content);
      formData.append('isImportant', announcementForm.isImportant.toString());
      
      announcementFiles.forEach(file => {
        formData.append('attachments', file);
      });

      await axios.post(
        `/api/courses/${id}/announcements`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      setSuccess('Announcement created successfully!');
      setAnnouncementDialogOpen(false);
      fetchCourse();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create announcement');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!itemToDelete || itemToDelete.type !== 'announcement') return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/courses/${id}/announcements/${itemToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Announcement deleted successfully!');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchCourse();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <VideoIcon color="error" />;
      case 'pdf': return <PdfIcon color="warning" />;
      case 'quiz': return <QuizIcon color="success" />;
      case 'interactive': return <PlayIcon color="info" />;
      default: return <ArticleIcon color="primary" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Layout title="Course Manager">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout title="Course Manager">
        <Box sx={{ p: 3 }}>
          <Alert severity="error">Course not found or you don't have permission to access it.</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/courses')} sx={{ mt: 2 }}>
            Back to Courses
          </Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title={`Manage: ${course.title}`}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/courses')}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" fontWeight="bold">{course.title}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip label={course.category} size="small" color="primary" />
                <Chip label={course.level} size="small" variant="outlined" />
                <Chip 
                  label={course.isPublished ? 'Published' : 'Draft'} 
                  size="small" 
                  color={course.isPublished ? 'success' : 'default'} 
                />
                <Chip 
                  icon={<PeopleIcon />} 
                  label={`${course.enrollmentCount} students`} 
                  size="small" 
                  variant="outlined" 
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth">
            <Tab icon={<SchoolIcon />} label={`Modules (${course.lessons.length})`} />
            <Tab icon={<AnnouncementIcon />} label={`Announcements (${course.announcements.length})`} />
          </Tabs>
        </Paper>

        {/* Modules Tab */}
        {activeTab === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Course Modules</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenLessonDialog()}>
                Add Module
              </Button>
            </Box>

            {course.lessons.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary" gutterBottom>
                  No modules yet. Add your first module to start building your course.
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenLessonDialog()} sx={{ mt: 2 }}>
                  Add First Module
                </Button>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {course.lessons.sort((a, b) => a.order - b.order).map((lesson, index) => (
                  <Card key={lesson._id} sx={{ position: 'relative' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DragIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
                          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                            {index + 1}
                          </Avatar>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {getLessonTypeIcon(lesson.type)}
                            <Typography variant="h6">{lesson.title}</Typography>
                            <Chip 
                              label={lesson.isPublished ? 'Published' : 'Draft'} 
                              size="small" 
                              color={lesson.isPublished ? 'success' : 'default'}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {lesson.description || 'No description'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Type: {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Duration: {lesson.duration} min
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton onClick={() => handleOpenLessonDialog(lesson)} color="primary">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              onClick={() => {
                                setItemToDelete({ type: 'lesson', id: lesson._id });
                                setDeleteDialogOpen(true);
                              }} 
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Announcements Tab */}
        {activeTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Course Announcements</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAnnouncementDialog}>
                New Announcement
              </Button>
            </Box>

            {course.announcements.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <AnnouncementIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary" gutterBottom>
                  No announcements yet. Keep your students informed!
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAnnouncementDialog} sx={{ mt: 2 }}>
                  Create Announcement
                </Button>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {course.announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((announcement) => (
                  <Card key={announcement._id} sx={{ borderLeft: announcement.isImportant ? 4 : 0, borderColor: 'warning.main' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6">{announcement.title}</Typography>
                            {announcement.isImportant && (
                              <Chip label="Important" size="small" color="warning" />
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                            {announcement.content}
                          </Typography>
                          {announcement.attachments && announcement.attachments.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>Attachments:</Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {announcement.attachments.map((file, idx) => (
                                  <Chip
                                    key={idx}
                                    icon={<AttachFileIcon />}
                                    label={`${file.originalName} (${formatFileSize(file.size)})`}
                                    variant="outlined"
                                    component="a"
                                    href={`${API_BASE_URL}${file.path}`}
                                    target="_blank"
                                    clickable
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                            Posted: {formatDate(announcement.createdAt)}
                          </Typography>
                        </Box>
                        <Tooltip title="Delete">
                          <IconButton 
                            onClick={() => {
                              setItemToDelete({ type: 'announcement', id: announcement._id });
                              setDeleteDialogOpen(true);
                            }} 
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Lesson Dialog */}
        <Dialog open={lessonDialogOpen} onClose={() => setLessonDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingLesson ? 'Edit Module' : 'Add New Module'}
            <IconButton onClick={() => setLessonDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                label="Module Title"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                required
              />
              
              <TextField
                fullWidth
                label="Description"
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                multiline
                rows={2}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Content Type</InputLabel>
                  <Select
                    value={lessonForm.type}
                    label="Content Type"
                    onChange={(e) => setLessonForm({ ...lessonForm, type: e.target.value as any })}
                  >
                    <MenuItem value="text">Text/Article</MenuItem>
                    <MenuItem value="video">Video</MenuItem>
                    <MenuItem value="pdf">PDF Document</MenuItem>
                    <MenuItem value="interactive">Interactive</MenuItem>
                    <MenuItem value="quiz">Quiz</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  label="Duration (minutes)"
                  type="number"
                  value={lessonForm.duration}
                  onChange={(e) => setLessonForm({ ...lessonForm, duration: parseInt(e.target.value) || 0 })}
                  sx={{ width: 200 }}
                />
              </Box>

              <TextField
                fullWidth
                label="Content"
                value={lessonForm.content}
                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                multiline
                rows={6}
                required
                placeholder="Enter the module content, instructions, or embed code..."
              />

              {(lessonForm.type === 'video' || lessonForm.type === 'pdf') && (
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    component="label"
                  >
                    Upload {lessonForm.type === 'video' ? 'Video' : 'PDF'}
                    <input
                      type="file"
                      hidden
                      accept={lessonForm.type === 'video' ? 'video/*' : 'application/pdf'}
                      onChange={(e) => setLessonFile(e.target.files?.[0] || null)}
                    />
                  </Button>
                  {lessonFile && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Selected: {lessonFile.name} ({formatFileSize(lessonFile.size)})
                    </Typography>
                  )}
                </Box>
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={lessonForm.isPublished}
                    onChange={(e) => setLessonForm({ ...lessonForm, isPublished: e.target.checked })}
                  />
                }
                label="Publish this module (make visible to students)"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLessonDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleSaveLesson}
              disabled={savingLesson || !lessonForm.title || !lessonForm.content}
              startIcon={savingLesson ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {savingLesson ? 'Saving...' : 'Save Module'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Announcement Dialog */}
        <Dialog open={announcementDialogOpen} onClose={() => setAnnouncementDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Create Announcement
            <IconButton onClick={() => setAnnouncementDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                label="Announcement Title"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                required
              />
              
              <TextField
                fullWidth
                label="Content"
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                multiline
                rows={6}
                required
                placeholder="Write your announcement here..."
              />

              <Box>
                <Button
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  component="label"
                >
                  Add Attachments (PDF, Word, ZIP, etc.)
                  <input
                    type="file"
                    hidden
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt"
                    onChange={(e) => setAnnouncementFiles(Array.from(e.target.files || []))}
                  />
                </Button>
                {announcementFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Selected files:</Typography>
                    {announcementFiles.map((file, idx) => (
                      <Chip
                        key={idx}
                        label={`${file.name} (${formatFileSize(file.size)})`}
                        onDelete={() => setAnnouncementFiles(files => files.filter((_, i) => i !== idx))}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={announcementForm.isImportant}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, isImportant: e.target.checked })}
                  />
                }
                label="Mark as important announcement"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAnnouncementDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleSaveAnnouncement}
              disabled={savingAnnouncement || !announcementForm.title || !announcementForm.content}
              startIcon={savingAnnouncement ? <CircularProgress size={20} /> : <AnnouncementIcon />}
            >
              {savingAnnouncement ? 'Posting...' : 'Post Announcement'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              color="error" 
              onClick={itemToDelete?.type === 'lesson' ? handleDeleteLesson : handleDeleteAnnouncement}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Snackbar */}
        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
        </Snackbar>

        {/* Error Snackbar */}
        <Snackbar
          open={!!error}
          autoHideDuration={4000}
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
};

export default TeacherCourseManager;
