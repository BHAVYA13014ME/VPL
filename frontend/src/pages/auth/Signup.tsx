import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Alert,
  Stepper,
  Step,
  StepLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Link,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  School as SchoolIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  MenuBook as StudentIcon,
  Psychology as TeacherIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const steps = ['Personal Info', 'Account Details', 'Choose Role'];

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    confirmPassword: '', role: '' as 'student' | 'teacher' | '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    setErrors({ ...errors, [name]: '' });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 0) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    } else if (step === 1) {
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    } else if (step === 2) {
      if (!formData.role) newErrors.role = 'Please select a role';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep(activeStep)) setActiveStep(activeStep + 1); };
  const handleBack = () => setActiveStep(activeStep - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(activeStep)) return;
    setLoading(true);
    setError('');
    try {
      await register({ email: formData.email, password: formData.password, firstName: formData.firstName, lastName: formData.lastName, role: formData.role as 'student' | 'teacher' });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Shared field styles
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2,
      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
      '&:hover fieldset': { borderColor: 'rgba(217,117,52,0.5)' },
      '&.Mui-focused fieldset': { borderColor: '#d97534' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(232,220,196,0.6)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#d97534' },
    '& input': { color: '#e8dcc4' },
    '& .MuiInputAdornment-root svg': { color: 'rgba(232,220,196,0.45)' },
    '& .MuiFormHelperText-root': { color: '#ff8a8a' },
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <TextField fullWidth name="firstName" label="First Name" value={formData.firstName}
              onChange={handleChange} error={!!errors.firstName} helperText={errors.firstName} sx={fieldSx}
              InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> }} />
            <TextField fullWidth name="lastName" label="Last Name" value={formData.lastName}
              onChange={handleChange} error={!!errors.lastName} helperText={errors.lastName} sx={fieldSx}
              InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> }} />
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField fullWidth name="email" label="Email Address" type="email" value={formData.email}
              onChange={handleChange} error={!!errors.email} helperText={errors.email} sx={fieldSx}
              InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon /></InputAdornment> }} />
            <TextField fullWidth name="password" label="Password" type={showPassword ? 'text' : 'password'}
              value={formData.password} onChange={handleChange} error={!!errors.password} helperText={errors.password} sx={fieldSx}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockIcon /></InputAdornment>,
                endAdornment: <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'rgba(232,220,196,0.5)' }}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>,
              }} />
            <TextField fullWidth name="confirmPassword" label="Confirm Password" type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword} onChange={handleChange} error={!!errors.confirmPassword} helperText={errors.confirmPassword} sx={fieldSx}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockIcon /></InputAdornment>,
                endAdornment: <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" sx={{ color: 'rgba(232,220,196,0.5)' }}>
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>,
              }} />
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', color: 'rgba(232,220,196,0.75)' }}>
              How do you plan to use EduVerse?
            </Typography>
            {errors.role && <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(255,107,107,0.1)', color: '#ff8a8a' }}>{errors.role}</Alert>}
            <RadioGroup name="role" value={formData.role} onChange={handleChange} sx={{ gap: 2 }}>
              {[
                { value: 'student', label: 'Student', desc: 'Learn new skills, take courses, and earn certificates', icon: <StudentIcon fontSize="large" /> },
                { value: 'teacher', label: 'Teacher', desc: 'Create courses, monitor progress, and mentor students', icon: <TeacherIcon fontSize="large" /> },
              ].map((option) => (
                <FormControlLabel
                  key={option.value} value={option.value}
                  control={<Radio sx={{ display: 'none' }} />}
                  label={
                    <Box sx={{
                      width: '100%', p: 2.5, borderRadius: 2,
                      border: `2px solid ${formData.role === option.value ? '#d97534' : 'rgba(255,255,255,0.1)'}`,
                      bgcolor: formData.role === option.value ? 'rgba(217,117,52,0.12)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 2.5,
                      '&:hover': { borderColor: 'rgba(217,117,52,0.5)', bgcolor: 'rgba(217,117,52,0.06)' },
                    }}>
                      <Box sx={{
                        p: 1.5, borderRadius: 2,
                        bgcolor: formData.role === option.value ? '#d97534' : 'rgba(255,255,255,0.08)',
                        color: formData.role === option.value ? '#fff' : 'rgba(232,220,196,0.6)',
                        display: 'flex', flexShrink: 0,
                      }}>
                        {option.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ color: formData.role === option.value ? '#d97534' : '#e8dcc4' }}>
                          {option.label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(232,220,196,0.6)' }}>
                          {option.desc}
                        </Typography>
                      </Box>
                      {formData.role === option.value && <CheckIcon sx={{ color: '#d97534', flexShrink: 0 }} />}
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
              ))}
            </RadioGroup>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #111827 0%, #1a2332 50%, #2c3e50 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      py: 5, position: 'relative', overflow: 'hidden',
    }}>
      <Box sx={{ position: 'absolute', top: '15%', right: '12%', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(217,117,52,0.1) 0%, transparent 70%)',
        pointerEvents: 'none', filter: 'blur(60px)' }} />
      <Box sx={{ position: 'absolute', bottom: '10%', left: '8%', width: 350, height: 350,
        background: 'radial-gradient(circle, rgba(79,172,254,0.07) 0%, transparent 70%)',
        pointerEvents: 'none', filter: 'blur(60px)' }} />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{
          bgcolor: 'rgba(30,41,64,0.88)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <Box sx={{ px: 5, pt: 5, pb: 4, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Box onClick={() => navigate('/')} sx={{
              width: 56, height: 56, borderRadius: 2, mx: 'auto', mb: 2,
              background: 'linear-gradient(135deg, #d97534, #c06420)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 6px 20px rgba(217,117,52,0.4)',
              transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' },
            }}>
              <SchoolIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#e8dcc4', mb: 0.5 }}>
              Join EduVerse
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(232,220,196,0.6)', mb: 3.5 }}>
              Start your learning journey today
            </Typography>

            <Stepper activeStep={activeStep} alternativeLabel sx={{
              '& .MuiStepLabel-label': { color: 'rgba(232,220,196,0.5) !important', fontSize: '0.78rem' },
              '& .MuiStepLabel-label.Mui-active': { color: '#e8dcc4 !important', fontWeight: 700 },
              '& .MuiStepLabel-label.Mui-completed': { color: '#d97534 !important' },
              '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.15)' },
              '& .MuiStepIcon-root.Mui-active': { color: '#d97534' },
              '& .MuiStepIcon-root.Mui-completed': { color: '#d97534' },
              '& .MuiStepConnector-line': { borderColor: 'rgba(255,255,255,0.1)' },
            }}>
              {steps.map((label) => (
                <Step key={label}><StepLabel>{label}</StepLabel></Step>
              ))}
            </Stepper>
          </Box>

          {/* Form */}
          <Box sx={{ p: { xs: 3, sm: 5 } }}>
            {error && (
              <Alert severity="error" sx={{
                mb: 3, bgcolor: 'rgba(255,107,107,0.12)', color: '#ff8a8a',
                border: '1px solid rgba(255,107,107,0.25)',
                '& .MuiAlert-icon': { color: '#ff6b6b' },
              }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              {renderStepContent(activeStep)}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button disabled={activeStep === 0} onClick={handleBack} startIcon={<BackIcon />}
                  sx={{
                    color: 'rgba(232,220,196,0.7)', visibility: activeStep === 0 ? 'hidden' : 'visible',
                    textTransform: 'none',
                  }}>
                  Back
                </Button>
                {activeStep === steps.length - 1 ? (
                  <Button variant="contained" onClick={handleSubmit} disabled={loading} size="large" sx={{ px: 5, borderRadius: 2 }}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                  </Button>
                ) : (
                  <Button variant="contained" onClick={handleNext} endIcon={<NextIcon />} size="large" sx={{ px: 4, borderRadius: 2 }}>
                    Next
                  </Button>
                )}
              </Box>
            </form>

            <Typography variant="body2" sx={{ textAlign: 'center', mt: 4, color: 'rgba(232,220,196,0.6)' }}>
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" underline="hover"
                sx={{ color: '#d97534', fontWeight: 700, '&:hover': { color: '#e8905a' } }}>
                Sign In
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Signup;
