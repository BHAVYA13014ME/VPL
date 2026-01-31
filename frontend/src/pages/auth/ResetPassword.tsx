import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  School as SchoolIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  CheckCircle as CheckIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import axios from 'axios';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<'request' | 'reset' | 'success'>(!token ? 'request' : 'reset');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const textFieldStyles = {
    '& .MuiOutlinedInput-root': {
      color: 'white',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
      '&.Mui-focused fieldset': { borderColor: '#d97534' }
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#d97534' }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:5000/api/auth/reset-password', { 
        token, 
        password 
      });
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
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
        top: '15%',
        left: '15%',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(211, 84, 0, 0.12) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: 350,
        height: 350,
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
            </Box>

            {/* Request Reset Form */}
            {step === 'request' && !success && (
              <>
                <Typography variant="h4" fontWeight="bold" color="white" textAlign="center" gutterBottom>
                  Forgot Password?
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', mb: 4 }}>
                  No worries! Enter your email and we'll send you a reset link.
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#f44336' }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleRequestReset}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    sx={{ ...textFieldStyles, mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                        </InputAdornment>
                      )
                    }}
                  />

                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{
                      background: 'linear-gradient(135deg, #d97534 0%, #c86329 100%)',
                      borderRadius: 2,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #c86329 0%, #b7551f 100%)',
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send Reset Link'}
                  </Button>
                </form>

                <Button
                  startIcon={<BackIcon />}
                  onClick={() => navigate('/login')}
                  sx={{ 
                    mt: 3, 
                    color: 'rgba(255,255,255,0.6)',
                    display: 'flex',
                    mx: 'auto',
                    '&:hover': { bgcolor: 'transparent', color: '#d97534' }
                  }}
                >
                  Back to Login
                </Button>
              </>
            )}

            {/* Email Sent Success */}
            {step === 'request' && success && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  bgcolor: 'rgba(46, 204, 113, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3
                }}>
                  <CheckIcon sx={{ color: '#2ecc71', fontSize: 50 }} />
                </Box>
                <Typography variant="h5" color="white" fontWeight="bold" gutterBottom>
                  Check Your Email
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
                  We've sent a password reset link to<br />
                  <strong style={{ color: '#d97534' }}>{email}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
                  Didn't receive the email? Check your spam folder or
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    '&:hover': { borderColor: '#d97534', color: '#d97534' }
                  }}
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  sx={{ 
                    mt: 3, 
                    color: 'rgba(255,255,255,0.6)',
                    display: 'block',
                    mx: 'auto',
                    '&:hover': { bgcolor: 'transparent', color: '#d97534' }
                  }}
                >
                  Back to Login
                </Button>
              </Box>
            )}

            {/* Reset Password Form */}
            {step === 'reset' && (
              <>
                <Typography variant="h4" fontWeight="bold" color="white" textAlign="center" gutterBottom>
                  Create New Password
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', mb: 4 }}>
                  Your new password must be different from your previous password.
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#f44336' }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleResetPassword}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    sx={{ ...textFieldStyles, mb: 3 }}
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
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    sx={{ ...textFieldStyles, mb: 3 }}
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

                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{
                      background: 'linear-gradient(135deg, #d97534 0%, #c86329 100%)',
                      borderRadius: 2,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #c86329 0%, #b7551f 100%)',
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Reset Password'}
                  </Button>
                </form>
              </>
            )}

            {/* Password Reset Success */}
            {step === 'success' && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  bgcolor: 'rgba(46, 204, 113, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3
                }}>
                  <CheckIcon sx={{ color: '#2ecc71', fontSize: 50 }} />
                </Box>
                <Typography variant="h5" color="white" fontWeight="bold" gutterBottom>
                  Password Reset Successful!
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
                  Your password has been successfully reset.<br />
                  You can now log in with your new password.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate('/login')}
                  sx={{
                    background: 'linear-gradient(135deg, #d97534 0%, #c86329 100%)',
                    borderRadius: 2,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #c86329 0%, #b7551f 100%)',
                    }
                  }}
                >
                  Go to Login
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ResetPassword;
