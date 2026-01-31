import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  WorkspacePremium as BadgeIcon,
  EmojiEventsOutlined as AchievementIcon,
  Info as InfoIcon,
  Grade as GradeIcon,
  AccessTime as TimeIcon,
  Psychology as SkillIcon,
  Flag as MilestoneIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import axios from 'axios';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string;
}

interface LeaderboardEntry {
  _id: string;
  user: User;
  totalPoints: number;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  badges: Badge[];
  achievements: Achievement[];
  statistics: Statistics;
  rank: number;
  pointsToNextLevel: number;
  isCurrentUser?: boolean;
}

interface Badge {
  type: string;
  level: number;
  earnedAt: string;
  metadata?: any;
}

interface Achievement {
  type: string;
  title: string;
  description: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  pointsAwarded: number;
}

interface Statistics {
  coursesCompleted: number;
  assignmentsCompleted: number;
  totalStudyTime: number;
  averageGrade: number;
  streakDays: number;
  skillsLearned: string[];
  milestonesReached: number;
}

interface BadgeInfo {
  type: string;
  name: string;
  description: string;
  levels: { level: number; name: string; color: string; requirements: string }[];
  icon: React.ReactNode;
}

const badgeTypes: BadgeInfo[] = [
  {
    type: 'assignment_master',
    name: 'Assignment Master',
    description: 'Awarded for completing assignments with high scores',
    icon: <AssignmentIcon />,
    levels: [
      { level: 1, name: 'Bronze', color: '#cd7f32', requirements: '10 assignments with 80%+ score' },
      { level: 2, name: 'Silver', color: '#c0c0c0', requirements: '25 assignments with 85%+ score' },
      { level: 3, name: 'Gold', color: '#ffd700', requirements: '50 assignments with 90%+ score' },
    ]
  },
  {
    type: 'course_explorer',
    name: 'Course Explorer',
    description: 'Awarded for enrolling in and completing courses',
    icon: <SchoolIcon />,
    levels: [
      { level: 1, name: 'Bronze', color: '#cd7f32', requirements: 'Complete 3 courses' },
      { level: 2, name: 'Silver', color: '#c0c0c0', requirements: 'Complete 10 courses' },
      { level: 3, name: 'Gold', color: '#ffd700', requirements: 'Complete 25 courses' },
    ]
  },
  {
    type: 'consistent_learner',
    name: 'Consistent Learner',
    description: 'Awarded for maintaining learning streaks',
    icon: <TimelineIcon />,
    levels: [
      { level: 1, name: 'Bronze', color: '#cd7f32', requirements: '7-day learning streak' },
      { level: 2, name: 'Silver', color: '#c0c0c0', requirements: '30-day learning streak' },
      { level: 3, name: 'Gold', color: '#ffd700', requirements: '100-day learning streak' },
    ]
  },
  {
    type: 'high_achiever',
    name: 'High Achiever',
    description: 'Awarded for maintaining excellent grades',
    icon: <GradeIcon />,
    levels: [
      { level: 1, name: 'Bronze', color: '#cd7f32', requirements: 'Maintain 85%+ average' },
      { level: 2, name: 'Silver', color: '#c0c0c0', requirements: 'Maintain 90%+ average' },
      { level: 3, name: 'Gold', color: '#ffd700', requirements: 'Maintain 95%+ average' },
    ]
  }
];

const achievementTypes = [
  { type: 'first_course', title: 'Getting Started', description: 'Completed your first course', rarity: 'common', points: 50 },
  { type: 'perfect_score', title: 'Perfectionist', description: 'Achieved 100% on an assignment', rarity: 'rare', points: 100 },
  { type: 'speed_learner', title: 'Speed Learner', description: 'Completed a course in under 24 hours', rarity: 'epic', points: 200 },
  { type: 'knowledge_seeker', title: 'Knowledge Seeker', description: 'Enrolled in 5 different categories', rarity: 'rare', points: 150 },
  { type: 'master_learner', title: 'Master Learner', description: 'Reached level 10', rarity: 'legendary', points: 500 }
];

const getRarityColor = (rarity: string) => {
  const colors = {
    common: '#757575',
    rare: '#2196f3',
    epic: '#9c27b0',
    legendary: '#ff9800'
  };
  return colors[rarity as keyof typeof colors] || '#757575';
};

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRanking, setUserRanking] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
    if (user) {
      fetchUserRanking();
    }
  }, [user, activeTab]);

  const fetchLeaderboard = async () => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = '/api/leaderboard';
      
      if (activeTab === 1) {
        endpoint = '/api/leaderboard/top';
      }
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLeaderboard(response.data.data);
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      setError(error.response?.data?.message || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRanking = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/leaderboard/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUserRanking(response.data.data);
    } catch (error) {
      console.error('Error fetching user ranking:', error);
    }
  };

  const calculateProgress = (currentXP: number, nextLevelXP: number) => {
    if (nextLevelXP === 0) return 100;
    return (currentXP / nextLevelXP) * 100;
  };

  const getBadgeInfo = (badgeType: string): BadgeInfo | undefined => {
    return badgeTypes.find(b => b.type === badgeType);
  };

  const getBadgeLevel = (badge: Badge): { name: string; color: string } => {
    const badgeInfo = getBadgeInfo(badge.type);
    const levelInfo = badgeInfo?.levels.find(l => l.level === badge.level);
    return {
      name: levelInfo?.name || 'Unknown',
      color: levelInfo?.color || '#757575'
    };
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <TrophyIcon sx={{ color: '#ffd700' }} />;
    if (rank === 2) return <TrophyIcon sx={{ color: '#c0c0c0' }} />;
    if (rank === 3) return <TrophyIcon sx={{ color: '#cd7f32' }} />;
    return <Typography variant="body2" fontWeight="bold">{rank}</Typography>;
  };

  if (loading) {
    return (
      <Layout title="Leaderboard">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout title="Leaderboard">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrophyIcon sx={{ fontSize: 40, color: '#ffd700' }} />
            Leaderboard
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* User Ranking Card */}
        {userRanking && (
          <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Your Ranking</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Avatar
                    src={userRanking.user.avatar}
                    sx={{ width: 60, height: 60 }}
                  >
                    {userRanking.user.firstName[0]}{userRanking.user.lastName[0]}
                  </Avatar>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="h5">
                    {userRanking.user.firstName} {userRanking.user.lastName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Rank #{userRanking.rank} • Level {userRanking.level}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">{userRanking.totalPoints}</Typography>
                  <Typography variant="body2">Total Points</Typography>
                </Box>
                <Box sx={{ minWidth: 250, mt: { xs: 2, md: 0 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Level Progress</Typography>
                    <Typography variant="body2">
                      {userRanking.currentXP}/{userRanking.nextLevelXP} XP
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={calculateProgress(userRanking.currentXP, userRanking.nextLevelXP)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(255,255,255,0.3)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#ffd700'
                      }
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Overall Leaderboard" />
            <Tab label="Top Performers" />
          </Tabs>
        </Box>

        {/* Leaderboard Table */}
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>Rank</TableCell>
                <TableCell>User</TableCell>
                <TableCell align="center">Level</TableCell>
                <TableCell align="center">Total Points</TableCell>
                <TableCell align="center">Badges</TableCell>
                <TableCell align="center">Achievements</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.map((entry) => (
                <TableRow 
                  key={entry._id}
                  sx={{
                    bgcolor: entry.isCurrentUser ? '#e3f2fd' : 'inherit',
                    '&:hover': { bgcolor: '#f5f5f5' }
                  }}
                >
                  {/* Rank */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getRankIcon(entry.rank)}
                    </Box>
                  </TableCell>

                  {/* User */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar src={entry.user.avatar}>
                        {entry.user.firstName[0]}{entry.user.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight={entry.isCurrentUser ? 'bold' : 'normal'}>
                          {entry.user.firstName} {entry.user.lastName}
                          {entry.isCurrentUser && (
                            <Chip label="You" size="small" sx={{ ml: 1, bgcolor: '#2196f3', color: 'white' }} />
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {entry.user.role.charAt(0).toUpperCase() + entry.user.role.slice(1)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Level */}
                  <TableCell align="center">
                    <Box>
                      <Typography variant="h6">{entry.level}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={calculateProgress(entry.currentXP, entry.nextLevelXP)}
                        sx={{ width: 60, mx: 'auto', mt: 0.5 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {entry.currentXP}/{entry.nextLevelXP}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Total Points */}
                  <TableCell align="center">
                    <Typography variant="h6" color="primary">
                      {entry.totalPoints.toLocaleString()}
                    </Typography>
                  </TableCell>

                  {/* Badges */}
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      {entry.badges.slice(0, 3).map((badge, index) => {
                        const badgeInfo = getBadgeInfo(badge.type);
                        const badgeLevel = getBadgeLevel(badge);
                        return (
                          <Tooltip key={index} title={`${badgeInfo?.name} - ${badgeLevel.name}`}>
                            <Badge
                              badgeContent={badge.level}
                              color="primary"
                              sx={{
                                '& .MuiBadge-badge': {
                                  bgcolor: badgeLevel.color
                                }
                              }}
                            >
                              <BadgeIcon sx={{ color: badgeLevel.color }} />
                            </Badge>
                          </Tooltip>
                        );
                      })}
                      {entry.badges.length > 3 && (
                        <Typography variant="body2" color="text.secondary">
                          +{entry.badges.length - 3}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  {/* Achievements */}
                  <TableCell align="center">
                    <Typography variant="body2">
                      {entry.achievements.length}
                    </Typography>
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="center">
                    <IconButton
                      onClick={() => {
                        setSelectedUser(entry);
                        setProfileDialogOpen(true);
                      }}
                    >
                      <InfoIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* User Profile Dialog */}
        <Dialog 
          open={profileDialogOpen} 
          onClose={() => setProfileDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar 
                src={selectedUser?.user.avatar}
                sx={{ width: 50, height: 50 }}
              >
                {selectedUser?.user.firstName[0]}{selectedUser?.user.lastName[0]}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {selectedUser?.user.firstName} {selectedUser?.user.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rank #{selectedUser?.rank} • Level {selectedUser?.level}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {selectedUser && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  {/* Statistics */}
                  <Box>
                    <Typography variant="h6" gutterBottom>Statistics</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><SchoolIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Courses Completed" 
                          secondary={selectedUser.statistics.coursesCompleted}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><AssignmentIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Assignments Completed" 
                          secondary={selectedUser.statistics.assignmentsCompleted}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><TimeIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Study Time" 
                          secondary={formatTime(selectedUser.statistics.totalStudyTime)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><GradeIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Average Grade" 
                          secondary={`${selectedUser.statistics.averageGrade.toFixed(1)}%`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><TrendingUpIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Current Streak" 
                          secondary={`${selectedUser.statistics.streakDays} days`}
                        />
                      </ListItem>
                    </List>
                  </Box>

                  {/* Badges */}
                  <Box>
                    <Typography variant="h6" gutterBottom>Badges</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedUser.badges.map((badge, index) => {
                        const badgeInfo = getBadgeInfo(badge.type);
                        const badgeLevel = getBadgeLevel(badge);
                        return (
                          <Tooltip key={index} title={badgeInfo?.description}>
                            <Chip
                              label={`${badgeInfo?.name} - ${badgeLevel.name}`}
                              sx={{
                                bgcolor: badgeLevel.color,
                                color: 'white'
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>

                {/* Achievements */}
                <Box>
                  <Typography variant="h6" gutterBottom>Recent Achievements</Typography>
                  <List>
                    {selectedUser.achievements.slice(0, 5).map((achievement, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: getRarityColor(achievement.rarity) }}>
                              <AchievementIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={achievement.title}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {achievement.description}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(achievement.earnedAt).toLocaleDateString()} • {achievement.pointsAwarded} points
                                </Typography>
                              </Box>
                            }
                          />
                          <Chip
                            label={achievement.rarity}
                            size="small"
                            sx={{
                              bgcolor: getRarityColor(achievement.rarity),
                              color: 'white'
                            }}
                          />
                        </ListItem>
                        {index < selectedUser.achievements.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setProfileDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default Leaderboard;
