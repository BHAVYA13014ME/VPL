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
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Link,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  School as SchoolIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { setForgotError('Please enter your email address'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      await axios.post('/api/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCloseForgot = () => {
    setForgotOpen(false);
    setForgotEmail('');
    setForgotSuccess(false);
    setForgotError('');
  };

  const handleGoogleLogin = () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const handleGitHubLogin = () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/github`;
  };

  const fieldSx = {
    mb: 2.5,
    '& .MuiOutlinedInput-root': {
      bgcolor: 'rgba(255,255,255,0.04)',
      borderRadius: 2,
      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
      '&:hover fieldset': { borderColor: 'rgba(217,117,52,0.5)' },
      '&.Mui-focused fieldset': { borderColor: '#d97534' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(232,220,196,0.6)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#d97534' },
    '& input': { color: '#e8dcc4' },
    '& .MuiInputAdornment-root svg': { color: 'rgba(232,220,196,0.45)' },
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #111827 0%, #1a2332 50%, #2c3e50 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      py: 4, position: 'relative', overflow: 'hidden',
    }}>
      <Box sx={{
        position: 'absolute', top: '20%', right: '15%', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(217,117,52,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', filter: 'blur(60px)',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '20%', left: '10%', width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(79,172,254,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', filter: 'blur(60px)',
      }} />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, my: 4 }}>
        <Box sx={{
          bgcolor: 'rgba(30,41,64,0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          p: { xs: 3, sm: 5 },
        }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              onClick={() => navigate('/')}
              sx={{
                width: 56, height: 56, borderRadius: 2, mx: 'auto', mb: 2,
                background: 'linear-gradient(135deg, #d97534, #c06420)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 6px 20px rgba(217,117,52,0.4)',
                transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' },
              }}
            >
              <SchoolIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#e8dcc4', mb: 0.5 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(232,220,196,0.6)' }}>
              Sign in to continue your learning journey
            </Typography>
          </Box>

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
            <TextField
              fullWidth name="email" label="Email Address" type="email"
              value={formData.email} onChange={handleChange} required sx={fieldSx}
              InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon /></InputAdornment> }}
            />
            <TextField
              fullWidth name="password" label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password} onChange={handleChange} required sx={fieldSx}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockIcon /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'rgba(232,220,196,0.5)' }}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <FormControlLabel
                control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  sx={{ color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: '#d97534' } }} />}
                label={<Typography variant="body2" sx={{ color: 'rgba(232,220,196,0.7)' }}>Remember me</Typography>}
              />
              <Button variant="text" onClick={() => setForgotOpen(true)}
                sx={{ color: '#d97534', fontSize: '0.82rem', textTransform: 'none', p: 0, minWidth: 0,
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
                Forgot Password?
              </Button>
            </Box>
            <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}
              sx={{ py: 1.6, fontSize: '1rem', borderRadius: 2 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </form>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)',
            '&::before, &::after': { borderColor: 'rgba(255,255,255,0.08)' } }}>
            <Typography variant="body2" sx={{ color: 'rgba(232,220,196,0.4)', px: 1, fontSize: '0.8rem' }}>
              or continue with
            </Typography>
          </Divider>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {[
              { label: 'Google', icon: <GoogleIcon />, action: handleGoogleLogin },
              { label: 'GitHub', icon: <GitHubIcon />, action: handleGitHubLogin },
            ].map(({ label, icon, action }) => (
              <Button key={label} fullWidth variant="outlined" startIcon={icon} onClick={action}
                sx={{
                  py: 1.3, color: 'rgba(232,220,196,0.85)', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 2,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(217,117,52,0.5)' },
                }}>
                {label}
              </Button>
            ))}
          </Box>

          <Typography variant="body2" sx={{ textAlign: 'center', mt: 3.5, color: 'rgba(232,220,196,0.6)' }}>
            Don't have an account?{' '}
            <Link component={RouterLink} to="/signup" underline="hover"
              sx={{ color: '#d97534', fontWeight: 700, '&:hover': { color: '#e8905a' } }}>
              Sign Up
            </Link>
          </Typography>
        </Box>
      </Container>

      <Dialog open={forgotOpen} onClose={handleCloseForgot} fullWidth maxWidth="xs"
        PaperProps={{ sx: { bgcolor: '#1e2940', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, backgroundImage: 'none' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#e8dcc4' }}>
          {forgotSuccess ? 'Check Your Email' : 'Reset Password'}
          <IconButton onClick={handleCloseForgot} sx={{ color: 'rgba(232,220,196,0.5)' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {forgotSuccess ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CheckIcon sx={{ fontSize: 48, mb: 2, color: '#51cf66' }} />
              <Typography variant="body1" sx={{ color: '#e8dcc4' }}>
                We have sent a reset link to <strong>{forgotEmail}</strong>.
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2, color: 'rgba(232,220,196,0.65)' }}>
                Enter your email and we will send you a reset link.
              </Typography>
              {forgotError && (
                <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(255,107,107,0.1)', color: '#ff8a8a' }}>
                  {forgotError}
                </Alert>
              )}
              <TextField fullWidth label="Email Address" type="email" value={forgotEmail}
                onChange={(e) => { setForgotEmail(e.target.value); setForgotError(''); }} sx={fieldSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon /></InputAdornment> }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {forgotSuccess ? (
            <Button fullWidth variant="contained" onClick={handleCloseForgot}>Done</Button>
          ) : (
            <>
              <Button onClick={handleCloseForgot} sx={{ color: 'rgba(232,220,196,0.6)' }}>Cancel</Button>
              <Button variant="contained" onClick={handleForgotPassword} disabled={forgotLoading}>
                {forgotLoading ? <CircularProgress size={20} color="inherit" /> : 'Send Reset Link'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;
