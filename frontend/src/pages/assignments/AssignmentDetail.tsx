import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tab,
  Tabs,
  TextField,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  School as SchoolIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  Grade as GradeIcon,
  Description as DescriptionIcon,
  Quiz as QuizIcon,
  Code as CodeIcon,
  Article as EssayIcon,
  Build as ProjectIcon,
  Star as StarIcon,
  Timer as TimerIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

interface Submission {
  _id: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  content: string;
  attachments?: {
    filename: string;
    originalName: string;
    path: string;
    size?: number;
    mimeType?: string;
  }[];
  submittedAt: string;
  status: 'submitted' | 'graded' | 'returned' | 'late';
  grade?: {
    score: number;
    feedback: string;
    gradedBy?: string;
    gradedAt?: string;
  };
  attempt: number;
}

interface Assignment {
  _id: string;
  title: string;
  description: string;
  instructions: string;
  course: {
    _id: string;
    title: string;
  };
  instructor: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  type: 'essay' | 'project' | 'quiz' | 'code' | 'presentation' | 'other';
  maxScore: number;
  dueDate: string;
  startDate: string;
  allowLateSubmission: boolean;
  latePenalty: number;
  maxAttempts: number;
  timeLimit?: number;
  attachments?: {
    filename: string;
    originalName: string;
    path: string;
    description?: string;
  }[];
  rubric?: {
    criteria: string;
    description?: string;
    maxPoints: number;
  }[];
  submissions: Submission[];
  settings: {
    allowFileUpload: boolean;
    allowedFileTypes: string[];
    maxFileSize: number;
    showGradeToStudent: boolean;
  };
  isPublished: boolean;
  analytics: {
    totalSubmissions: number;
    averageScore: number;
    submissionRate: number;
    passRate: number;
  };
  createdAt: string;
}

const AssignmentDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submissionContent, setSubmissionContent] = useState('');
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [unsubmitDialogOpen, setUnsubmitDialogOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [viewSubmissionDialog, setViewSubmissionDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const menuItems = [
    { text: 'Dashboard', icon: <SchoolIcon />, path: user?.role === 'teacher' ? '/teacher' : '/student' },
    { text: 'My Courses', icon: <SchoolIcon />, path: '/courses' },
    { text: 'Assignments', icon: <AssignmentIcon />, path: '/assignments' },
    { text: 'Leaderboard', icon: <StarIcon />, path: '/leaderboard' }
  ];

  useEffect(() => {
    fetchAssignmentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAssignmentDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      
      console.log('Fetching assignment details for ID:', id);
      
      const response = await axios.get(`/api/assignments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Assignment details response:', response.data);
      
      if (response.data.success) {
        setAssignment(response.data.data.assignment);
        
        // Find user's submission if student
        if (user?.role === 'student' && response.data.data.assignment.submissions) {
          const userSubmission = response.data.data.assignment.submissions.find(
            (sub: Submission) => {
              const studentId = typeof sub.student === 'string' ? sub.student : sub.student._id;
              return studentId === user._id;
            }
          );
          setMySubmission(userSubmission || null);
        }
      }
    } catch (error: any) {
      console.error('Error fetching assignment:', error);
      setError(error.response?.data?.message || 'Failed to load assignment details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      
      const token = localStorage.getItem('token');
      
      // Use FormData to include both content and files
      const formData = new FormData();
      formData.append('content', submissionContent);
      
      // Add all uploaded files
      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      const response = await axios.post(
        `/api/assignments/${id}/submit`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );

      if (response.data.success) {
        setSubmitDialogOpen(false);
        setSubmissionContent('');
        setUploadedFiles([]);
        fetchAssignmentDetails(); // Refresh data
      }
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      setError(error.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUnsubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/assignments/${id}/submit`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnsubmitDialogOpen(false);
      fetchAssignmentDetails();
    } catch (error: any) {
      console.error('Error unsubmitting:', error);
      setError(error.response?.data?.message || 'Failed to unsubmit');
    }
  };

  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setViewSubmissionDialog(true);
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}${filePath}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'essay': return <EssayIcon />;
      case 'project': return <ProjectIcon />;
      case 'quiz': return <QuizIcon />;
      case 'code': return <CodeIcon />;
      default: return <AssignmentIcon />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'essay': return '#3498db';
      case 'project': return '#2ecc71';
      case 'quiz': return '#f39c12';
      case 'code': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'info';
      case 'graded': return 'success';
      case 'returned': return 'warning';
      case 'late': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const isOverdue = () => {
    if (!assignment) return false;
    return new Date() > new Date(assignment.dueDate);
  };

  const getTimeRemaining = () => {
    if (!assignment) return '';
    const now = new Date();
    const due = new Date(assignment.dueDate);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} days, ${hours} hours remaining`;
    if (hours > 0) return `${hours} hours remaining`;
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes} minutes remaining`;
  };

  if (loading) {
    return (
      <Layout title="Assignment Details">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Layout>
    );
  }

  if (error && !assignment) {
    return (
      <Layout title="Assignment Details">
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/assignments')}>
            Back to Assignments
          </Button>
        </Box>
      </Layout>
    );
  }

  if (!assignment) {
    return (
      <Layout title="Assignment Details">
        <Box sx={{ p: 3 }}>
          <Alert severity="warning">Assignment not found</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/assignments')} sx={{ mt: 2 }}>
            Back to Assignments
          </Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title={assignment?.title || 'Assignment Details'}>
      <Box sx={{ pb: 4 }}>
        {/* Hero Section */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${getTypeColor(assignment.type)} 0%, ${alpha(getTypeColor(assignment.type), 0.7)} 100%)`,
            color: 'white',
            py: 6,
            px: 3,
          }}
        >
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Button 
              startIcon={<ArrowBackIcon />} 
              onClick={() => navigate('/assignments')}
              sx={{ color: 'white', mb: 2 }}
            >
              Back to Assignments
            </Button>
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '2 1 0' } }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    icon={getTypeIcon(assignment.type)}
                    label={assignment.type.charAt(0).toUpperCase() + assignment.type.slice(1)} 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                  />
                  {isOverdue() && !mySubmission ? (
                    <Chip 
                      icon={<WarningIcon />}
                      label="Overdue" 
                      sx={{ bgcolor: '#e74c3c', color: 'white' }} 
                    />
                  ) : (
                    <Chip 
                      icon={<TimeIcon />}
                      label={getTimeRemaining()} 
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                    />
                  )}
                  {mySubmission && (
                    <Chip 
                      icon={<CheckCircleIcon />}
                      label={`Submitted - ${mySubmission.status}`}
                      color={getStatusColor(mySubmission.status) as any}
                    />
                  )}
                </Box>
                
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                  {assignment.title}
                </Typography>
                
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 3 }}>
                  {assignment.description}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SchoolIcon fontSize="small" />
                    <Typography>{assignment.course?.title}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <GradeIcon fontSize="small" />
                    <Typography>{assignment.maxScore} points</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarIcon fontSize="small" />
                    <Typography>Due: {formatDate(assignment.dueDate)}</Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={assignment.instructor?.avatar} sx={{ width: 48, height: 48 }}>
                    {assignment.instructor?.firstName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>Assigned by</Typography>
                    <Typography fontWeight="bold">
                      {assignment.instructor?.firstName} {assignment.instructor?.lastName}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' } }}>
                <Card sx={{ p: 3 }}>
                  {/* Student Submission Status */}
                  {user?.role === 'student' && (
                    <>
                      <Box sx={{ mb: 3 }}>
                        {/* Header with "Your work" and status */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mb: 2
                        }}>
                          <Typography variant="h6" fontWeight="bold">
                            Your work
                          </Typography>
                          {mySubmission && (
                            <Chip 
                              label="Turned in" 
                              color="success"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          )}
                          {!mySubmission && (
                            <Chip 
                              label="Assigned" 
                              sx={{ 
                                bgcolor: '#1a73e8', 
                                color: 'white',
                                fontWeight: 600 
                              }}
                              size="small"
                            />
                          )}
                        </Box>

                        {/* If submission exists - Show submitted work */}
                        {mySubmission ? (
                          <Box>
                            {/* Show submitted files */}
                            {mySubmission.attachments && mySubmission.attachments.length > 0 ? (
                              <Box sx={{ mb: 2 }}>
                                {mySubmission.attachments.map((file, index) => (
                                  <Paper 
                                    key={index}
                                    sx={{ 
                                      p: 2, 
                                      mb: 1.5,
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 2,
                                      cursor: 'pointer',
                                      '&:hover': {
                                        bgcolor: 'action.hover'
                                      }
                                    }}
                                    onClick={() => handleDownloadFile(file.path, file.originalName || file.filename)}
                                  >
                                    {file.mimeType?.includes('pdf') ? (
                                      <Box sx={{ 
                                        width: 40, 
                                        height: 40, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        bgcolor: '#d32f2f',
                                        borderRadius: 1,
                                        color: 'white'
                                      }}>
                                        <DescriptionIcon />
                                      </Box>
                                    ) : file.mimeType?.includes('image') ? (
                                      <Box sx={{ 
                                        width: 40, 
                                        height: 40, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        bgcolor: '#1976d2',
                                        borderRadius: 1,
                                        color: 'white'
                                      }}>
                                        <ImageIcon />
                                      </Box>
                                    ) : (
                                      <Box sx={{ 
                                        width: 40, 
                                        height: 40, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        bgcolor: '#424242',
                                        borderRadius: 1,
                                        color: 'white'
                                      }}>
                                        <AttachFileIcon />
                                      </Box>
                                    )}
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" fontWeight="500">
                                        {file.originalName || file.filename}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(file.size)}
                                      </Typography>
                                    </Box>
                                    <IconButton size="small">
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                  </Paper>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                No files attached
                              </Typography>
                            )}

                            {/* Submission content */}
                            {mySubmission.content && (
                              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  Comment:
                                </Typography>
                                <Typography variant="body2">
                                  {mySubmission.content}
                                </Typography>
                              </Box>
                            )}

                            {/* Submitted date */}
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                              Turned in {formatDate(mySubmission.submittedAt)}
                            </Typography>

                            {/* Unsubmit button */}
                            {!isOverdue() || assignment.allowLateSubmission ? (
                              <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                onClick={() => setUnsubmitDialogOpen(true)}
                                sx={{ mb: 2 }}
                              >
                                Unsubmit
                              </Button>
                            ) : null}

                            {/* Grade display */}
                            {mySubmission.grade && mySubmission.grade.score !== undefined && (
                              <Box sx={{ 
                                mt: 2, 
                                p: 2, 
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'success.main'
                              }}>
                                <Typography variant="subtitle2" color="success.main" fontWeight="bold" gutterBottom>
                                  Graded
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="success.main">
                                  {mySubmission.grade.score} / {assignment.maxScore}
                                </Typography>
                                {mySubmission.grade.feedback && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" fontWeight="600">Feedback:</Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                      {mySubmission.grade.feedback}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            )}
                          </Box>
                        ) : (
                          /* No submission yet - Show "Add or create" UI */
                          <Box>
                            <Button
                              fullWidth
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={() => setSubmitDialogOpen(true)}
                              sx={{ 
                                mb: 2,
                                py: 1.5,
                                borderStyle: 'dashed',
                                borderWidth: 2,
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                '&:hover': {
                                  borderWidth: 2,
                                  borderStyle: 'dashed',
                                  bgcolor: alpha(theme.palette.primary.main, 0.05)
                                }
                              }}
                            >
                              Add or create
                            </Button>

                            {/* Mark as done button */}
                            {!isOverdue() || assignment.allowLateSubmission ? (
                              <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                onClick={() => setSubmitDialogOpen(true)}
                                sx={{ py: 1.5 }}
                              >
                                Mark as done
                              </Button>
                            ) : (
                              <Alert severity="error" sx={{ mt: 2 }}>
                                Submission deadline has passed
                              </Alert>
                            )}

                            {/* Private comments hint */}
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                              Add a private comment for your teacher (optional)
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </>
                  )}
                  
                  {/* Teacher Analytics */}
                  {user?.role === 'teacher' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Submission Statistics
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-around', my: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" color="primary">
                            {assignment.analytics?.totalSubmissions || assignment.submissions?.length || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Submissions</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" color="success.main">
                            {assignment.analytics?.averageScore?.toFixed(1) || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Avg Score</Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  
                  {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Assignment Details:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><GradeIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary={`Max Score: ${assignment.maxScore} points`} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><TimerIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary={`Max Attempts: ${assignment.maxAttempts}`} />
                    </ListItem>
                    {assignment.timeLimit && (
                      <ListItem>
                        <ListItemIcon><TimeIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary={`Time Limit: ${assignment.timeLimit} minutes`} />
                      </ListItem>
                    )}
                    <ListItem>
                      <ListItemIcon>
                        {assignment.allowLateSubmission ? <CheckCircleIcon color="success" fontSize="small" /> : <CloseIcon color="error" fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText primary={assignment.allowLateSubmission ? 'Late submission allowed' : 'No late submissions'} />
                    </ListItem>
                    {assignment.allowLateSubmission && assignment.latePenalty > 0 && (
                      <ListItem>
                        <ListItemIcon><WarningIcon color="warning" fontSize="small" /></ListItemIcon>
                        <ListItemText primary={`Late Penalty: ${assignment.latePenalty}% per day`} />
                      </ListItem>
                    )}
                  </List>
                </Card>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Content Section */}
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, mt: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            <Box sx={{ flex: { xs: '1 1 100%', md: '2 1 0' } }}>
              {/* Tabs */}
              <Paper sx={{ mb: 3 }}>
                <Tabs 
                  value={activeTab} 
                  onChange={(_, value) => setActiveTab(value)}
                  variant="fullWidth"
                >
                  <Tab label="Instructions" />
                  <Tab label="Rubric" />
                  {user?.role === 'teacher' && <Tab label="Submissions" />}
                </Tabs>
              </Paper>

              {/* Instructions Tab */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Assignment Instructions
                  </Typography>
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography sx={{ whiteSpace: 'pre-line' }}>
                      {assignment.instructions || assignment.description}
                    </Typography>
                  </Paper>
                  
                  {/* Attachments */}
                  {assignment.attachments && assignment.attachments.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        <AttachFileIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Attachments
                      </Typography>
                      <List>
                        {assignment.attachments.map((attachment, index) => (
                          <ListItem key={index} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}>
                            <ListItemIcon><DescriptionIcon /></ListItemIcon>
                            <ListItemText 
                              primary={attachment.originalName || attachment.filename}
                              secondary={attachment.description}
                            />
                            <Button
                              startIcon={<DownloadIcon />}
                              href={attachment.path}
                              target="_blank"
                            >
                              Download
                            </Button>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}

              {/* Rubric Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Grading Rubric
                  </Typography>
                  {assignment.rubric && assignment.rubric.length > 0 ? (
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'primary.main' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Criteria</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Points</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {assignment.rubric.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell sx={{ fontWeight: 'bold' }}>{item.criteria}</TableCell>
                              <TableCell>{item.description || '-'}</TableCell>
                              <TableCell align="center">
                                <Chip label={`${item.maxPoints} pts`} color="primary" size="small" />
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                            <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell align="center">
                              <Chip label={`${assignment.maxScore} pts`} color="success" />
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Paper sx={{ p: 3 }}>
                      <Typography color="text.secondary">
                        No rubric provided for this assignment. Your work will be graded based on the instructions above.
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}

              {/* Submissions Tab (Teacher Only) */}
              {activeTab === 2 && user?.role === 'teacher' && (
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Student Submissions
                  </Typography>
                  {assignment.submissions && assignment.submissions.length > 0 ? (
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'primary.main' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Student</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Submitted At</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Score</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {assignment.submissions.map((submission, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar src={submission.student?.avatar} sx={{ width: 32, height: 32 }}>
                                    {submission.student?.firstName?.[0]}
                                  </Avatar>
                                  <Typography>
                                    {submission.student?.firstName} {submission.student?.lastName}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{formatDate(submission.submittedAt)}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={submission.status} 
                                  color={getStatusColor(submission.status) as any}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="center">
                                {submission.grade ? (
                                  <Typography fontWeight="bold">
                                    {submission.grade.score}/{assignment.maxScore}
                                  </Typography>
                                ) : (
                                  <Typography color="text.secondary">-</Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  onClick={() => handleViewSubmission(submission)}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                      <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                      <Typography color="text.secondary">
                        No submissions yet
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}
            </Box>

            {/* Sidebar */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' } }}>
              <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Info
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: getTypeColor(assignment.type), width: 48, height: 48 }}>
                    {getTypeIcon(assignment.type)}
                  </Avatar>
                  <Box>
                    <Typography fontWeight="bold">
                      {assignment.type.charAt(0).toUpperCase() + assignment.type.slice(1)} Assignment
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assignment.course?.title}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Timeline
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Start Date:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatDate(assignment.startDate)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Due Date:</Typography>
                    <Typography variant="body2" fontWeight="bold" color={isOverdue() ? 'error' : 'inherit'}>
                      {formatDate(assignment.dueDate)}
                    </Typography>
                  </Box>
                </Box>
                
                {assignment.settings?.allowFileUpload && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        File Upload Settings
                      </Typography>
                      <Typography variant="body2">
                        Allowed types: {assignment.settings.allowedFileTypes?.join(', ') || 'All'}
                      </Typography>
                      <Typography variant="body2">
                        Max size: {assignment.settings.maxFileSize || 10} MB
                      </Typography>
                    </Box>
                  </>
                )}
              </Paper>
            </Box>
          </Box>
        </Box>

        {/* Submit Dialog */}
        <Dialog
          open={submitDialogOpen}
          onClose={() => setSubmitDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SendIcon color="primary" />
              <Typography variant="h6">Submit Assignment</Typography>
            </Box>
            <IconButton onClick={() => setSubmitDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please provide your submission below. Make sure to review your work before submitting.
            </Alert>
            
            <TextField
              fullWidth
              multiline
              rows={10}
              label="Your Submission"
              placeholder="Enter your answer, code, or essay here..."
              value={submissionContent}
              onChange={(e) => setSubmissionContent(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            {assignment.settings?.allowFileUpload && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  component="label"
                >
                  Upload File
                  <input type="file" hidden onChange={handleFileUpload} multiple />
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                  Allowed: {assignment.settings.allowedFileTypes?.join(', ') || 'All types'} 
                  (Max: {assignment.settings.maxFileSize || 10} MB)
                </Typography>
                
                {/* Display uploaded files */}
                {uploadedFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {uploadedFiles.map((file, index) => (
                      <Chip
                        key={index}
                        label={file.name}
                        onDelete={() => handleRemoveFile(index)}
                        icon={<AttachFileIcon />}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSubmit}
              disabled={submitting || !submissionContent.trim()}
              startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {submitting ? 'Submitting...' : 'Submit Assignment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Unsubmit Confirmation Dialog */}
        <Dialog
          open={unsubmitDialogOpen}
          onClose={() => setUnsubmitDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="warning" />
              <Typography variant="h6">Unsubmit Assignment?</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to unsubmit this assignment?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your current submission will be removed and you'll need to submit again before the deadline.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUnsubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="warning"
              onClick={handleUnsubmit}
            >
              Unsubmit
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Submission Dialog */}
        <Dialog 
          open={viewSubmissionDialog}
          onClose={() => setViewSubmissionDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon color="primary" />
                <Typography variant="h6">Submission Details</Typography>
              </Box>
              <IconButton onClick={() => setViewSubmissionDialog(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {selectedSubmission && (
              <Box>
                {/* Student Info */}
                <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar 
                      src={selectedSubmission.student?.avatar} 
                      sx={{ width: 56, height: 56 }}
                    >
                      {selectedSubmission.student?.firstName?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {selectedSubmission.student?.firstName} {selectedSubmission.student?.lastName}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Submitted At
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatDate(selectedSubmission.submittedAt)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Status
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip 
                          label={selectedSubmission.status} 
                          color={getStatusColor(selectedSubmission.status) as any}
                          size="small"
                        />
                      </Box>
                    </Box>
                    {selectedSubmission.grade && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Score
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {selectedSubmission.grade.score}/{assignment?.maxScore}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>

                {/* Submission Content */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Submission Content
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    {selectedSubmission.content ? (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedSubmission.content}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        No text content submitted
                      </Typography>
                    )}
                  </Paper>
                </Box>

                {/* Attachments Section - Always show */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Attachments {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 
                      ? `(${selectedSubmission.attachments.length})` 
                      : ''}
                  </Typography>
                  
                  {(!selectedSubmission.attachments || selectedSubmission.attachments.length === 0) ? (
                    <Paper sx={{ p: 3, bgcolor: 'grey.50', textAlign: 'center' }}>
                      <AttachFileIcon sx={{ fontSize: 40, color: 'grey.400', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        No files attached to this submission
                      </Typography>
                    </Paper>
                  ) : (
                    <List>
                      {selectedSubmission.attachments.map((file, index) => {
                        const isPdf = file.mimeType === 'application/pdf' || 
                                      file.originalName?.toLowerCase().endsWith('.pdf') ||
                                      file.filename?.toLowerCase().endsWith('.pdf');
                        const isImage = file.mimeType?.startsWith('image/') ||
                                       /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalName || file.filename);
                        
                        return (
                          <ListItem 
                            key={index}
                            sx={{ 
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1,
                              flexDirection: 'column',
                              alignItems: 'stretch'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              <ListItemIcon>
                                <AttachFileIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={file.originalName || file.filename}
                                secondary={
                                  <Box component="span">
                                    {file.size ? `Size: ${(file.size / 1024).toFixed(2)} KB` : ''}
                                    {file.mimeType ? ` • Type: ${file.mimeType}` : ''}
                                  </Box>
                                }
                              />
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                {/* View button for PDFs and images */}
                                {(isPdf || isImage) && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    onClick={() => {
                                      const fileUrl = `http://localhost:5000${file.path}`;
                                      window.open(fileUrl, '_blank');
                                    }}
                                  >
                                    View
                                  </Button>
                                )}
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<DownloadIcon />}
                                  onClick={() => handleDownloadFile(file.path, file.originalName || file.filename)}
                                >
                                  Download
                                </Button>
                              </Box>
                            </Box>
                            
                            {/* Preview for images */}
                            {isImage && (
                              <Box sx={{ mt: 2, textAlign: 'center' }}>
                                <img 
                                  src={`http://localhost:5000${file.path}`}
                                  alt={file.originalName || file.filename}
                                  style={{ 
                                    maxWidth: '100%', 
                                    maxHeight: '200px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd'
                                  }}
                                />
                              </Box>
                            )}
                            
                            {/* PDF Preview link */}
                            {isPdf && (
                              <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  📄 Click "View" to open PDF in a new tab
                                </Typography>
                              </Box>
                            )}
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Box>

                {/* Grade & Feedback */}
                {selectedSubmission.grade && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Grading
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Score
                          </Typography>
                          <Typography variant="h4" color="primary" fontWeight="bold">
                            {selectedSubmission.grade.score}/{assignment?.maxScore}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {assignment && Math.round((selectedSubmission.grade.score / assignment.maxScore) * 100)}%
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Graded At
                          </Typography>
                          <Typography variant="body2">
                            {selectedSubmission.grade.gradedAt ? formatDate(selectedSubmission.grade.gradedAt) : 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                      {selectedSubmission.grade.feedback && (
                        <>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle2" gutterBottom>
                            Feedback
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedSubmission.grade.feedback}
                          </Typography>
                        </>
                      )}
                    </Paper>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewSubmissionDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default AssignmentDetail;
