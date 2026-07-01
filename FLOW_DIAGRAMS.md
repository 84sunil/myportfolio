# Feature Flow Diagrams

## 1. User Authentication & Dashboard Access Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Authentication Flow                  │
└─────────────────────────────────────────────────────────────┘

    User Visits Website
            ↓
    ┌──────────────────┐
    │  Is User Logged  │
    │      In?         │
    └────┬─────────┬───┘
         │         │
        YES       NO
         │         │
         ↓         ↓
    ┌────────┐  ┌──────────────────┐
    │ Show   │  │ Show Login/Signup│
    │ Content│  │ Modal            │
    └────────┘  └────────┬─────────┘
         ↓                │
    Dashboard            User Logs In
    Accessible           │
                         ↓
                    ┌──────────────┐
                    │ JWT Token    │
                    │ Stored       │
                    └────┬─────────┘
                         │
                         ↓
                    ┌──────────────┐
                    │ User Access  │
                    │ Granted      │
                    └──────────────┘

    User Clicks Logout
            ↓
    ┌──────────────────────────────┐
    │ Clear Tokens from LocalStorage│
    │ Clear Enrollments from Store  │
    │ Reset User State to null      │
    └──────────┬───────────────────┘
               │
               ↓
    ┌──────────────────┐
    │ Redirect to Home │
    │ (window.location)│
    └──────────────────┘
               │
               ↓
    ┌──────────────────┐
    │ Try accessing    │
    │ /dashboard       │
    │ → Redirected     │
    └──────────────────┘
```

---

## 2. Course Purchase & Access Control Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Course Access Control Flow                │
└─────────────────────────────────────────────────────────────┘

    User Clicks "Enroll Now"
            ↓
    ┌──────────────────┐
    │ Is User Logged?  │
    └────┬──────────┬──┘
         │          │
        YES        NO
         │          │
         ↓          ↓
    ┌────────────┐  ┌────────────────┐
    │ Show       │  │ Show Login      │
    │ Payment    │  │ Prompt Modal    │
    │ Modal      │  │                │
    └────────────┘  └────────────────┘
         │
         ↓
    ┌──────────────────────────────┐
    │ Select Payment Method        │
    │ (UPI on mobile, all on desk) │
    └────────┬─────────────────────┘
             │
             ↓
    ┌──────────────────────┐
    │ Complete Payment     │
    │ (Simulated)          │
    └────────┬─────────────┘
             │
             ↓
    ┌──────────────────────┐
    │ Create Payment Record│
    │ Status = 'success'   │
    │ Create CourseEnroll  │
    └────────┬─────────────┘
             │
             ↓
    ┌──────────────────────┐
    │ Store in Database    │
    │ + Send Confirmation  │
    │ Email                │
    └────────┬─────────────┘
             │
             ↓
    ┌──────────────────────┐
    │ Course Access        │
    │ GRANTED              │
    │ Show "Access Course" │
    └──────────────────────┘

    User Logs Out
            ↓
    ┌──────────────────────────────┐
    │ localStorage cleared         │
    │ tokens removed               │
    │ user state reset             │
    └────────┬─────────────────────┘
             │
             ↓
    ┌──────────────────────┐
    │ Try to View Course   │
    │ Content              │
    └────────┬─────────────┘
             │
             ↓
    ┌──────────────────────┐
    │ CourseViewer checks  │
    │ for JWT token        │
    └────────┬─────────────┘
             │
             ↓
    ┌──────────────────────┐
    │ Token not found!     │
    │ Error: "Auth        │
    │ required"            │
    └────────┬─────────────┘
             │
             ↓
    ┌──────────────────────┐
    │ User cannot view     │
    │ course (must re-login│
    │ and purchase again)  │
    └──────────────────────┘
```

---

## 3. Mobile vs Desktop Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│            Device-Specific Payment Method Selection         │
└─────────────────────────────────────────────────────────────┘

User Selects Enroll
        ↓
┌──────────────────────┐
│ Detect Device Type   │
│ (User Agent Check)   │
└────┬────────────┬────┘
     │            │
  MOBILE       DESKTOP
     │            │
     ↓            ↓
┌──────────────┐  ┌─────────────────────┐
│ MOBILE FLOW  │  │  DESKTOP FLOW       │
│              │  │                     │
│ Show:        │  │  Show:              │
│ • Google Pay │  │  • Google Pay       │
│ • PhonePe    │  │  • PhonePe          │
│ • Paytm      │  │  • Paytm            │
│              │  │  • Net Banking      │
│ Hide:        │  │                     │
│ • Net Banking│  │  All Available      │
│              │  │                     │
│ Badges:      │  │  No Special Badges  │
│ "Recommended │  │                     │
│  for Mobile" │  │                     │
│              │  │                     │
│ Message:     │  │  No Message         │
│ "For desktop │  │                     │
│  net banking │  │                     │
│  use a PC"   │  │                     │
└──────────────┘  └─────────────────────┘
     │                   │
     └───────┬───────────┘
             ↓
    ┌────────────────────┐
    │ User Selects       │
    │ Method & Pays      │
    └────────────────────┘
```

---

## 4. Video Tracking & Certificate Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│          Video Tracking & Certificate Generation            │
└─────────────────────────────────────────────────────────────┘

User Views Course
        ↓
┌──────────────────────────┐
│ Load CourseViewer        │
│ - Load videos list       │
│ - Show progress bar (0%) │
│ - Topics shown           │
└──────────┬───────────────┘
           │
           ↓
User Clicks Video
           │
           ↓
┌──────────────────────────┐
│ handleVideoWatched()     │
│ 1. Set as active video   │
│ 2. Call Track API        │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ POST /courses/track-video│
│ Headers: JWT Token       │
│ Body: {course_id, vid_id}│
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ Backend:                 │
│ 1. Verify auth           │
│ 2. Check course access   │
│ 3. Create/update         │
│    CourseProgress        │
│ 4. Add vid to watched[]  │
│ 5. Calculate %           │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ Response:                │
│ {completion_percentage:X}│
└──────────┬───────────────┘
           │
           ↓
Progress bar updates visually
           │
           ↓
    Repeat for each video...
           │
           ↓
┌──────────────────────────┐
│ When completion = 100%   │
│ Button appears:          │
│ "Get Your Certificate"   │
└──────────┬───────────────┘
           │
User Clicks "Get Certificate"
           │
           ↓
┌──────────────────────────┐
│ handleGetCertificate()   │
│ Call API:                │
│ POST /certificates/      │
│ generate/                │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ Backend:                 │
│ 1. Check 100% complete   │
│ 2. Check enrollment      │
│ 3. Create Certificate    │
│ 4. Generate cert_id      │
│ 5. Save to DB            │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ Response:                │
│ {success: true,          │
│  certificate: {...}}     │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ Show Certificate Modal   │
│ - Course name            │
│ - User name              │
│ - Certificate ID         │
│ - Issue date             │
│ - Instructor signature    │
│ - Print button           │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ User Clicks "Print/Save  │
│ as PDF"                  │
│                          │
│ window.print()           │
│ or Save as PDF           │
└──────────────────────────┘
```

---

## 5. Data Model Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Relationships                   │
└─────────────────────────────────────────────────────────────┘

        ┌──────────────┐
        │     User     │
        │  (Django)    │
        └───────┬──────┘
                │
        ┌───────┴─────────────┬─────────────────┐
        │                     │                 │
        ↓                     ↓                 ↓
   ┌─────────────┐     ┌──────────────┐  ┌──────────────┐
   │CourseEnroll │     │CourseProgress│  │ Certificate  │
   │             │     │              │  │              │
   │• user_id   │     │• user_id     │  │• user_id     │
   │• course_id │────→│• course_id   │  │• course_id   │
   │• payment   │     │• videos[]    │  │• cert_id     │
   │  (OneToOne)│     │• completion% │  │• issued_at   │
   └─────────────┘     └──────────────┘  │• signed_by   │
        │                                  └──────────────┘
        │
        ↓
   ┌─────────────┐
   │  Payment    │
   │             │
   │• status     │
   │• order_id   │
   │• amount     │
   └─────────────┘

   ┌─────────────┐
   │   Course    │
   │             │
   │• title      │
   │• price      │
   │• topics     │
   └────┬────────┘
        │
        ↓
   ┌──────────────┐
   │ CourseVideo  │
   │              │
   │• title       │
   │• video_file  │
   │• order       │
   └──────────────┘
```

---

## 6. API Endpoint Summary

```
┌─────────────────────────────────────────────────────────────┐
│                   API Endpoints Overview                    │
└─────────────────────────────────────────────────────────────┘

AUTHENTICATION (Existing)
├── POST   /auth/login/        - Login user
├── POST   /auth/register/      - Register user
├── GET    /auth/me/            - Get current user
└── POST   /auth/refresh/       - Refresh token

COURSES (Existing)
├── GET    /courses/            - List all courses
├── GET    /courses/my/         - User's enrolled courses
├── POST   /courses/create-order/      - Create payment order
├── POST   /courses/verify-payment/    - Verify payment
├── GET    /courses/{id}/videos/       - Get course videos
└── GET    /courses/{id}/content/      - Get course content

PROGRESS TRACKING (NEW)
├── POST   /courses/track-video/       - Track video completion
└── GET    /courses/{id}/progress/     - Get user progress

CERTIFICATES (NEW)
├── POST   /certificates/generate/     - Generate certificate
├── GET    /certificates/              - List user certificates
└── GET    /certificates/{id}/         - Get specific certificate
```

---

## 7. State Management Flow

```
Frontend State
└── AuthContext.jsx
    ├── user (null or object)
    ├── loading (boolean)
    ├── login() function
    ├── logout() function → clears enrollments
    └── fetchUser() function

localStorage
├── accessToken
├── refreshToken
└── sbk_enrolled_courses (cleared on logout)

Backend State
└── Database
    ├── User
    ├── CourseEnrollment
    ├── Payment
    ├── CourseProgress
    ├── Certificate
    └── CourseVideo
```

---

## 8. Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  JWT Authentication Flow                    │
└─────────────────────────────────────────────────────────────┘

1. User Login
   ├─ POST /auth/login/
   │  └─ username + password
   │     ↓
   │     ├─ Returns: {access, refresh}
   │     ├─ localStorage: accessToken, refreshToken
   │     └─ fetchUser(token)

2. Authenticated Request
   ├─ GET /api/endpoint/
   │  ├─ Headers: Authorization: Bearer {token}
   │  ├─ Backend validates token
   │  └─ Returns data if valid

3. Token Expiry
   ├─ Access token expires (24 hours)
   ├─ POST /auth/refresh/
   │  └─ Uses refreshToken
   │     ├─ Returns new accessToken
   │     └─ Updates localStorage

4. Logout
   ├─ logout() function
   │  ├─ Remove tokens from localStorage
   │  ├─ Clear enrollments
   │  ├─ Set user to null
   │  └─ Redirect to home

5. Protected Route
   ├─ Check if user exists
   │  ├─ YES: Render component
   │  └─ NO: Redirect to home
```

---

## Quick Reference Checklist

### Before Deployment
- [ ] Run migrations: `python manage.py migrate`
- [ ] Create admin user: `python manage.py createsuperuser`
- [ ] Test Django server: `python manage.py runserver`
- [ ] Install frontend deps: `npm install`
- [ ] Build frontend: `npm run build`

### After Deployment
- [ ] Test logout redirects to home
- [ ] Test dashboard protection
- [ ] Test course purchase
- [ ] Test course access after logout
- [ ] Test mobile payment flow
- [ ] Test desktop payment flow
- [ ] Test video tracking
- [ ] Test certificate generation
- [ ] Test certificate printing

---

**Diagrams show complete flow of all new features and fixes.**
