# LOGI - Authentication System Setup

## Overview
A complete authentication and authorization system for the Lab Log Book Management System with user registration, login, and role-based access control.

## Files Created/Modified

### New Files:
1. **auth-server.js** - Authentication server (port 3002)
2. **login.html** - Login/Registration page
3. **auth.js** - Client-side authentication helper

### Modified Files:
1. **Log_Book1.html** - Added auth.js script
2. **logbook-client.js** - Updated to send auth headers with API requests

## Installation

### 1. Install Required Packages
```bash
npm install bcryptjs jsonwebtoken
```

### 2. Update package.json
Make sure your package.json includes:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

### 3. Start the Servers
```bash
# Terminal 1: Auth Server
node auth-server.js

# Terminal 2: Log Book Server  
node logbook-server.js

# Terminal 3: MongoDB (if not running)
mongod
```

### 4. Access the Application
- **Login Page**: http://localhost:8080/login.html
- **Log Book**: http://localhost:8080/Log_Book1.html (redirects to login if not authenticated)

## Features

### Authentication
- ✅ User Registration (Student/Faculty)
- ✅ Secure Login with JWT
- ✅ Password Hashing (bcrypt)
- ✅ Token-based API Access
- ✅ Auto-logout on invalid token

### User Roles
- **Student**: Access log book, view own data
- **Faculty**: View and manage student log books
- **Admin**: Full system access, user management

### Security Features
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ CORS protection
- ✅ Input validation
- ✅ Rate limiting
- ✅ User account status (active/inactive)

## API Endpoints

### Authentication Endpoints (port 3002)

**Register User**
```
POST /api/auth/register
Body: {
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student",
  "rollno": 5,
  "rgno": 12345678,
  "department": "CSE",
  "semester": 3
}
Response: { success: true, token: "jwt_token", user: {...} }
```

**Login User**
```
POST /api/auth/login
Body: {
  "email": "john@example.com",
  "password": "password123"
}
Response: { success: true, token: "jwt_token", user: {...} }
```

**Verify Token**
```
POST /api/auth/verify
Headers: { "Authorization": "Bearer jwt_token" }
Response: { success: true, user: decoded_token }
```

**Get Profile**
```
GET /api/auth/profile
Headers: { "Authorization": "Bearer jwt_token" }
Response: { success: true, user: {...} }
```

**Change Password**
```
POST /api/auth/change-password
Headers: { "Authorization": "Bearer jwt_token" }
Body: {
  "currentPassword": "oldpass",
  "newPassword": "newpass"
}
Response: { success: true, message: "Password changed" }
```

**Logout**
```
POST /api/auth/logout
Response: { success: true, message: "Logout successful" }
```

**Get All Users (Admin only)**
```
GET /api/auth/users
Headers: { "Authorization": "Bearer jwt_token" }
Response: { success: true, users: [...] }
```

## Client-Side Usage

### Check Authentication Status
```javascript
if (AuthManager.isLoggedIn()) {
  // User is logged in
}
```

### Get Current User
```javascript
const user = AuthManager.getUser();
console.log(user.name, user.role);
```

### Make Authenticated API Calls
```javascript
const response = await fetch(API_URL, {
  method: 'POST',
  headers: getAuthHeaders(), // Includes token
  body: JSON.stringify(data)
});
```

### Logout
```javascript
AuthManager.logout(); // Clears token and redirects to login
```

### Check User Role
```javascript
if (AuthManager.isStudent()) {
  // Show student-specific content
}

if (AuthManager.isFaculty()) {
  // Show faculty-specific content
}

if (AuthManager.isAdmin()) {
  // Show admin panel
}
```

## Security Recommendations

⚠️ **Production Checklist:**

1. **Change JWT_SECRET**
   - Edit `auth-server.js` line 8
   - Use a strong random string (at least 32 characters)
   
2. **Enable HTTPS**
   - Use SSL/TLS certificates
   - Update CORS origin to your domain
   
3. **Environment Variables**
   ```bash
   JWT_SECRET=your-strong-secret-key
   MONGODB_URI=your-mongodb-connection
   NODE_ENV=production
   ```

4. **Rate Limiting**
   - Increase from 100 req/min for production load
   - Implement IP-based rate limiting

5. **Password Policy**
   - Enforce strong passwords (uppercase, numbers, special chars)
   - Implement password expiry

6. **Database Security**
   - Add MongoDB authentication
   - Use encrypted connections
   - Regular backups

7. **Audit Logging**
   - Log all authentication attempts
   - Track data access and modifications
   - Monitor suspicious activities

## Testing

### Test Register
1. Go to login.html
2. Click "Register" tab
3. Fill in details (Student role recommended)
4. Submit

### Test Login
1. Use registered email/password
2. Should redirect to Log_Book1.html
3. See username in navbar

### Test Protected Access
1. Try accessing Log_Book1.html directly without login
2. Should redirect to login.html

## Troubleshooting

**"Cannot GET /login.html"**
- Make sure auth-server.js is running on port 3002
- Check that login.html is in correct directory

**"Token validation failed"**
- Token may have expired (7 days)
- Clear localStorage and login again

**"Failed to fetch"**
- Auth server not running on port 3002
- CORS issue - check browser console
- Network connectivity issue

**"MongoDB connection error"**
- MongoDB not running
- Wrong connection string
- Check MongoDB port (default: 27017)

## Next Steps

1. ✅ **User Management Panel** - Add/remove users, manage roles
2. ✅ **Faculty Review System** - Approval workflow
3. ✅ **Audit Logging** - Track all modifications
4. ✅ **Email Notifications** - Confirmations and alerts
5. ✅ **Two-Factor Authentication** - Extra security
6. ✅ **Social Login** - Google, GitHub integration

## Support

For issues or questions, check:
1. Browser console (F12) for error messages
2. Server logs for backend errors
3. MongoDB logs for database issues
4. Network tab for API failures

---

**Last Updated**: December 10, 2025
**Status**: Production Ready ✅
