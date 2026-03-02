import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Checkbox,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Group, School, Close } from '@mui/icons-material';
import axios from 'axios';

const ACCENT = '#d97534';
const CARD   = '#1a2640';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT   = '#e8dcc4';
const MUTED  = 'rgba(232,220,196,0.6)';

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
  '& .MuiSelect-icon': { color: MUTED },
};

interface CreateChatDialogProps {
  open: boolean;
  onClose: () => void;
  onChatCreated: () => void;
}

interface Course {
  _id: string;
  title: string;
  code: string;
}

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

const CreateChatDialog: React.FC<CreateChatDialogProps> = ({ open, onClose, onChatCreated }) => {
  const [chatType, setChatType] = useState<'group' | 'course'>('group');
  const [chatName, setChatName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { if (open) fetchCourses(); }, [open]);
  useEffect(() => { if (selectedCourse && chatType === 'course') fetchCourseStudents(selectedCourse); }, [selectedCourse, chatType]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/courses/my/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setCourses(res.data.data.courses || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setCourses([]);
    }
  };

  const fetchCourseStudents = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/courses/${courseId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setStudents(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    }
  };

  const handleToggleStudent = (id: string) =>
    setSelectedStudents((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  const handleSelectAll = () =>
    setSelectedStudents(selectedStudents.length === students.length ? [] : students.map((s) => s._id));

  const handleCreateChat = async () => {
    if (!chatName.trim() || (chatType === 'course' && !selectedCourse) || selectedStudents.length === 0) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/chat/rooms',
        { name: chatName, description, type: chatType, courseId: chatType === 'course' ? selectedCourse : undefined, participantIds: selectedStudents },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) { onChatCreated(); handleClose(); }
    } catch (err) {
      console.error('Error creating chat room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setChatName(''); setDescription(''); setSelectedCourse('');
    setSelectedStudents([]); setChatType('group'); setSearchQuery('');
    onClose();
  };

  const filteredStudents = students.filter((s) =>
    `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectMenuSx = { PaperProps: { sx: { bgcolor: '#1a2640', border: `1px solid ${BORDER}`, color: TEXT, '& .MuiMenuItem-root:hover': { bgcolor: `${ACCENT}22` }, '& .MuiMenuItem-root.Mui-selected': { bgcolor: `${ACCENT}33` } } } };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      {/* Header */}
      <DialogTitle sx={{ bgcolor: CARD, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Group sx={{ color: ACCENT }} />
          <Typography variant="h6" sx={{ color: TEXT, fontWeight: 600 }}>Create New Chat Room</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: MUTED, '&:hover': { color: TEXT } }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#111827', pt: 2.5, pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Chat Type Toggle */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {(['group', 'course'] as const).map((type) => (
              <Box
                key={type}
                onClick={() => setChatType(type)}
                sx={{ flex: 1, p: 1.5, borderRadius: 2, border: `1px solid ${chatType === type ? ACCENT : BORDER}`, bgcolor: chatType === type ? `${ACCENT}18` : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, transition: 'all 0.2s' }}
              >
                {type === 'group' ? <Group sx={{ color: chatType === type ? ACCENT : MUTED, fontSize: 20 }} /> : <School sx={{ color: chatType === type ? ACCENT : MUTED, fontSize: 20 }} />}
                <Typography sx={{ color: chatType === type ? TEXT : MUTED, fontWeight: chatType === type ? 600 : 400, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                  {type === 'group' ? 'Group Chat' : 'Course Chat'}
                </Typography>
              </Box>
            ))}
          </Box>

          <TextField fullWidth label="Chat Name" value={chatName} onChange={(e) => setChatName(e.target.value)} placeholder="Enter chat room name" sx={fieldSx} />
          <TextField fullWidth label="Description (Optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter chat description" multiline rows={2} sx={fieldSx} />

          {chatType === 'course' && (
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Select Course</InputLabel>
              <Select value={selectedCourse} label="Select Course" onChange={(e) => setSelectedCourse(e.target.value)} MenuProps={selectMenuSx} sx={{ color: TEXT }}>
                {courses.map((c) => (
                  <MenuItem key={c._id} value={c._id}>{c.code} - {c.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Participants Section */}
          {(chatType === 'group' || selectedCourse) && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ color: TEXT }}>
                  Participants ({selectedStudents.length} selected)
                </Typography>
                {students.length > 0 && (
                  <Button size="small" onClick={handleSelectAll} sx={{ color: ACCENT, textTransform: 'none', fontSize: '0.75rem' }}>
                    {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </Box>

              <TextField
                fullWidth size="small"
                placeholder="Search participants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={fieldSx}
              />

              <Box sx={{ maxHeight: 280, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: `${ACCENT}44`, borderRadius: 3 } }}>
                {filteredStudents.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: MUTED }}>
                      {students.length === 0
                        ? chatType === 'course' && selectedCourse ? 'No students enrolled in this course' : 'Select a course to see students'
                        : 'No students found'}
                    </Typography>
                  </Box>
                ) : (
                  <List dense>
                    {filteredStudents.map((student) => (
                      <ListItem key={student._id} disablePadding>
                        <ListItemButton onClick={() => handleToggleStudent(student._id)} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                          <Checkbox checked={selectedStudents.includes(student._id)} sx={{ color: MUTED, '&.Mui-checked': { color: ACCENT } }} />
                          <ListItemAvatar>
                            <Avatar src={student.avatar} sx={{ width: 36, height: 36, border: selectedStudents.includes(student._id) ? `2px solid ${ACCENT}` : 'none' }}>
                              {student.firstName[0]}{student.lastName[0]}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography sx={{ color: TEXT, fontSize: '0.875rem' }}>{student.firstName} {student.lastName}</Typography>}
                            secondary={<Typography sx={{ color: MUTED, fontSize: '0.75rem' }}>{student.email}</Typography>}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ bgcolor: CARD, borderTop: `1px solid ${BORDER}`, px: 2.5, py: 1.5 }}>
        <Button onClick={handleClose} disabled={loading} sx={{ color: MUTED, textTransform: 'none', '&:hover': { color: TEXT } }}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateChat}
          variant="contained"
          disabled={!chatName.trim() || (chatType === 'course' && !selectedCourse) || selectedStudents.length === 0 || loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ background: `linear-gradient(135deg, ${ACCENT}, #c06420)`, textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { background: `linear-gradient(135deg, #c06420, ${ACCENT})` }, '&.Mui-disabled': { opacity: 0.45 } }}
        >
          {loading ? 'Creating...' : 'Create Chat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateChatDialog;
