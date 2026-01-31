import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  IconButton,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  AttachFile as AttachFileIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';
import axios from 'axios';

interface Course {
  _id: string;
  title: string;
  category: string;
}

const steps = ['Basic Info', 'Details & Instructions', 'Settings'];

const CreateAssignment: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    courseId: '',
    type: 'essay' as 'essay' | 'project' | 'quiz' | 'presentation' | 'code' | 'other',
    maxScore: 100,
    dueDate: '',
    startDate: '',
    allowLateSubmission: true,
    latePenalty: 10,
    maxAttempts: 1,
  });

  const [rubric, setRubric] = useState<{ criteria: string; points: number; description: string }[]>([
    { criteria: '', points: 0, description: '' }
  ]);

  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/courses/my/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data.data.courses || []);
    } catch (err: any) {
      console.error('Error fetching courses:', err);
    } finally {
      setFetchingCourses(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!form.title || !form.courseId || !form.dueDate) {
        setError('Please fill in all required fields');
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const addRubricRow = () => {
    setRubric([...rubric, { criteria: '', points: 0, description: '' }]);
  };

  const removeRubricRow = (index: number) => {
    setRubric(rubric.filter((_, i) => i !== index));
  };

  const updateRubricRow = (index: number, field: string, value: string | number) => {
    const newRubric = [...rubric];
    newRubric[index] = { ...newRubric[index], [field]: value };
    setRubric(newRubric);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Use FormData to handle file uploads
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('instructions', form.instructions || form.description);
      formData.append('courseId', form.courseId);
      formData.append('type', form.type);
      formData.append('maxScore', form.maxScore.toString());
      formData.append('dueDate', form.dueDate);
      formData.append('startDate', form.startDate || new Date().toISOString());
      formData.append('allowLateSubmission', form.allowLateSubmission.toString());
      formData.append('latePenalty', form.latePenalty.toString());
      formData.append('maxAttempts', form.maxAttempts.toString());
      formData.append('rubric', JSON.stringify(rubric.filter(r => r.criteria)));

      // Add attachment files
      attachments.forEach((file) => {
        formData.append('files', file);
      });

      await axios.post('/api/assignments/create', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Assignment created successfully!');
      setTimeout(() => {
        navigate('/assignments');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Assignment Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="e.g., Final Project Submission"
            />

            <FormControl fullWidth required>
              <InputLabel>Select Course</InputLabel>
              <Select
                value={form.courseId}
                label="Select Course"
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              >
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Assignment Type</InputLabel>
              <Select
                value={form.type}
                label="Assignment Type"
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              >
                <MenuItem value="essay">Essay</MenuItem>
                <MenuItem value="project">Project</MenuItem>
                <MenuItem value="quiz">Quiz</MenuItem>
                <MenuItem value="presentation">Presentation</MenuItem>
                <MenuItem value="code">Code/Programming</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Start Date"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Due Date"
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>

            <TextField
              fullWidth
              label="Maximum Score"
              type="number"
              value={form.maxScore}
              onChange={(e) => setForm({ ...form, maxScore: parseInt(e.target.value) || 100 })}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Short Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              rows={3}
              placeholder="Brief description of the assignment..."
            />

            <TextField
              fullWidth
              label="Detailed Instructions"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              multiline
              rows={8}
              placeholder="Provide detailed instructions, requirements, and expectations for students..."
            />

            <Divider sx={{ my: 2 }}>
              <Chip label="Grading Rubric (Optional)" />
            </Divider>

            <Typography variant="subtitle2" color="text.secondary">
              Define grading criteria to help students understand how they'll be evaluated
            </Typography>

            {rubric.map((row, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <TextField
                  label="Criteria"
                  value={row.criteria}
                  onChange={(e) => updateRubricRow(index, 'criteria', e.target.value)}
                  sx={{ flex: 2 }}
                  placeholder="e.g., Code Quality"
                />
                <TextField
                  label="Points"
                  type="number"
                  value={row.points}
                  onChange={(e) => updateRubricRow(index, 'points', parseInt(e.target.value) || 0)}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Description"
                  value={row.description}
                  onChange={(e) => updateRubricRow(index, 'description', e.target.value)}
                  sx={{ flex: 3 }}
                  placeholder="What are you looking for?"
                />
                <IconButton onClick={() => removeRubricRow(index)} color="error">
                  <CloseIcon />
                </IconButton>
              </Box>
            ))}

            <Button startIcon={<AddIcon />} onClick={addRubricRow} variant="outlined">
              Add Criteria
            </Button>

            <Divider sx={{ my: 2 }}>
              <Chip label="Attachments (Optional)" />
            </Divider>

            <Box>
              <Button
                variant="outlined"
                startIcon={<AttachFileIcon />}
                component="label"
              >
                Add Reference Materials
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                />
              </Button>
              {attachments.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {attachments.map((file, idx) => (
                    <Chip
                      key={idx}
                      label={`${file.name} (${formatFileSize(file.size)})`}
                      onDelete={() => setAttachments(files => files.filter((_, i) => i !== idx))}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Submission Settings</Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.allowLateSubmission}
                      onChange={(e) => setForm({ ...form, allowLateSubmission: e.target.checked })}
                    />
                  }
                  label="Allow late submissions"
                />

                {form.allowLateSubmission && (
                  <TextField
                    fullWidth
                    label="Late Penalty (% per day)"
                    type="number"
                    value={form.latePenalty}
                    onChange={(e) => setForm({ ...form, latePenalty: parseInt(e.target.value) || 0 })}
                    sx={{ mt: 2 }}
                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                    helperText="Percentage deducted from score for each day late"
                  />
                )}

                <TextField
                  fullWidth
                  label="Maximum Attempts"
                  type="number"
                  value={form.maxAttempts}
                  onChange={(e) => setForm({ ...form, maxAttempts: parseInt(e.target.value) || 1 })}
                  sx={{ mt: 2 }}
                  InputProps={{ inputProps: { min: 1 } }}
                  helperText="How many times can students submit?"
                />
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Summary</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography><strong>Title:</strong> {form.title}</Typography>
                  <Typography><strong>Course:</strong> {courses.find(c => c._id === form.courseId)?.title}</Typography>
                  <Typography><strong>Type:</strong> {form.type.charAt(0).toUpperCase() + form.type.slice(1)}</Typography>
                  <Typography><strong>Due Date:</strong> {form.dueDate ? new Date(form.dueDate).toLocaleString() : 'Not set'}</Typography>
                  <Typography><strong>Max Score:</strong> {form.maxScore} points</Typography>
                  <Typography><strong>Late Submission:</strong> {form.allowLateSubmission ? `Allowed (${form.latePenalty}% penalty/day)` : 'Not allowed'}</Typography>
                  <Typography><strong>Rubric Criteria:</strong> {rubric.filter(r => r.criteria).length}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Layout title="Create Assignment">
      <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate('/assignments')}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">Create Assignment</Typography>
            <Typography color="text.secondary">Set up a new assignment for your students</Typography>
          </Box>
        </Box>

        {fetchingCourses ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : courses.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You need to create a course first before you can create assignments.
            <Button onClick={() => navigate('/courses')} sx={{ ml: 2 }}>Go to Courses</Button>
          </Alert>
        ) : (
          <>
            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Form Content */}
            <Paper sx={{ p: 4, mb: 3 }}>
              {renderStepContent(activeStep)}
            </Paper>

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                startIcon={<ArrowBackIcon />}
              >
                Back
              </Button>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" onClick={() => navigate('/assignments')}>
                  Cancel
                </Button>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
                  >
                    {loading ? 'Creating...' : 'Create Assignment'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          </>
        )}

        {/* Snackbars */}
        <Snackbar
          open={!!error}
          autoHideDuration={4000}
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
};

export default CreateAssignment;
