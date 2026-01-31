import {
  Dashboard as DashboardIcon,
  School,
  Assignment,
  Chat,
  Analytics,
  Leaderboard,
  People,
  Settings
} from '@mui/icons-material';

// Define consistent navigation for each role
export const getNavigationItems = (userRole: string) => {
  const baseItems = [
    { text: 'Dashboard', icon: DashboardIcon, path: `/${userRole}`, roles: ['admin', 'teacher', 'student'] },
    { text: 'My Courses', icon: School, path: '/courses', roles: ['admin', 'teacher', 'student'] },
    { text: 'Assignments', icon: Assignment, path: '/assignments', roles: ['admin', 'teacher', 'student'] },
    { text: 'Chat', icon: Chat, path: '/chat', roles: ['admin', 'teacher', 'student'] },
    { text: 'Leaderboard', icon: Leaderboard, path: '/leaderboard', roles: ['admin', 'teacher', 'student'] },
    { text: 'Analytics', icon: Analytics, path: '/analytics', roles: ['admin', 'teacher'] },
  ];

  // Add role-specific items
  if (userRole === 'admin') {
    baseItems.splice(2, 0, { text: 'Users', icon: People, path: '/admin/users', roles: ['admin'] });
    baseItems.push({ text: 'Settings', icon: Settings, path: '/admin/settings', roles: ['admin'] });
  }

  return baseItems.filter(item => item.roles.includes(userRole));
};