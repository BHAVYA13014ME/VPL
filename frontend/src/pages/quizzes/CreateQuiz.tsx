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
  Snackbar,
  Radio,
  RadioGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  ContentCopy as CopyIcon,
  DragIndicator as DragIcon,
  Timer as TimerIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';
import axios from 'axios';

interface Course {
  _id: string;
  title: string;
  category: string;
}

interface Question {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';
  options: { text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

const steps = ['Basic Info', 'Add Questions', 'Settings & Review'];

const CreateQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState<number | false>(0);

  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    courseId: '',
    startDate: '',
    endDate: '',
  });

  const [settings, setSettings] = useState({
    timeLimit: 30,
    passingScore: 70,
    maxAttempts: 3,
    shuffleQuestions: false,
    shuffleOptions: false,
    showCorrectAnswers: true,
    showExplanations: true,
    allowReview: true,
  });

  const [questions, setQuestions] = useState<Question[]>([
    {
      question: '',
      type: 'multiple_choice',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      correctAnswer: '',
      explanation: '',
      points: 1,
    }
  ]);

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
      if (!form.title || !form.courseId) {
        setError('Please fill in all required fields');
        return;
      }
    }
    if (activeStep === 1) {
      const validQuestions = questions.filter(q => q.question.trim());
      if (validQuestions.length === 0) {
        setError('Please add at least one question');
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      question: '',
      type: 'multiple_choice',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      correctAnswer: '',
      explanation: '',
      points: 1,
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestion(questions.length);
  };

  const duplicateQuestion = (index: number) => {
    const questionToCopy = { ...questions[index], options: [...questions[index].options.map(o => ({ ...o }))] };
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, questionToCopy);
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      setError('Quiz must have at least one question');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
    setExpandedQuestion(false);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    
    // Reset options when changing question type
    if (field === 'type') {
      if (value === 'true_false') {
        newQuestions[index].options = [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ];
      } else if (value === 'multiple_choice') {
        newQuestions[index].options = [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ];
      }
    }
    
    setQuestions(newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, field: 'text' | 'isCorrect', value: any) => {
    const newQuestions = [...questions];
    const options = [...newQuestions[questionIndex].options];
    
    if (field === 'isCorrect' && value === true) {
      // Only one option can be correct for now
      options.forEach((opt, i) => {
        opt.isCorrect = i === optionIndex;
      });
    } else {
      options[optionIndex] = { ...options[optionIndex], [field]: value };
    }
    
    newQuestions[questionIndex].options = options;
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push({ text: '', isCorrect: false });
    setQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length <= 2) {
      setError('Question must have at least 2 options');
      return;
    }
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(newQuestions);
  };

  const getTotalPoints = () => {
    return questions.reduce((sum, q) => sum + (q.points || 1), 0);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const quizData = {
        title: form.title,
        description: form.description,
        instructions: form.instructions,
        courseId: form.courseId,
        questions: questions.filter(q => q.question.trim()).map((q, index) => ({
          question: q.question,
          type: q.type,
          options: q.type === 'multiple_choice' || q.type === 'true_false' ? q.options : [],
          correctAnswer: q.type === 'short_answer' || q.type === 'fill_blank' ? q.correctAnswer : '',
          explanation: q.explanation,
          points: q.points || 1,
          order: index + 1,
        })),
        settings,
        startDate: form.startDate || new Date().toISOString(),
        endDate: form.endDate || null,
      };

      await axios.post('/api/quizzes', quizData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Quiz created successfully!');
      setTimeout(() => {
        navigate('/courses');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create quiz');
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
              label="Quiz Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="e.g., Chapter 5 Quiz"
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

            <TextField
              fullWidth
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              rows={2}
              placeholder="Brief description of this quiz..."
            />

            <TextField
              fullWidth
              label="Instructions"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              multiline
              rows={4}
              placeholder="Instructions for students before starting the quiz..."
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Start Date (Optional)"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="End Date (Optional)"
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Questions ({questions.filter(q => q.question.trim()).length}) - Total Points: {getTotalPoints()}
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={addQuestion}>
                Add Question
              </Button>
            </Box>

            {questions.map((question, qIndex) => (
              <Accordion 
                key={qIndex} 
                expanded={expandedQuestion === qIndex}
                onChange={(_, expanded) => setExpandedQuestion(expanded ? qIndex : false)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                    <DragIcon sx={{ color: 'text.secondary' }} />
                    <Chip label={`Q${qIndex + 1}`} size="small" color="primary" />
                    <Typography sx={{ flex: 1 }} noWrap>
                      {question.question || 'New Question'}
                    </Typography>
                    <Chip label={question.type.replace('_', ' ')} size="small" variant="outlined" />
                    <Chip label={`${question.points} pts`} size="small" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Question Type</InputLabel>
                        <Select
                          value={question.type}
                          label="Question Type"
                          onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                        >
                          <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                          <MenuItem value="true_false">True/False</MenuItem>
                          <MenuItem value="short_answer">Short Answer</MenuItem>
                          <MenuItem value="fill_blank">Fill in the Blank</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label="Points"
                        type="number"
                        value={question.points}
                        onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                        sx={{ width: 100 }}
                        InputProps={{ inputProps: { min: 1 } }}
                      />
                    </Box>

                    <TextField
                      fullWidth
                      label="Question"
                      value={question.question}
                      onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                      multiline
                      rows={2}
                      required
                      placeholder="Enter your question here..."
                    />

                    {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Options (select the correct answer)
                        </Typography>
                        <RadioGroup>
                          {question.options.map((option, oIndex) => (
                            <Box key={oIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Radio
                                checked={option.isCorrect}
                                onChange={() => updateOption(qIndex, oIndex, 'isCorrect', true)}
                              />
                              <TextField
                                fullWidth
                                value={option.text}
                                onChange={(e) => updateOption(qIndex, oIndex, 'text', e.target.value)}
                                placeholder={`Option ${oIndex + 1}`}
                                size="small"
                                disabled={question.type === 'true_false'}
                              />
                              {question.type === 'multiple_choice' && question.options.length > 2 && (
                                <IconButton 
                                  size="small" 
                                  onClick={() => removeOption(qIndex, oIndex)}
                                  color="error"
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          ))}
                        </RadioGroup>
                        {question.type === 'multiple_choice' && (
                          <Button 
                            size="small" 
                            startIcon={<AddIcon />} 
                            onClick={() => addOption(qIndex)}
                            sx={{ mt: 1 }}
                          >
                            Add Option
                          </Button>
                        )}
                      </Box>
                    )}

                    {(question.type === 'short_answer' || question.type === 'fill_blank') && (
                      <TextField
                        fullWidth
                        label="Correct Answer"
                        value={question.correctAnswer}
                        onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                        placeholder="Enter the correct answer..."
                        helperText="Student's answer must match exactly (case-insensitive)"
                      />
                    )}

                    <TextField
                      fullWidth
                      label="Explanation (Optional)"
                      value={question.explanation}
                      onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                      multiline
                      rows={2}
                      placeholder="Explain the correct answer (shown after quiz completion)..."
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Tooltip title="Duplicate Question">
                        <IconButton onClick={() => duplicateQuestion(qIndex)} color="primary">
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Question">
                        <IconButton onClick={() => removeQuestion(qIndex)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimerIcon /> Time & Attempt Settings
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2 }}>
                  <TextField
                    label="Time Limit (minutes)"
                    type="number"
                    value={settings.timeLimit}
                    onChange={(e) => setSettings({ ...settings, timeLimit: parseInt(e.target.value) || 30 })}
                    sx={{ width: 180 }}
                    InputProps={{ inputProps: { min: 1 } }}
                    helperText="0 = no limit"
                  />
                  <TextField
                    label="Passing Score (%)"
                    type="number"
                    value={settings.passingScore}
                    onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) || 70 })}
                    sx={{ width: 180 }}
                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                  />
                  <TextField
                    label="Max Attempts"
                    type="number"
                    value={settings.maxAttempts}
                    onChange={(e) => setSettings({ ...settings, maxAttempts: parseInt(e.target.value) || 1 })}
                    sx={{ width: 180 }}
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon /> Quiz Behavior
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.shuffleQuestions}
                        onChange={(e) => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
                      />
                    }
                    label="Shuffle questions order for each attempt"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.shuffleOptions}
                        onChange={(e) => setSettings({ ...settings, shuffleOptions: e.target.checked })}
                      />
                    }
                    label="Shuffle answer options"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.showCorrectAnswers}
                        onChange={(e) => setSettings({ ...settings, showCorrectAnswers: e.target.checked })}
                      />
                    }
                    label="Show correct answers after completion"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.showExplanations}
                        onChange={(e) => setSettings({ ...settings, showExplanations: e.target.checked })}
                      />
                    }
                    label="Show answer explanations"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.allowReview}
                        onChange={(e) => setSettings({ ...settings, allowReview: e.target.checked })}
                      />
                    }
                    label="Allow students to review their answers"
                  />
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Quiz Summary</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography><strong>Title:</strong> {form.title}</Typography>
                  <Typography><strong>Course:</strong> {courses.find(c => c._id === form.courseId)?.title}</Typography>
                  <Typography><strong>Questions:</strong> {questions.filter(q => q.question.trim()).length}</Typography>
                  <Typography><strong>Total Points:</strong> {getTotalPoints()}</Typography>
                  <Typography><strong>Time Limit:</strong> {settings.timeLimit} minutes</Typography>
                  <Typography><strong>Passing Score:</strong> {settings.passingScore}%</Typography>
                  <Typography><strong>Max Attempts:</strong> {settings.maxAttempts}</Typography>
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
    <Layout title="Create Quiz">
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate('/courses')}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">Create Quiz</Typography>
            <Typography color="text.secondary">Build an interactive quiz for your students</Typography>
          </Box>
        </Box>

        {fetchingCourses ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : courses.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You need to create a course first before you can create quizzes.
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
                <Button variant="outlined" onClick={() => navigate('/courses')}>
                  Cancel
                </Button>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
                  >
                    {loading ? 'Creating...' : 'Create Quiz'}
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

export default CreateQuiz;
