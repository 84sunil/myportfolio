# Quick Start - Deploy Your Changes

## Prerequisites
- Python 3.8+
- Node.js 14+
- Django 3.2+
- Backend should be running

## Step 1: Apply Database Migrations

```bash
cd backend/contactbackend

# Create migration files for new models
python manage.py makemigrations

# Apply migrations to database
python manage.py migrate

# Verify migrations applied
python manage.py showmigrations contactapi
```

**Output should show:**
```
contactapi
 [X] 0001_initial
 [X] 0002_course_payment_enrollments  (or similar)
```

## Step 2: Restart Backend Server

```bash
# Kill existing process
# Then restart:
python manage.py runserver
```

## Step 3: Build Frontend

```bash
cd my-portfolio

# Install dependencies (first time only)
npm install

# Build for production
npm run build

# OR run dev server for testing
npm run dev
```

## Step 4: Test the Features

### Test in browser:

1. **Logout Test**
   - Go to http://localhost:5173
   - Login with any credentials
   - Click "Logout" in navbar
   - Should redirect to home
   - Try accessing /dashboard - should stay on home

2. **Course Purchase Test**
   - Login
   - Go to Courses section
   - Click "Enroll Now"
   - Complete payment (simulated)
   - After success, try "Watch Videos"
   - Should work

3. **Logout Access Test**
   - Click Logout
   - Try to access same course - should fail
   - Login again - should regain access

4. **Mobile Payment Test**
   - Open DevTools (F12)
   - Toggle device toolbar (mobile view)
   - Try enrolling in a course
   - Should see Google Pay, PhonePe, Paytm
   - Net Banking should be hidden
   - Desktop should show all options

5. **Certificate Test**
   - Enroll in course
   - Watch videos (or click them)
   - Mark topics as complete
   - When 100% → "Get Certificate" appears
   - Click button → Certificate modal opens
   - Try printing

## Common Commands

```bash
# Run migrations
python manage.py migrate

# Create new admin user
python manage.py createsuperuser

# View admin dashboard
# Go to: http://localhost:8000/admin

# Shell to test queries
python manage.py shell

# Check all endpoints
python manage.py show_urls

# Restart django
python manage.py runserver

# Rebuild frontend
npm run build

# Dev server with hot reload
npm run dev
```

## File Changes Summary

### Backend Files Modified:
- `backend/contactbackend/contactapi/models.py` - Added Certificate & CourseProgress
- `backend/contactbackend/contactapi/views.py` - Added 5 new endpoints
- `backend/contactbackend/contactapi/serializers.py` - Added 2 new serializers
- `backend/contactbackend/contactapi/urls.py` - Added 5 new URL routes

### Frontend Files Modified:
- `my-portfolio/src/App.jsx` - Added ProtectedRoute
- `my-portfolio/src/context/AuthContext.jsx` - Enhanced logout
- `my-portfolio/src/components/courses.jsx` - Mobile detection + API calls

## Environment Variables

Make sure these are set in `.env`:

```
SECRET_KEY=your-secret-key
DEBUG=True (for development)
ALLOWED_HOSTS=localhost,127.0.0.1
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

## Database Backup (Optional)

Before migrations, backup your database:

```bash
# For SQLite (default)
cp db.sqlite3 db.sqlite3.backup

# For PostgreSQL
pg_dump your_db > backup.sql
```

## Verification

After deployment, verify with:

```bash
# Test API endpoints
curl http://localhost:8000/api/courses/

# Test with auth
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/certificates/

# Check Django version
python -m django --version

# Check migrations status
python manage.py showmigrations
```

## Troubleshooting

**Migrations not applying?**
```bash
# Reset migrations (dev only)
python manage.py migrate contactapi zero
python manage.py makemigrations
python manage.py migrate
```

**Port already in use?**
```bash
# Use different port
python manage.py runserver 8001
npm run dev -- --port 5174
```

**Frontend not updating?**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Database locked?**
```bash
# Remove database lock file
rm -f db.sqlite3-journal
```

---

**Ready to deploy? Follow Steps 1-4 above!**
