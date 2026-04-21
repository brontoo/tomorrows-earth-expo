# Tomorrow's Earth Expo 2026 - Login System Guide

## Overview

The Tomorrow's Earth Expo platform uses **Manus OAuth authentication** for secure user access. This guide explains how the login system works, provides test credentials, and troubleshoots common issues.

---

## Authentication Architecture

### How the Login Flow Works

The platform implements a **three-step OAuth authentication process**:

1. **User Initiates Login**: User clicks "Login as Student", "Login as Teacher", or "Login as Admin" on the Login page
2. **OAuth Authorization**: User is redirected to the Manus OAuth portal to authenticate
3. **Session Creation**: After successful authentication, a session cookie is created and the user is redirected to their dashboard

### Key Components

| Component | Purpose |
|-----------|---------|
| **Login Page** (`client/src/pages/Login.tsx`) | Displays login options for Student, Teacher, and Admin roles |
| **OAuth Handler** (`server/_core/oauth.ts`) | Handles OAuth callback and session creation |
| **Auth Router** (`server/routers.ts`) | Provides `auth.me` query to check current user and `auth.logout` mutation |
| **useAuth Hook** (`client/src/_core/hooks/useAuth.ts`) | React hook for accessing authentication state in components |
| **SDK** (`server/_core/sdk.ts`) | Manages OAuth token exchange and session verification |

---

## Test Credentials

The following test accounts are available in the database:

### Admin Accounts

| Email | Role | Name | Status |
|-------|------|------|--------|
| afra.almarbouei@moe.sch.ae | Admin | Afra Al Marbouei | Active |
| fatmia.alameri@moe.sch.ae | Admin | Fatmia Al Ameri | Active |
| badreyya-ma.alshehhi@moe.sch.ae | Admin | Badreyy Al Shehhi | Active |
| riham.hassan@moe.sch.ae | Admin | riham.hassan | Active |
| ahmed.eid.legal@gmail.com | Admin | AHMED Eid | Active |

### Student Accounts

| Email | Role | Name | Status |
|-------|------|------|--------|
| elavukatoo@gmail.com | Student | Ahmed Eid | Active |

---

## How to Test the Login System

### Step 1: Access the Application

Open the application in your browser:
- **Development**: https://3000-izr3r067mronco5jbf0v1-d5700de5.us1.manus.computer
- **Production**: https://tomorexpo-4h46x9ai.manus.space

### Step 2: Navigate to Login

1. Click the **"Login"** button in the top-right corner of the navigation bar, OR
2. Click **"Student Login"**, **"Teacher Login"**, or **"Admin Login"** buttons on the home page

### Step 3: Select Your Role

On the Login page, you'll see three options:

- **Student Login** (Blue card with Book icon)
- **Teacher Login** (Green card with Users icon)
- **Admin Login** (Purple card with Shield icon)

Click the button for your desired role.

### Step 4: Authenticate with Manus OAuth

You'll be redirected to the Manus OAuth portal. Sign in using:

- Your Manus account credentials, OR
- One of the test email addresses listed above (if you have access to those accounts)

### Step 5: Dashboard Access

After successful authentication, you'll be redirected to your role-specific dashboard:

- **Students** → `/student/dashboard` (My Projects)
- **Teachers** → `/teacher/dashboard` (Teacher Dashboard)
- **Admins** → `/admin/dashboard` (Admin Dashboard)

---

## Role-Based Access Control (RBAC)

The platform implements four user roles with specific permissions:

### Admin Role
- **Access**: `/admin/dashboard`
- **Permissions**:
  - Manage all users (activate, deactivate, delete)
  - View platform statistics and analytics
  - Configure event settings (date, location, submission deadline)
  - Control voting periods (open/close)
  - View activity logs
  - Manage categories and subcategories

### Teacher Role
- **Access**: `/teacher/dashboard`
- **Permissions**:
  - View assigned student projects
  - Approve or reject project submissions
  - Provide feedback on student work
  - View class statistics
  - Access teaching resources

### Student Role
- **Access**: `/student/dashboard`
- **Permissions**:
  - Create and submit innovation projects
  - View project status and feedback
  - Collaborate with team members
  - Vote on projects (when voting is open)
  - Access learning resources

### Public Role
- **Access**: Public pages only (no dashboard)
- **Permissions**:
  - View approved projects in Innovation Hub
  - Vote on projects (when voting is open)
  - View Journey Cinema videos
  - Access public resources

---

## Troubleshooting Login Issues

### Issue 1: "Unable to generate login URL" Error

**Cause**: Missing or invalid OAuth configuration

**Solution**:
1. Verify environment variables are set:
   ```bash
   echo $VITE_APP_ID
   echo $OAUTH_SERVER_URL
   echo $JWT_SECRET
   ```
2. Check that `OAUTH_SERVER_URL` is set to `https://api.manus.im`
3. Restart the dev server: `pnpm run dev`

### Issue 2: "Invalid session cookie" Error

**Cause**: Session cookie is missing or expired

**Solution**:
1. Clear browser cookies for the domain
2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Try logging in again

### Issue 3: Redirect Loop (Stuck on Login Page)

**Cause**: User is not found in the database or role is not set correctly

**Solution**:
1. Check if user exists in database:
   ```bash
   mysql -h gateway03.us-east-1.prod.aws.tidbcloud.com \
     -u 2DzGFoJmzwpykVL.root \
     -p"gpL89FCC8Zc8Ac0ZP1iy" \
     -D "4H46x9AiKyJYDgF5KtC5JK" \
     -e "SELECT id, email, role FROM users WHERE email='your-email@example.com';"
   ```
2. If user doesn't exist, create one:
   ```bash
   mysql -h gateway03.us-east-1.prod.aws.tidbcloud.com \
     -u 2DzGFoJmzwpykVL.root \
     -p"gpL89FCC8Zc8Ac0ZP1iy" \
     -D "4H46x9AiKyJYDgF5KtC5JK" \
     -e "INSERT INTO users (email, role, openId, name, lastSignedIn) \
         VALUES ('your-email@example.com', 'student', 'test-openid', 'Your Name', NOW());"
   ```

### Issue 4: "Missing session cookie" in Logs

**Cause**: User is not authenticated (expected for unauthenticated requests)

**Solution**: This is normal behavior. The message appears when:
- Accessing public pages without logging in
- First-time visitors
- After clearing cookies

No action needed unless you're trying to access a protected page.

### Issue 5: User Logged In But Can't Access Dashboard

**Cause**: User role doesn't match the dashboard they're trying to access

**Solution**:
1. Check user's role in database:
   ```bash
   mysql -h gateway03.us-east-1.prod.aws.tidbcloud.com \
     -u 2DzGFoJmzwpykVL.root \
     -p"gpL89FCC8Zc8Ac0ZP1iy" \
     -D "4H46x9AiKyJYDgF5KtC5JK" \
     -e "SELECT id, email, role FROM users WHERE email='your-email@example.com';"
   ```
2. Update user role if needed:
   ```bash
   mysql -h gateway03.us-east-1.prod.aws.tidbcloud.com \
     -u 2DzGFoJmzwpykVL.root \
     -p"gpL89FCC8Zc8Ac0ZP1iy" \
     -D "4H46x9AiKyJYDgF5KtC5JK" \
     -e "UPDATE users SET role='admin' WHERE email='your-email@example.com';"
   ```

---

## Database Schema

### Users Table

The `users` table stores all user information:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) UNIQUE,
  name TEXT,
  email VARCHAR(320) NOT NULL UNIQUE,
  passwordHash VARCHAR(255),
  loginMethod VARCHAR(64),
  role ENUM('admin', 'teacher', 'student', 'public') DEFAULT 'public',
  grade VARCHAR(20),
  schoolClass VARCHAR(100),
  approved BOOLEAN DEFAULT FALSE,
  passwordResetToken VARCHAR(255),
  passwordResetExpires TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Key Fields

| Field | Purpose |
|-------|---------|
| `openId` | Unique identifier from Manus OAuth |
| `email` | User's email address (unique) |
| `role` | User's role (admin, teacher, student, public) |
| `approved` | Whether teacher has been approved by admin |
| `lastSignedIn` | Timestamp of last login |

---

## Environment Variables

The following environment variables are required for the login system to work:

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_APP_ID` | `4H46x9AiKyJYDgF5KtC5JK` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | `https://api.manus.im` | Manus OAuth server URL |
| `JWT_SECRET` | `3WPfmpPBst9pDNv456AsFG` | Secret key for session token signing |
| `DATABASE_URL` | MySQL connection string | Database connection |

---

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Login as Student/Teacher/Admin"             │
│    → Stored in localStorage: selectedRole                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Redirect to Manus OAuth Portal                           │
│    URL: https://api.manus.im/app-auth?appId=...&state=...  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. User Authenticates with Manus                            │
│    → OAuth code generated                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Redirect to /api/oauth/callback?code=...&state=...      │
│    → Exchange code for access token                         │
│    → Get user info from OAuth server                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Create/Update User in Database                           │
│    → Upsert user with openId, email, name                  │
│    → Set role based on selectedRole from localStorage       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Create Session Token (JWT)                               │
│    → Sign with JWT_SECRET                                   │
│    → Set as HTTP-only cookie (COOKIE_NAME)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Redirect to Home Page (/)                                │
│    → Frontend calls trpc.auth.me.useQuery()                │
│    → Verify session cookie and get user info               │
│    → Redirect to role-specific dashboard                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing the Login System

### Manual Testing Checklist

- [ ] **Student Login**: Click "Login as Student" → Authenticate → Verify redirect to `/student/dashboard`
- [ ] **Teacher Login**: Click "Login as Teacher" → Authenticate → Verify redirect to `/teacher/dashboard`
- [ ] **Admin Login**: Click "Login as Admin" → Authenticate → Verify redirect to `/admin/dashboard`
- [ ] **Logout**: Click profile avatar → Click "Logout" → Verify redirect to home page
- [ ] **Session Persistence**: Refresh page → Verify user still logged in
- [ ] **Cookie Clearing**: Clear cookies → Verify redirect to login page
- [ ] **Role-Based Access**: Try accessing `/admin/dashboard` as student → Verify access denied

### Automated Testing

Run the authentication tests:

```bash
pnpm test -- server/auth.logout.test.ts
```

---

## Common Questions

### Q: Why do I need to use Manus OAuth?

**A**: Manus OAuth provides secure, centralized authentication for all users. This ensures:
- Secure credential storage (no passwords stored in the app)
- Single sign-on across Manus platform
- Audit trails for compliance
- Protection against common security vulnerabilities

### Q: Can I use email/password authentication?

**A**: The current implementation uses OAuth only. To add email/password authentication, you would need to:
1. Add password hashing (bcrypt)
2. Create a login endpoint that validates email/password
3. Create a registration endpoint
4. Add password reset functionality

### Q: How long does a session last?

**A**: Sessions last for **one year** (365 days) from the login date. After expiration, users must log in again.

### Q: Can I change a user's role?

**A**: Yes, admins can change user roles through the Admin Dashboard or via the database:

```bash
UPDATE users SET role='teacher' WHERE email='user@example.com';
```

### Q: What happens if a user's OAuth account is deleted?

**A**: The user will not be able to log in. However, their data remains in the database. To re-enable access, an admin would need to:
1. Recreate the OAuth account
2. Ensure the email matches the database record

---

## Support & Troubleshooting

If you encounter issues with the login system:

1. **Check the logs**:
   ```bash
   tail -100 .manus-logs/devserver.log
   tail -100 .manus-logs/browserConsole.log
   ```

2. **Verify environment variables**:
   ```bash
   env | grep -E "VITE_APP_ID|OAUTH_SERVER_URL|JWT_SECRET|DATABASE_URL"
   ```

3. **Check database connectivity**:
   ```bash
   mysql -h gateway03.us-east-1.prod.aws.tidbcloud.com \
     -u 2DzGFoJmzwpykVL.root \
     -p"gpL89FCC8Zc8Ac0ZP1iy" \
     -D "4H46x9AiKyJYDgF5KtC5JK" \
     -e "SELECT COUNT(*) as user_count FROM users;"
   ```

4. **Review the authentication code**:
   - `server/_core/oauth.ts` - OAuth callback handler
   - `server/_core/sdk.ts` - OAuth token exchange
   - `client/src/_core/hooks/useAuth.ts` - Frontend authentication state

---

## Next Steps

To enhance the login system, consider:

1. **Add Email/Password Authentication**: Implement traditional email/password login as an alternative to OAuth
2. **Implement Two-Factor Authentication (2FA)**: Add extra security layer for admin accounts
3. **Add Social Login Options**: Support Google, Apple, Microsoft login
4. **Create User Onboarding Flow**: Guide new users through profile setup after first login
5. **Add Remember Me Feature**: Allow users to stay logged in for extended periods
6. **Implement Session Management**: Allow users to view and manage active sessions

---

**Last Updated**: March 31, 2026
**Platform Version**: 3c17cd76
**Status**: ✅ Production Ready
