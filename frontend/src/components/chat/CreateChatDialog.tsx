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
  Chip,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { Group, School } from '@mui/icons-material';
import axios from 'axios';

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

  // Fetch courses
  useEffect(() => {
    if (open) {
      fetchCourses();
    }
  }, [open]);

  // Fetch students when course is selected
  useEffect(() => {
    if (selectedCourse && chatType === 'course') {
      fetchCourseStudents(selectedCourse);
    }
  }, [selectedCourse, chatType]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/courses/my/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setCourses(response.data.data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    }
  };

  const fetchCourseStudents = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/courses/${courseId}/students`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.success) {
        setStudents(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s._id));
    }
  };

  const handleCreateChat = async () => {
    if (!chatName.trim()) return;
    if (chatType === 'course' && !selectedCourse) return;
    if (selectedStudents.length === 0) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: chatName,
        description,
        type: chatType,
        courseId: chatType === 'course' ? selectedCourse : undefined,
        participantIds: selectedStudents,
      };

      const response = await axios.post(
        'http://localhost:5000/api/chat/rooms',
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        onChatCreated();
        handleClose();
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setChatName('');
    setDescription('');
    setSelectedCourse('');
    setSelectedStudents([]);
    setChatType('group');
    setSearchQuery('');
    onClose();
  };

  const filteredStudents = students.filter((student) =>
    `${student.firstName} ${student.lastName} ${student.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Chat Room</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Chat Type */}
          <FormControl fullWidth>
            <InputLabel>Chat Type</InputLabel>
            <Select
              value={chatType}
              label="Chat Type"
              onChange={(e) => setChatType(e.target.value as 'group' | 'course')}
            >
              <MenuItem value="group">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Group fontSize="small" />
                  Group Chat
                </Box>
              </MenuItem>
              <MenuItem value="course">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <School fontSize="small" />
                  Course Chat
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Chat Name */}
          <TextField
            fullWidth
            label="Chat Name"
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder="Enter chat room name"
          />

          {/* Description */}
          <TextField
            fullWidth
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter chat description"
            multiline
            rows={2}
          />

          {/* Course Selection (if course type) */}
          {chatType === 'course' && (
            <FormControl fullWidth>
              <InputLabel>Select Course</InputLabel>
              <Select
                value={selectedCourse}
                label="Select Course"
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.code} - {course.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Student Selection */}
          {(chatType === 'group' || selectedCourse) && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">
                  Select Participants ({selectedStudents.length} selected)
                </Typography>
                {students.length > 0 && (
                  <Button size="small" onClick={handleSelectAll}>
                    {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </Box>

              {/* Search Students */}
              <TextField
                fullWidth
                size="small"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Students List */}
              <Box
                sx={{
                  maxHeight: 300,
                  overflow: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {filteredStudents.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {students.length === 0
                        ? chatType === 'course' && selectedCourse
                          ? 'No students enrolled in this course'
                          : 'Select a course to see students'
                        : 'No students found'}
                    </Typography>
                  </Box>
                ) : (
                  <List dense>
                    {filteredStudents.map((student) => (
                      <ListItem
                        key={student._id}
                        disablePadding
                      >
                        <ListItemButton onClick={() => handleToggleStudent(student._id)}>
                          <Checkbox
                            edge="start"
                            checked={selectedStudents.includes(student._id)}
                            tabIndex={-1}
                            disableRipple
                          />
                          <ListItemAvatar>
                            <Avatar src={student.avatar}>
                              {student.firstName[0]}
                              {student.lastName[0]}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={`${student.firstName} ${student.lastName}`}
                            secondary={student.email}
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
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateChat}
          variant="contained"
          disabled={
            !chatName.trim() ||
            (chatType === 'course' && !selectedCourse) ||
            selectedStudents.length === 0 ||
            loading
          }
        >
          {loading ? <CircularProgress size={24} /> : 'Create Chat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateChatDialog;
