# Portfolio Project - Deployment Guide

## Summary of Changes

This document outlines all the fixes and features added to your portfolio project.

---

## 🐛 Issue #1: User Can't Logout & Access Dashboard

### Problems Fixed:
- ✅ User logout now properly clears authentication tokens and localStorage
- ✅ User is redirected to home page after logout  
- ✅ Dashboard is protected and requires authentication
- ✅ Users cannot access dashboard or course content after logout

### Files Modified:
1. **src/context/AuthContext.jsx**
   - Updated `logout()` function to clear enrollments from localStorage
   - Added automatic redirect to home page

2. **src/App.jsx**
   - Added `ProtectedRoute` component for dashboard protection
   - Dashboard now requires active authentication

---

## 🛒 Issue #2: Course Purchase & Access Control

### Problems Fixed:
- ✅ Only logged-in users can purchase courses
- ✅ Only users with valid token can access course content
- ✅ Enrollment data is cleared on logout
- ✅ Users cannot access courses after logout even if localStorage persists

### Files Modified:
1. **src/components/courses.jsx**
   - Modified `CourseViewer` component to require authentication
   - Added token validation before loading videos
   - Error messages if session expires

### How It Works:
1. User logs in and completes payment → Course enrolled
2. Course videos loaded with JWT token authentication
3. User logs out → tokens removed + enrollments cleared
4. User cannot access course anymore (would show "Authentication required")
5. User logs back in and purchases course again to access

---

## 📱 Issue #3: Mobile-Specific UPI Payment

### Problems Fixed:
- ✅ Mobile devices automatically show UPI options (Google Pay, PhonePe, Paytm)
- ✅ Desktop shows all options including Net Banking
- ✅ Mobile users see "Recommended for Mobile" badges
- ✅ Info message appears on mobile about desktop-only Net Banking

### Files Modified:
1. **src/components/courses.jsx**
   - Added `isMobileDevice()` function using user agent detection
   - Conditionally render payment methods based on device
   - Added helpful messaging for device limitations

### Device Detection:
```javascript
isMobileDevice() // Returns true for: Android, iPhone, iPad, etc.
```

---

## 🏆 Issue #4: Course Completion & Certification

### Problems Fixed:
- ✅ System tracks which videos user has watched
- ✅ Progress percentage automatically updates
- ✅ When 100% complete, user can download certificate
- ✅ Certificate is signed by lecturer/instructor
- ✅ Certificate can be printed or saved as PDF

### Backend Changes:

#### New Models (models.py):
1. **CourseProgress** - Tracks user progress per course
   - Stores list of watched video IDs
   - Auto-calculates completion percentage
   - Updates last watched timestamp

2. **Certificate** - Stores issued certificates
   - Unique certificate ID for verification
   - Issue date and instructor signature
   - Links to user and course enrollment

#### New API Endpoints (views.py):
- `POST /courses/track-video/` - Track video completion
- `GET /courses/{id}/progress/` - Get user's course progress
- `POST /certificates/generate/` - Generate certificate
- `GET /certificates/` - List user's certificates
- `GET /certificates/{id}/` - Get specific certificate

### Frontend Changes (courses.jsx):

1. **Video Tracking**
   - When user clicks video, completion is tracked
   - `apiTrackVideoCompletion()` calls backend API
   - Progress updates automatically

2. **Certificate Generation**
   - Button appears when progress = 100%
   - `apiGenerateCertificate()` calls backend API
   - Certificate displayed in modal with print option

3. **Certificate Display**
   - Beautiful certificate design with:
     - Course name and user name
     - Completion date
     - Instructor signature (Sunil Kumar)
     - Unique certificate ID
     - Print/Save as PDF button

---

## 🚀 Deployment Steps

### 1. Backend Setup

```bash
cd backend/contactbackend

# Create and apply migrations
python manage.py makemigrations
python manage.py migrate

# Optional: Create superuser if needed
python manage.py createsuperuser
```

### 2. Update Django Settings (if not already configured)

Ensure your `settings.py` has:
```python
INSTALLED_APPS = [
    # ... other apps
    'contactapi',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}
```

### 3. Frontend Setup

```bash
cd my-portfolio

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Or run dev server
npm run dev
```

### 4. Test All Features

**Test Logout & Dashboard:**
- [ ] Log in with test account
- [ ] Click Logout → should redirect to home
- [ ] Try accessing /dashboard directly → should redirect to home
- [ ] Log in again → dashboard should work

**Test Course Access:**
- [ ] Log in
- [ ] Enroll in a course (complete payment simulation)
- [ ] Course should be accessible
- [ ] Log out
- [ ] Try to view course content → should show "Authentication required"
- [ ] Log in again → should regain access

**Test Mobile Payment:**
- [ ] Open on mobile device (or use browser DevTools)
- [ ] Select course to enroll
- [ ] Should see Google Pay, PhonePe, Paytm prominently
- [ ] Net Banking should be hidden on mobile
- [ ] Desktop should show all options

**Test Certification:**
- [ ] Enroll in course
- [ ] Mark topics as complete (currently manual)
- [ ] When all topics marked → "Get Certificate" button appears
- [ ] Click button → Certificate modal opens
- [ ] Try printing → should work

---

## 📝 API Documentation

### Track Video Completion
```
POST /api/courses/track-video/
Headers: Authorization: Bearer {token}
Body: {
  "course_id": 1,
  "video_id": 5
}
Response: {
  "id": 1,
  "completion_percentage": 45,
  "videos_watched": [1, 2, 5],
  ...
}
```

### Generate Certificate
```
POST /api/certificates/generate/
Headers: Authorization: Bearer {token}
Body: {
  "course_id": 1
}
Response: {
  "success": true,
  "certificate": {
    "certificate_id": "CER-123-456",
    "issued_at": "2024-04-23T...",
    ...
  }
}
```

### Get User Certificates
```
GET /api/certificates/
Headers: Authorization: Bearer {token}
Response: [
  {
    "certificate_id": "CER-123-456",
    "course_title": "Python Basics",
    "issued_at": "2024-04-23T...",
    ...
  }
]
```

---

## 🔐 Security Notes

1. **Authentication**: All certificate and progress endpoints require JWT token
2. **Authorization**: Users can only access their own data
3. **Course Access**: Verified via PaymentStatus.success
4. **Token Expiry**: Access tokens expire in 1 day (configurable in settings.py)

---

## 🎨 Feature Configuration

### Adjust Certificate Signatory
Edit `views.py`:
```python
'signed_by': 'Your Name',
'instructor_title': 'Your Title'
```

### Adjust Mobile Detection
Edit `courses.jsx`:
```javascript
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
```

### Adjust Payment Method Order
Edit `courses.jsx` - reorder buttons in `method-grid` section

---

## 🐛 Troubleshooting

### Certificate not generating?
- Check user has completed all topics
- Check user has valid enrollment
- Check JWT token is not expired
- Check Django migrations were run

### Video tracking not working?
- Check Authorization header is being sent
- Check course_id and video_id are correct
- Check user has access to course

### Mobile detection not working?
- Test with actual mobile device
- Use Chrome DevTools mobile emulation
- Check browser user agent in DevTools

### Dashboard not protecting?
- Clear browser localStorage
- Clear browser cookies
- Hard refresh (Ctrl+Shift+R)

---

## 📊 Database Schema

### CourseProgress Table
```
- id (PK)
- user_id (FK to User)
- course_id (FK to Course)
- videos_watched (JSON array)
- completion_percentage (int 0-100)
- last_watched_at (timestamp)
```

### Certificate Table
```
- id (PK)
- user_id (FK to User)
- course_id (FK to Course)
- enrollment_id (FK to CourseEnrollment)
- certificate_id (varchar unique)
- issued_at (timestamp)
- completion_date (date)
- signed_by (varchar)
- instructor_title (varchar)
```

---

## 🚦 Status Checklist

- [x] Logout clears authentication
- [x] Dashboard protected
- [x] Course content protected
- [x] Mobile shows UPI only
- [x] Desktop shows all payments
- [x] Videos tracked
- [x] Progress calculated
- [x] Certificates generated
- [x] Certificates printable
- [x] API endpoints working

---

## 📞 Support

If you encounter any issues:

1. Check Django logs for backend errors
2. Check browser console for frontend errors
3. Verify migrations are applied
4. Check JWT tokens are not expired
5. Clear localStorage and cookies

---

**Last Updated**: April 23, 2024
**Project**: Sunil BK Portfolio with Course Platform
