import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Chip, Avatar,
  IconButton, Container, Tooltip, CircularProgress,
  LinearProgress, alpha,
} from '@mui/material';
import {
  School, Assignment, TrendingUp, PlayArrow,
  EmojiEvents, Notifications, Campaign, Warning, Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

interface DashboardStats {
  enrolledCourses: number;
  completedAssignments: number;
  pendingAssignments: number;
  totalPoints: number;
  rank: number;
  streak: number | { current: number; longest: number; lastActivity: string };
}

interface RecentActivity {
  _id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  course?: { title: string };
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  courseTitle: string;
  courseId: string;
  isImportant: boolean;
  createdAt: string;
  attachments?: { filename: string; originalName: string; path: string; size: number; mimeType: string }[];
}

// ── Design tokens ──────────────────────────────────────────────
const NAV  = '#111827';
const CARD = 'rgba(30,41,64,0.85)';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT  = '#e8dcc4';
const MUTED = 'rgba(232,220,196,0.6)';
const ACCENT = '#d97534';

const statCards = [
  { key: 'enrolledCourses',        label: 'Enrolled Courses',    color: '#4facfe', Icon: School,      max: 10  },
  { key: 'completedAssignments',   label: 'Completed',           color: '#f093fb', Icon: Assignment,  max: 20  },
  { key: 'totalPoints',            label: 'Total Points',        color: '#ffd700', Icon: EmojiEvents, max: 1000 },
  { key: 'rank',                   label: 'Class Rank',          color: '#00f2fe', Icon: TrendingUp,  max: null },
];

const StudentDashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diff < 1) return `${Math.floor((now.getTime() - date.getTime()) / 60000)}m ago`;
    if (diff < 24) return `${diff}h ago`;
    if (diff < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.firstName) return user.firstName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const getUserDisplayName = () => {
    if (!user) return 'Student';
    if (user.fullName) return user.fullName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.email || 'Student';
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      const res = await axios.get('/api/dashboard/student', { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) { setDashboardData(res.data.data); setLastUpdated(new Date()); }
    } catch (e) { console.error('Error fetching dashboard data:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboardData();
    const iv = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(iv);
  }, []);

  const stats: DashboardStats = {
    enrolledCourses:      dashboardData?.stats?.totalCourses || 0,
    completedAssignments: dashboardData?.stats?.completedAssignments || 0,
    pendingAssignments:   dashboardData?.stats?.pendingAssignments || 0,
    totalPoints:          dashboardData?.stats?.totalPoints || 0,
    rank:                 dashboardData?.stats?.rank || 0,
    streak:               dashboardData?.stats?.streak || 0,
  };
  const streakDays = typeof stats.streak === 'object' ? stats.streak.current : stats.streak;
  const announcements: Announcement[]  = dashboardData?.announcements || [];
  const recentActivity: RecentActivity[] = dashboardData?.recentActivity || [];

  // ─── helpers ───────────────────────────────────────────────────
  const cardSx = {
    bgcolor: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 3,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  };

  return (
    <Layout title="Student Dashboard">
      <Box sx={{ background: 'linear-gradient(135deg, #111827 0%, #1a2332 100%)', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="xl">

          {/* ── Welcome banner ─────────────────────────────────── */}
          <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'flex-start' }}>
            <Box sx={{ ...cardSx, flex: 1, p: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                src={user?.profile?.profilePicture}
                sx={{ width: 72, height: 72, background: `linear-gradient(135deg, ${ACCENT}, #c06420)`, fontSize: '1.8rem' }}
              >
                {getUserInitials()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: TEXT, mb: 0.5 }}>
                  Welcome back, {getUserDisplayName()}!
                </Typography>
                <Typography variant="body2" sx={{ color: MUTED, mb: 1 }}>
                  Ready to continue your learning journey? Let's achieve greatness together!
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(232,220,196,0.4)' }}>
                  Last updated {lastUpdated.toLocaleTimeString()} · auto-refreshes every 30s
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Refresh data">
              <span>
                <IconButton onClick={fetchDashboardData} disabled={loading}
                  sx={{ bgcolor: alpha(ACCENT, 0.15), color: ACCENT, border: `1px solid ${alpha(ACCENT, 0.3)}`,
                    '&:hover': { bgcolor: alpha(ACCENT, 0.25) }, mt: 1 }}>
                  {loading ? <CircularProgress size={20} sx={{ color: ACCENT }} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {/* ── Stat cards ─────────────────────────────────────── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2.5, mb: 4 }}>
            {statCards.map(({ key, label, color, Icon, max }) => {
              const value = key === 'rank' ? stats.rank : (stats as any)[key];
              const pct = max ? Math.min((value / max) * 100, 100) : Math.max(100 - value * 10, 10);
              return (
                <Card key={key} sx={{ ...cardSx,
                  cursor: key === 'completedAssignments' ? 'pointer' : 'default',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': key === 'completedAssignments' ? { transform: 'translateY(-3px)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' } : {},
                }} onClick={key === 'completedAssignments' ? () => navigate('/assignments') : undefined}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(color, 0.15), display: 'flex' }}>
                        <Icon sx={{ color, fontSize: 28 }} />
                      </Box>
                      <Box>
                        <Typography variant="h4" fontWeight={700} sx={{ color: TEXT, lineHeight: 1 }}>
                          {key === 'rank' ? `#${value}` : value}
                        </Typography>
                        <Typography variant="caption" sx={{ color: MUTED }}>
                          {label}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: MUTED }}>Progress</Typography>
                        <Typography variant="caption" sx={{ color }}>{pct.toFixed(0)}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.07)',
                          '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})` } }} />
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {/* ── Main grid ──────────────────────────────────────── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mb: 3 }}>
            {/* Announcements */}
            <Box sx={{ ...cardSx, p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: TEXT, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Campaign sx={{ color: '#ff6b6b' }} /> Course Announcements
              </Typography>
              {announcements.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {announcements.map((a) => (
                    <Box key={a._id}
                      onClick={() => {
                        if (a.attachments?.length) {
                          const pdf = a.attachments.find(x => x.mimeType === 'application/pdf' || x.filename.endsWith('.pdf'));
                          if (pdf) window.open(`${API_BASE_URL}${pdf.path}`, '_blank');
                        }
                      }}
                      sx={{
                        p: 2, borderRadius: 2,
                        bgcolor: a.isImportant ? 'rgba(255,107,107,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${a.isImportant ? 'rgba(255,107,107,0.25)' : BORDER}`,
                        cursor: a.attachments?.length ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        '&:hover': a.attachments?.length ? { transform: 'translateX(6px)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' } : {},
                      }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        {a.isImportant && <Warning sx={{ color: '#ff6b6b', flexShrink: 0, mt: 0.2 }} />}
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: TEXT }}>{a.title}</Typography>
                            {a.isImportant && <Chip label="Important" size="small" sx={{ bgcolor: 'rgba(255,107,107,0.2)', color: '#ff6b6b', fontWeight: 700, height: 20 }} />}
                          </Box>
                          <Typography variant="body2" sx={{ color: MUTED, mb: 1 }}>{a.content}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip label={a.courseTitle} size="small" icon={<School sx={{ fontSize: '14px !important' }} />}
                              sx={{ bgcolor: 'rgba(79,172,254,0.12)', color: '#4facfe', borderColor: 'rgba(79,172,254,0.25)' }} variant="outlined" />
                            <Typography variant="caption" sx={{ color: 'rgba(232,220,196,0.4)' }}>{formatDate(a.createdAt)}</Typography>
                            {a.attachments && a.attachments.length > 0 && (
                              <Chip label={`📎 ${a.attachments.length} file${a.attachments.length > 1 ? 's' : ''}`} size="small"
                                sx={{ bgcolor: 'rgba(79,172,254,0.15)', color: '#4facfe', fontWeight: 600, height: 20 }} />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Campaign sx={{ fontSize: 52, color: 'rgba(255,255,255,0.15)', mb: 1.5 }} />
                  <Typography variant="body2" sx={{ color: MUTED }}>No announcements yet</Typography>
                </Box>
              )}
            </Box>

            {/* Quick stats */}
            <Box sx={{ ...cardSx, p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: TEXT, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmojiEvents sx={{ color: '#ffd700' }} /> Quick Stats
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {[
                  { label: 'Course Progress', value: 75 },
                  {
                    label: 'Assignment Completion',
                    value: stats.completedAssignments + stats.pendingAssignments
                      ? Math.round((stats.completedAssignments / (stats.completedAssignments + stats.pendingAssignments)) * 100) : 0
                  },
                  { label: 'Learning Streak', value: Math.min((streakDays / 30) * 100, 100), suffix: `${streakDays} days` },
                ].map(({ label, value, suffix }) => (
                  <Box key={label}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                      <Typography variant="body2" sx={{ color: MUTED }}>{label}</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ color: TEXT }}>{suffix ?? `${value}%`}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={value}
                      sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.07)', height: 6,
                        '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${ACCENT}, #e8905a)` } }} />
                  </Box>
                ))}
                <Box
                  onClick={() => navigate('/analytics')}
                  sx={{
                    mt: 1, p: 1.5, textAlign: 'center', borderRadius: 2,
                    border: `1px solid ${alpha(ACCENT, 0.35)}`,
                    color: ACCENT, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: alpha(ACCENT, 0.12) },
                  }}
                >
                  View Detailed Analytics
                </Box>
              </Box>
            </Box>
          </Box>

          {/* ── Recent activity ────────────────────────────────── */}
          <Box sx={{ ...cardSx, p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: TEXT, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Notifications sx={{ color: '#f093fb' }} /> Recent Activity
            </Typography>
            {recentActivity.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recentActivity.map((a, i) => (
                  <Box key={a._id || i} sx={{
                    display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2,
                    transition: 'bgcolor 0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                  }}>
                    <Avatar sx={{ bgcolor: 'rgba(79,172,254,0.15)', color: '#4facfe', width: 40, height: 40, fontSize: '1.1rem' }}>
                      {a.type === 'assignment' ? <Assignment fontSize="small" /> : <School fontSize="small" />}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: TEXT, fontWeight: 600 }}>{a.title}</Typography>
                      <Typography variant="caption" sx={{ color: MUTED }}>{a.description}</Typography>
                      {a.course && (
                        <Chip label={a.course.title} size="small"
                          sx={{ ml: 0, mt: 0.5, bgcolor: 'rgba(217,117,52,0.12)', color: ACCENT, height: 18, fontSize: '0.7rem' }} />
                      )}
                    </Box>
                    <IconButton size="small" sx={{ color: 'rgba(232,220,196,0.4)', '&:hover': { color: ACCENT } }}>
                      <PlayArrow fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: MUTED }}>No recent activity</Typography>
              </Box>
            )}
          </Box>

        </Container>
      </Box>
    </Layout>
  );
};

const StudentDashboard: React.FC = () => (
  <Routes>
    <Route path="/*" element={<StudentDashboardHome />} />
  </Routes>
);

export default StudentDashboard;
