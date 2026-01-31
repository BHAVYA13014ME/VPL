import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Container,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Alert,
  Divider,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  School as SchoolIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
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
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '' as 'student' | 'teacher' | '',
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
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (step === 2) {
      if (!formData.role) newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;
    
    setLoading(true);
    setError('');

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role as 'student' | 'teacher',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const textFieldStyles = {
    '& .MuiOutlinedInput-root': {
      color: 'white',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
      '&.Mui-focused fieldset': { borderColor: '#d97534' }
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#d97534' },
    '& .MuiFormHelperText-root': { color: '#f44336' }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              name="firstName"
              label="First Name"
              value={formData.firstName}
              onChange={handleChange}
              error={!!errors.firstName}
              helperText={errors.firstName}
              sx={textFieldStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              fullWidth
              name="lastName"
              label="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              error={!!errors.lastName}
              helperText={errors.lastName}
              sx={textFieldStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </InputAdornment>
                )
              }}
            />
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              name="email"
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              sx={textFieldStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              sx={textFieldStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              sx={textFieldStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      sx={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3, textAlign: 'center' }}>
              How do you plan to use EduVerse?
            </Typography>
            {errors.role && (
              <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#f44336' }}>
                {errors.role}
              </Alert>
            )}
            <RadioGroup
              name="role"
              value={formData.role}
              onChange={handleChange}
              sx={{ gap: 2 }}
            >
              <FormControlLabel
                value="student"
                control={<Radio sx={{ display: 'none' }} />}
                label={
                  <Card 
                    sx={{
                      width: '100%',
                      background: formData.role === 'student' 
                        ? 'linear-gradient(135deg, rgba(217, 117, 52, 0.2) 0%, rgba(200, 99, 41, 0.2) 100%)'
                        : 'rgba(255,255,255,0.05)',
                      border: formData.role === 'student' 
                        ? '2px solid #d97534'
                        : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 3,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: formData.role === 'student' ? '#d97534' : 'rgba(255,255,255,0.3)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                      <Box sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 3,
                        bgcolor: formData.role === 'student' ? 'rgba(217, 117, 52, 0.3)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <StudentIcon sx={{ fontSize: 30, color: formData.role === 'student' ? '#d97534' : 'rgba(255,255,255,0.5)' }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" color="white" fontWeight="bold">
                          I'm a Student
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          Learn new skills, take courses, and earn certificates
                        </Typography>
                      </Box>
                      {formData.role === 'student' && (
                        <CheckIcon sx={{ color: '#d97534', fontSize: 28 }} />
                      )}
                    </CardContent>
                  </Card>
                }
                sx={{ mx: 0, width: '100%' }}
              />
              <FormControlLabel
                value="teacher"
                control={<Radio sx={{ display: 'none' }} />}
                label={
                  <Card 
                    sx={{
                      width: '100%',
                      background: formData.role === 'teacher' 
                        ? 'linear-gradient(135deg, rgba(217, 117, 52, 0.2) 0%, rgba(200, 99, 41, 0.2) 100%)'
                        : 'rgba(255,255,255,0.05)',
                      border: formData.role === 'teacher' 
                        ? '2px solid #d97534'
                        : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 3,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: formData.role === 'teacher' ? '#d97534' : 'rgba(255,255,255,0.3)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                      <Box sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 3,
                        bgcolor: formData.role === 'teacher' ? 'rgba(217, 117, 52, 0.3)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <TeacherIcon sx={{ fontSize: 30, color: formData.role === 'teacher' ? '#d97534' : 'rgba(255,255,255,0.5)' }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" color="white" fontWeight="bold">
                          I'm a Teacher
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          Create courses, teach students, and share your expertise
                        </Typography>
                      </Box>
                      {formData.role === 'teacher' && (
                        <CheckIcon sx={{ color: '#d97534', fontSize: 28 }} />
                      )}
                    </CardContent>
                  </Card>
                }
                sx={{ mx: 0, width: '100%' }}
              />
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 30%, #34495e 60%, #1a2332 100%)',
      py: 4,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorations */}
      <Box sx={{
        position: 'absolute',
        top: '20%',
        right: '5%',
        width: 350,
        height: 350,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(211, 84, 0, 0.12) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: '15%',
        left: '5%',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(52, 73, 94, 0.4) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />

      <Container maxWidth="sm">
        <Card sx={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4,
          overflow: 'hidden'
        }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            {/* Logo */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box 
                onClick={() => navigate('/home')}
                sx={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: 3, 
                  background: 'linear-gradient(135deg, #d97534 0%, #c86329 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'scale(1.1)' }
                }}
              >
                <SchoolIcon sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              <Typography variant="h4" fontWeight="bold" color="white">
                Create Account
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }}>
                Start your learning journey today
              </Typography>
            </Box>

            {/* Stepper */}
            <Stepper 
              activeStep={activeStep} 
              alternativeLabel 
              sx={{ 
                mb: 4,
                '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' },
                '& .MuiStepLabel-label.Mui-active': { color: '#d97534' },
                '& .MuiStepLabel-label.Mui-completed': { color: '#2ecc71' },
                '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.2)' },
                '& .MuiStepIcon-root.Mui-active': { color: '#d97534' },
                '& .MuiStepIcon-root.Mui-completed': { color: '#2ecc71' },
              }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && (
              <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#f44336' }}>
                {error}
              </Alert>
            )}

            {/* Step Content */}
            {renderStepContent(activeStep)}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                startIcon={<BackIcon />}
                onClick={handleBack}
                disabled={activeStep === 0}
                sx={{ 
                  color: activeStep === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                }}
              >
                Back
              </Button>
              
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(135deg, #d97534 0%, #c86329 100%)',
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #c86329 0%, #b7551f 100%)',
                    }
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Create Account'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  endIcon={<NextIcon />}
                  onClick={handleNext}
                  sx={{
                    background: 'linear-gradient(135deg, #d97534 0%, #c86329 100%)',
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #c86329 0%, #b7551f 100%)',
                    }
                  }}
                >
                  Next
                </Button>
              )}
            </Box>

            {activeStep === 0 && (
              <>
                <Divider sx={{ my: 4, '&::before, &::after': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', px: 2 }}>
                    or sign up with
                  </Typography>
                </Divider>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<GoogleIcon />}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      py: 1.5,
                      '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.05)' }
                    }}
                  >
                    Google
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<GitHubIcon />}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      py: 1.5,
                      '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.05)' }
                    }}
                  >
                    GitHub
                  </Button>
                </Box>
              </>
            )}

            <Typography 
              variant="body1" 
              sx={{ textAlign: 'center', mt: 4, color: 'rgba(255,255,255,0.6)' }}
            >
              Already have an account?{' '}
              <Link 
                to="/login" 
                style={{ 
                  color: '#d97534', 
                  textDecoration: 'none',
                  fontWeight: 600
                }}
              >
                Sign In
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Signup;
