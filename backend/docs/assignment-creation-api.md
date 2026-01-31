# Assignment Creation API Documentation

## Create Assignment Endpoint

### **POST** `/api/assignments/create`

Creates a new assignment for a course. Only teachers can create assignments for courses they teach.

---

## 🔐 **Authentication Required**
- **JWT Token**: Required in Authorization header
- **Role**: Teacher only (`role: 'teacher'`)

---

## 📋 **Request Body**

```json
{
  "title": "React Hooks Assignment",
  "description": "Complete the React hooks exercises and submit your solution",
  "dueDate": "2025-08-15T23:59:59.000Z",
  "courseId": "64f123456789abcd12345678",
  "attachment": "https://example.com/assignment-files/react-hooks.pdf",
  "type": "project"
}
```

### **Required Fields:**
- `title` (string): Assignment title (1-200 characters)
- `dueDate` (string): Due date in ISO 8601 format
- `courseId` (string): Valid MongoDB ObjectId of the course
- `type` (string): Assignment type (`essay` | `project` | `quiz` | `code`)

### **Optional Fields:**
- `description` (string): Assignment description (max 2000 characters)
- `attachment` (string): URL to attachment file

---

## ✅ **Success Response**

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Assignment created successfully",
  "data": {
    "assignment": {
      "_id": "64f123456789abcd12345679",
      "title": "React Hooks Assignment",
      "description": "Complete the React hooks exercises and submit your solution",
      "instructions": "Complete the React hooks exercises and submit your solution",
      "dueDate": "2025-08-15T23:59:59.000Z",
      "course": {
        "_id": "64f123456789abcd12345678",
        "title": "Advanced React Development",
        "code": "REACT-301"
      },
      "instructor": {
        "_id": "64f123456789abcd12345677",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
      },
      "type": "project",
      "maxScore": 100,
      "isPublished": false,
      "allowLateSubmission": false,
      "maxAttempts": 1,
      "attachments": [
        {
          "filename": "react-hooks.pdf",
          "originalName": "react-hooks.pdf",
          "path": "https://example.com/assignment-files/react-hooks.pdf",
          "uploadedAt": "2025-08-04T18:30:00.000Z"
        }
      ],
      "submissions": [],
      "analytics": {
        "totalSubmissions": 0,
        "averageScore": 0,
        "passRate": 0
      },
      "createdAt": "2025-08-04T18:30:00.000Z",
      "updatedAt": "2025-08-04T18:30:00.000Z"
    }
  }
}
```

---

## ❌ **Error Responses**

### **400 Bad Request - Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Assignment title is required and cannot exceed 200 characters",
      "param": "title",
      "location": "body"
    }
  ]
}
```

### **401 Unauthorized**
```json
{
  "success": false,
  "message": "No token provided, authorization denied"
}
```

### **403 Forbidden - Not a Teacher**
```json
{
  "success": false,
  "message": "Access denied. Required role: teacher or admin. Your role: student"
}
```

### **403 Forbidden - Not Course Instructor**
```json
{
  "success": false,
  "message": "You can only create assignments for courses you teach"
}
```

### **404 Not Found - Course Not Found**
```json
{
  "success": false,
  "message": "Course not found"
}
```

### **500 Internal Server Error**
```json
{
  "success": false,
  "message": "Server error while creating assignment",
  "error": "Detailed error message (in development mode only)"
}
```

---

## 📝 **Example Usage**

### **Using cURL:**
```bash
curl -X POST http://localhost:5000/api/assignments/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "title": "JavaScript Fundamentals Quiz",
    "description": "Test your knowledge of JavaScript basics",
    "dueDate": "2025-08-20T23:59:59.000Z",
    "courseId": "64f123456789abcd12345678",
    "type": "quiz"
  }'
```

### **Using JavaScript (Axios):**
```javascript
const response = await axios.post('/api/assignments/create', {
  title: 'JavaScript Fundamentals Quiz',
  description: 'Test your knowledge of JavaScript basics',
  dueDate: '2025-08-20T23:59:59.000Z',
  courseId: '64f123456789abcd12345678',
  type: 'quiz'
}, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

console.log(response.data);
```

---

## 🔄 **Related Endpoints**

- `GET /api/assignments/course/:courseId` - Get all assignments for a course
- `GET /api/assignments/:id` - Get single assignment details
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment
- `POST /api/assignments/:id/submit` - Submit assignment (students)
- `POST /api/assignments/:id/grade/:studentId` - Grade assignment (teachers)

---

## 📋 **Database Schema Mapping**

Your requested fields map to the Assignment schema as follows:

| Your Field | Schema Field | Type | Description |
|------------|--------------|------|-------------|
| `title` | `title` | String | Assignment title |
| `description` | `description` & `instructions` | String | Assignment description |
| `dueDate` | `dueDate` | Date | Assignment due date |
| `courseId` | `course` | ObjectId | Reference to Course |
| `createdBy` | `instructor` | ObjectId | Reference to User (teacher) |
| `attachment` | `attachments` | Array | File attachments |
| `type` | `type` | String | Assignment type enum |
| `createdAt` | `createdAt` | Date | Creation timestamp |

---

## 🎯 **Features Implemented**

✅ **Authentication & Authorization**
- JWT token verification
- Teacher role validation
- Course instructor verification

✅ **Input Validation**
- Required field validation
- Data type validation
- String length limits
- Enum value validation

✅ **Database Operations**
- Assignment creation
- Course verification
- User authorization check
- Populated response with related data

✅ **Error Handling**
- Comprehensive error messages
- Proper HTTP status codes
- Development/Production error modes

✅ **Security**
- Teacher-only access
- Course ownership verification
- Input sanitization
- SQL injection prevention (Mongoose)

---

The endpoint is fully functional and ready for use! 🚀
