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
  Paper,
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

const CreateGroupChatDialog: React.FC<CreateGroupChatDialogProps> = ({
  open,
  onClose,
  onGroupCreated,
}) => {
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

  // Fetch users (teachers and students)
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users/chat-participants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleUserToggle = (user: User) => {
    const isSelected = selectedUsers.some((u) => u._id === user._id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && selectedUsers.length < 2) {
      alert('Please select at least 2 participants for a group');
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', groupName);
      formData.append('description', groupDescription);
      formData.append('type', 'group');
      formData.append('participants', JSON.stringify(selectedUsers.map((u) => u._id)));

      if (groupAvatar) {
        formData.append('avatar', groupAvatar);
      }

      const response = await axios.post(
        '/api/chat/rooms',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        onGroupCreated();
        handleClose();
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedUsers([]);
    setSearchQuery('');
    setGroupName('');
    setGroupDescription('');
    setGroupAvatar(null);
    setGroupAvatarPreview('');
    onClose();
  };

  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {activeStep > 0 && (
              <IconButton onClick={handleBack} size="small">
                <ArrowBack />
              </IconButton>
            )}
            <Group />
            <Typography variant="h6">
              {activeStep === 0 ? 'New Group' : 'Group Info'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Stepper activeStep={activeStep} sx={{ px: 3, py: 2 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <DialogContent dividers>
        {activeStep === 0 ? (
          <Box>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {selectedUsers.length > 0 && (
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedUsers.map((user) => (
                  <Chip
                    key={user._id}
                    label={`${user.firstName} ${user.lastName}`}
                    onDelete={() => handleUserToggle(user)}
                    avatar={
                      <Avatar src={user.avatar}>
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </Avatar>
                    }
                  />
                ))}
              </Box>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {selectedUsers.length} participants selected
            </Typography>

            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.some((u) => u._id === user._id);
                return (
                  <ListItem key={user._id} disablePadding>
                    <ListItemButton onClick={() => handleUserToggle(user)}>
                      <Checkbox checked={isSelected} />
                      <ListItemAvatar>
                        <Avatar src={user.avatar}>
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${user.firstName} ${user.lastName}`}
                        secondary={
                          <Box component="span" display="flex" alignItems="center" gap={0.5}>
                            {user.role === 'teacher' ? (
                              <>
                                <Person fontSize="small" />
                                Teacher
                              </>
                            ) : (
                              <>
                                <Person fontSize="small" />
                                Student
                              </>
                            )}
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
            <Box display="flex" justifyContent="center" mb={3}>
              <Box position="relative">
                <Avatar
                  src={groupAvatarPreview}
                  sx={{ width: 120, height: 120, bgcolor: 'primary.main' }}
                >
                  <Group sx={{ fontSize: 60 }} />
                </Avatar>
                <IconButton
                  component="label"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'background.paper',
                    border: '2px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <CameraAlt />
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleAvatarChange}
                  />
                </IconButton>
              </Box>
            </Box>

            <TextField
              fullWidth
              label="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Group Description (Optional)"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What's this group about?"
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Participants ({selectedUsers.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {selectedUsers.map((user) => (
                  <Chip
                    key={user._id}
                    label={`${user.firstName} ${user.lastName}`}
                    size="small"
                    avatar={
                      <Avatar src={user.avatar}>
                        {user.firstName[0]}
                      </Avatar>
                    }
                  />
                ))}
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {activeStep === 0 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={selectedUsers.length < 2}
            endIcon={<ArrowForward />}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleCreateGroup}
            disabled={loading || !groupName.trim()}
            startIcon={<Group />}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateGroupChatDialog;
