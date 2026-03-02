import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Checkbox,
  Box,
  Typography,
  IconButton,
  Chip,
  InputAdornment,
  Step,
  Stepper,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import {
  Close,
  Search,
  Group,
  Person,
  CameraAlt,
  ArrowBack,
  ArrowForward,
} from '@mui/icons-material';
import axios from 'axios';

const ACCENT = '#d97534';
const CARD  = '#1a2640';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT  = '#e8dcc4';
const MUTED = 'rgba(232,220,196,0.6)';

const dialogPaperSx = {
  bgcolor: '#111827',
  border: `1px solid ${BORDER}`,
  borderRadius: 3,
  backgroundImage: 'none',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.04)',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: `${ACCENT}88` },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& input, & textarea': { color: TEXT },
  '& .MuiInputLabel-root': { color: MUTED },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
  '& .MuiInputAdornment-root svg': { color: MUTED },
};

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
}

interface CreateGroupChatDialogProps {
  open: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const CreateGroupChatDialog: React.FC<CreateGroupChatDialogProps> = ({ open, onClose, onGroupCreated }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const steps = ['Select Participants', 'Group Info'];

  useEffect(() => {
    if (open) fetchUsers();
  }, [open]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/users/chat-participants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setUsers(res.data.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleUserToggle = (user: User) => {
    const isSelected = selectedUsers.some((u) => u._id === user._id);
    setSelectedUsers(isSelected ? selectedUsers.filter((u) => u._id !== user._id) : [...selectedUsers, user]);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => setGroupAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && selectedUsers.length < 2) { alert('Please select at least 2 participants'); return; }
    setActiveStep((p) => p + 1);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { alert('Please enter a group name'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', groupName);
      formData.append('description', groupDescription);
      formData.append('type', 'group');
      formData.append('participants', JSON.stringify(selectedUsers.map((u) => u._id)));
      if (groupAvatar) formData.append('avatar', groupAvatar);
      const res = await axios.post('/api/chat/rooms', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) { onGroupCreated(); handleClose(); }
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0); setSelectedUsers([]); setSearchQuery('');
    setGroupName(''); setGroupDescription(''); setGroupAvatar(null); setGroupAvatarPreview('');
    onClose();
  };

  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      {/* Header */}
      <DialogTitle sx={{ bgcolor: CARD, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {activeStep > 0 && (
            <IconButton onClick={() => setActiveStep((p) => p - 1)} size="small" sx={{ color: MUTED, '&:hover': { color: TEXT } }}>
              <ArrowBack fontSize="small" />
            </IconButton>
          )}
          <Group sx={{ color: ACCENT }} />
          <Typography variant="h6" sx={{ color: TEXT, fontWeight: 600 }}>
            {activeStep === 0 ? 'New Group Chat' : 'Group Details'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: MUTED, '&:hover': { color: TEXT } }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ px: 3, py: 2, bgcolor: CARD, borderBottom: `1px solid ${BORDER}`, '& .MuiStepLabel-label': { color: MUTED }, '& .MuiStepLabel-label.Mui-active': { color: TEXT }, '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.15)' }, '& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed': { color: ACCENT } }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <DialogContent sx={{ bgcolor: '#111827', py: 2 }}>
        {activeStep === 0 ? (
          <Box>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              sx={{ ...fieldSx, mb: 2 }}
            />

            {selectedUsers.length > 0 && (
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {selectedUsers.map((u) => (
                  <Chip
                    key={u._id}
                    label={`${u.firstName} ${u.lastName}`}
                    onDelete={() => handleUserToggle(u)}
                    avatar={<Avatar src={u.avatar}>{u.firstName[0]}{u.lastName[0]}</Avatar>}
                    sx={{ bgcolor: `${ACCENT}22`, color: TEXT, border: `1px solid ${ACCENT}44`, '& .MuiChip-deleteIcon': { color: MUTED, '&:hover': { color: TEXT } } }}
                  />
                ))}
              </Box>
            )}

            <Typography variant="caption" sx={{ color: MUTED, display: 'block', mb: 1 }}>
              {selectedUsers.length} participants selected (min 2)
            </Typography>

            <List sx={{ maxHeight: 360, overflow: 'auto', '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: `${ACCENT}44`, borderRadius: 3 } }}>
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.some((u) => u._id === user._id);
                return (
                  <ListItem key={user._id} disablePadding>
                    <ListItemButton onClick={() => handleUserToggle(user)} sx={{ borderRadius: 1, mb: 0.25, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                      <Checkbox checked={isSelected} sx={{ color: MUTED, '&.Mui-checked': { color: ACCENT } }} />
                      <ListItemAvatar>
                        <Avatar src={user.avatar} sx={{ border: isSelected ? `2px solid ${ACCENT}` : 'none' }}>
                          {user.firstName[0]}{user.lastName[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography sx={{ color: TEXT, fontSize: '0.9rem' }}>{user.firstName} {user.lastName}</Typography>}
                        secondary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: MUTED, fontSize: '0.75rem' }}>
                            <Person sx={{ fontSize: 14 }} />
                            {user.role === 'teacher' ? 'Teacher' : 'Student'}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ) : (
          <Box>
            {/* Avatar Picker */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar src={groupAvatarPreview} sx={{ width: 100, height: 100, bgcolor: `${ACCENT}33`, border: `3px solid ${ACCENT}66` }}>
                  <Group sx={{ fontSize: 50, color: ACCENT }} />
                </Avatar>
                <IconButton component="label" sx={{ position: 'absolute', bottom: -4, right: -4, bgcolor: CARD, border: `2px solid ${BORDER}`, color: MUTED, width: 32, height: 32, '&:hover': { color: ACCENT } }}>
                  <CameraAlt sx={{ fontSize: 16 }} />
                  <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                </IconButton>
              </Box>
            </Box>

            <TextField fullWidth label="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" required sx={{ ...fieldSx, mb: 2 }} />
            <TextField fullWidth label="Description (Optional)" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="What's this group about?" multiline rows={3} sx={{ ...fieldSx, mb: 2 }} />

            <Box sx={{ bgcolor: CARD, border: `1px solid ${BORDER}`, borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ color: TEXT, mb: 1 }}>Participants ({selectedUsers.length})</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {selectedUsers.map((u) => (
                  <Chip key={u._id} label={`${u.firstName} ${u.lastName}`} size="small" avatar={<Avatar src={u.avatar}>{u.firstName[0]}</Avatar>}
                    sx={{ bgcolor: `${ACCENT}22`, color: TEXT, border: `1px solid ${ACCENT}33` }} />
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ bgcolor: CARD, borderTop: `1px solid ${BORDER}`, px: 2.5, py: 1.5 }}>
        <Button onClick={handleClose} sx={{ color: MUTED, textTransform: 'none', '&:hover': { color: TEXT } }}>Cancel</Button>
        {activeStep === 0 ? (
          <Button variant="contained" onClick={handleNext} disabled={selectedUsers.length < 2} endIcon={<ArrowForward />}
            sx={{ background: `linear-gradient(135deg, ${ACCENT}, #c06420)`, textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { background: `linear-gradient(135deg, #c06420, ${ACCENT})` }, '&.Mui-disabled': { opacity: 0.45 } }}>
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={handleCreateGroup} disabled={loading || !groupName.trim()} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Group />}
            sx={{ background: `linear-gradient(135deg, ${ACCENT}, #c06420)`, textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { background: `linear-gradient(135deg, #c06420, ${ACCENT})` }, '&.Mui-disabled': { opacity: 0.45 } }}>
            {loading ? 'Creating...' : 'Create Group'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateGroupChatDialog;
