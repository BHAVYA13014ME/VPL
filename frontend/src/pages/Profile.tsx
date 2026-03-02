import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Chip,
  LinearProgress,
  Divider,
  CircularProgress,
  Alert,
  Container,
} from '@mui/material';
import {
  Edit as EditIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  EmojiEvents as TrophyIcon,
  CalendarToday as CalendarIcon,
  AdminPanelSettings as AdminIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import EnhancedSettings from '../components/common/EnhancedSettings';
import axios from 'axios';

const CARD = 'rgba(30,41,64,0.85)';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#e8dcc4';
const MUTED = 'rgba(232,220,196,0.6)';
const ACCENT = '#d97534';

const cardSx = {
  bgcolor: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 3,
  backdropFilter: 'blur(12px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
};

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfileData(response.data);
    } catch (err: any) {
      console.error('Profile fetch error:', err);
      setError('Failed to load profile data');
      // Fall back to auth context user
      setProfileData(user);
    } finally {
      setLoading(false);
    }
  };

  const displayUser = profileData || user;

  const getInitials = () => {
    const first = displayUser?.firstName || '';
    const last = displayUser?.lastName || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'U';
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin': return { label: 'Administrator', color: '#ef4444', icon: <AdminIcon /> };
      case 'teacher': return { label: 'Teacher', color: '#3b82f6', icon: <SchoolIcon /> };
      default: return { label: 'Student', color: ACCENT, icon: <PersonIcon /> };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout title="Profile">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress sx={{ color: ACCENT }} />
        </Box>
      </Layout>
    );
  }

  const roleInfo = getRoleInfo(displayUser?.role || 'student');

  return (
    <Layout title="Profile">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error} — showing cached data.
          </Alert>
        )}

        {/* Hero Banner */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a3a5c 0%, #d97534 100%)',
            borderRadius: 4,
            p: { xs: 3, md: 5 },
            mb: 4,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle dot pattern */}
          <Box sx={{
            position: 'absolute', top: 0, right: 0, width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '20px 20px', opacity: 0.5,
          }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', position: 'relative' }}>
            {/* Avatar */}
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={displayUser?.profile?.profilePicture}
                sx={{
                  width: 100, height: 100,
                  fontSize: '2.5rem', fontWeight: 700,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  border: '3px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                {getInitials()}
              </Avatar>
              <Box sx={{
                position: 'absolute', bottom: 4, right: 4,
                width: 18, height: 18, borderRadius: '50%',
                bgcolor: '#22c55e', border: '2px solid white',
              }} />
            </Box>

            {/* Name & Role */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h3" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
                {displayUser?.firstName} {displayUser?.lastName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  icon={React.cloneElement(roleInfo.icon, { style: { color: 'white' } })}
                  label={roleInfo.label}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {displayUser?.email}
              </Typography>
            </Box>

            {/* Edit button */}
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setSettingsOpen(true)}
              sx={{
                color: 'white', borderColor: 'rgba(255,255,255,0.5)',
                fontWeight: 600,
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Edit Profile
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {/* Personal Information */}
          <Card sx={cardSx}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: TEXT, fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ color: ACCENT }} /> Personal Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <InfoRow icon={<EmailIcon sx={{ color: ACCENT }} />} label="Email" value={displayUser?.email || 'N/A'} />
                <Divider sx={{ borderColor: BORDER }} />
                <InfoRow icon={<PersonIcon sx={{ color: ACCENT }} />} label="Full Name" value={`${displayUser?.firstName || ''} ${displayUser?.lastName || ''}`.trim() || 'N/A'} />
                <Divider sx={{ borderColor: BORDER }} />
                <InfoRow icon={<SchoolIcon sx={{ color: ACCENT }} />} label="Role" value={roleInfo.label} />
                {displayUser?.profile?.phone && (
                  <>
                    <Divider sx={{ borderColor: BORDER }} />
                    <InfoRow icon={<PhoneIcon sx={{ color: ACCENT }} />} label="Phone" value={displayUser.profile.phone} />
                  </>
                )}
                {displayUser?.profile?.location && (
                  <>
                    <Divider sx={{ borderColor: BORDER }} />
                    <InfoRow icon={<LocationIcon sx={{ color: ACCENT }} />} label="Location" value={displayUser.profile.location} />
                  </>
                )}
                <Divider sx={{ borderColor: BORDER }} />
                <InfoRow icon={<CalendarIcon sx={{ color: ACCENT }} />} label="Member Since" value={formatDate(displayUser?.createdAt)} />
              </Box>
            </CardContent>
          </Card>

          {/* Stats / Activity */}
          <Card sx={cardSx}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: TEXT, fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrophyIcon sx={{ color: ACCENT }} /> Activity Summary
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <StatBar
                  icon={<SchoolIcon sx={{ color: '#3b82f6', fontSize: 20 }} />}
                  label="Courses Enrolled"
                  value={displayUser?.stats?.coursesEnrolled ?? displayUser?.courses?.length ?? 0}
                  max={20}
                  color="#3b82f6"
                />
                <StatBar
                  icon={<AssignmentIcon sx={{ color: ACCENT, fontSize: 20 }} />}
                  label="Assignments Completed"
                  value={displayUser?.stats?.assignmentsCompleted ?? 0}
                  max={50}
                  color={ACCENT}
                />
                <StatBar
                  icon={<TrophyIcon sx={{ color: '#f59e0b', fontSize: 20 }} />}
                  label="Points Earned"
                  value={displayUser?.gamification?.totalPoints ?? displayUser?.leaderboard?.totalPoints ?? 0}
                  max={500}
                  color="#f59e0b"
                />
              </Box>
            </CardContent>
          </Card>

          {/* Bio */}
          {displayUser?.profile?.bio && (
            <Card sx={{ ...cardSx, gridColumn: { xs: '1', md: '1 / -1' } }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: TEXT, fontWeight: 700, mb: 2 }}>About</Typography>
                <Typography sx={{ color: MUTED, lineHeight: 1.8 }}>
                  {displayUser.profile.bio}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Account Status */}
          <Card sx={{ ...cardSx, gridColumn: { xs: '1', md: '1 / -1' } }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: TEXT, fontWeight: 700, mb: 3 }}>Account Status</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={displayUser?.isActive !== false ? 'Active Account' : 'Inactive'}
                  sx={{
                    bgcolor: displayUser?.isActive !== false ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: displayUser?.isActive !== false ? '#22c55e' : '#ef4444',
                    fontWeight: 600, border: `1px solid ${displayUser?.isActive !== false ? '#22c55e' : '#ef4444'}44`,
                  }}
                />
                <Chip
                  label={displayUser?.isEmailVerified ? 'Email Verified' : 'Email Not Verified'}
                  sx={{
                    bgcolor: displayUser?.isEmailVerified ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                    color: displayUser?.isEmailVerified ? '#22c55e' : '#f59e0b',
                    fontWeight: 600, border: `1px solid ${displayUser?.isEmailVerified ? '#22c55e' : '#f59e0b'}44`,
                  }}
                />
                <Chip
                  label={roleInfo.label}
                  sx={{
                    bgcolor: 'rgba(217,117,52,0.15)',
                    color: ACCENT,
                    fontWeight: 600, border: `1px solid ${ACCENT}44`,
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>

      <EnhancedSettings open={settingsOpen} onClose={() => { setSettingsOpen(false); fetchProfile(); }} initialTab={1} />
    </Layout>
  );
};

// ── Helper components ──────────────────────────────────────
const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ width: 20, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</Box>
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" sx={{ color: 'rgba(232,220,196,0.5)', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: '#e8dcc4', fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

const StatBar: React.FC<{ icon: React.ReactNode; label: string; value: number; max: number; color: string }> = ({ icon, label, value, max, color }) => (
  <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="body2" sx={{ color: '#e8dcc4', fontWeight: 500 }}>{label}</Typography>
      </Box>
      <Typography variant="body2" sx={{ color, fontWeight: 700 }}>{value}</Typography>
    </Box>
    <LinearProgress
      variant="determinate"
      value={Math.min((value / max) * 100, 100)}
      sx={{
        height: 6, borderRadius: 3,
        bgcolor: 'rgba(255,255,255,0.08)',
        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
      }}
    />
  </Box>
);

export default ProfilePage;
