# 📚 CampusConnect – A Social and Professional Network for Our College Community

> A unified platform to connect students, alumni, and faculty for collaboration, communication, and career growth.

---

## 🎯 Objective

The main goal of **CampusConnect** is to create a secure digital ecosystem where members of the college community can:
- Build a **college-exclusive social network**
- Enable **senior–junior mentorship and guidance**
- Facilitate **academic collaboration** through study rooms and discussions
- Share **updates, reels, posts, and achievements**

---

## 🧩 Problem Statement

Students currently use multiple scattered platforms for different needs:
- **WhatsApp** → Groups and updates  
- **Instagram** → Media sharing  
- **LinkedIn** → Professional networking  
- **Telegram/Discord** → Study discussions  

These platforms:
- Are **not college-specific**
- Are **difficult to manage collectively**
- **Lack privacy and academic relevance**

Hence, there’s a need for a **dedicated platform** where only verified college members can join using their **official email IDs**.

---

## 💡 Proposed Solution

CampusConnect unifies social and professional features into one secure ecosystem.

### 🔑 Key Features
- ✅ Login with **official college email (email verification)**
- 👤 **Profile creation** – bio, course, batch, interests, skills  
- 💬 **Chat system** – 1:1 and group chats using Socket.io  
- 🧠 **Study rooms** – topic-based academic discussions  
- 📰 **Feed section** – posts, updates, reels  
- 🎯 **Event board** – internships, hackathons, workshops  
- 🤝 **Alumni connect** – mentorship and networking  

---

## ⚙️ Technology Stack

| Component | Technology Used |
|------------|-----------------|
| **Frontend** | React.js (modern UI, fast rendering) |
| **Backend** | Node.js + Express.js |
| **Database** | MongoDB (flexible and scalable) |
| **Authentication** | JWT + College Email Verification |
| **Real-Time Chat** | Socket.io |
| **Cloud Storage** | AWS S3 / Firebase Storage |
| **Hosting** | Vercel / Render / AWS EC2 |
| **Version Control** | Git & GitHub |

---

## 🔒 Security & Privacy

- Only **verified college emails** can register  
- **Passwords hashed** securely using bcrypt  
- **JWT** for authentication  
- **Admin moderation** for posts and activities  

---

## 📁 Current Project Structure

### Frontend (`/client`)
```
client/
├── src/
│   ├── pages/
│   │   ├── Login.jsx          ✅ Active - User authentication
│   │   ├── Register.jsx        ✅ Active - User registration
│   │   ├── ComingSoon.jsx      ✅ Active - Placeholder after login
│   │   ├── Chat.jsx            📋 Created (not yet active)
│   │   ├── Feed.jsx            📋 Created (not yet active)
│   │   ├── Home.jsx            📋 Created (not yet active)
│   │   ├── Profile.jsx         📋 Created (not yet active)
│   │   └── StudyRooms.jsx      📋 Created (not yet active)
│   ├── components/
│   │   ├── Loader.jsx
│   │   ├── Navbar.jsx
│   │   ├── NotificationBell.jsx
│   │   └── Sidebar.jsx
│   └── App.jsx                 ✅ Routing and protected routes
├── public/
│   ├── background.jpg          ✅ Login/Register background
│   └── comingsoon.jpeg         ✅ Coming Soon page background
└── package.json
```

### Backend (`/server`)
```
server/
├── config/
│   ├── db.js                   ✅ MongoDB connection setup
│   └── socket.js               📋 Socket.io configuration (prepared)
├── controllers/
│   ├── authController.js       ✅ Login & Signup logic
│   ├── chatController.js       📋 Created (not yet active)
│   ├── postController.js       📋 Created (not yet active)
│   └── userController.js      📋 Created (not yet active)
├── middleware/
│   ├── authMiddleware.js      📋 JWT verification middleware
│   └── errorHandler.js         📋 Error handling middleware
├── models/
│   ├── User.js                 ✅ User schema with validation
│   ├── Message.js              📋 Created (not yet active)
│   ├── Notification.js         📋 Created (not yet active)
│   ├── Post.js                 📋 Created (not yet active)
│   └── Room.js                 📋 Created (not yet active)
├── routes/
│   ├── authRoutes.js           ✅ Authentication endpoints
│   ├── chatRoutes.js           📋 Created (not yet active)
│   ├── postRoutes.js           📋 Created (not yet active)
│   ├── roomRoutes.js           📋 Created (not yet active)
│   └── userRoutes.js           📋 Created (not yet active)
└── index.js                    ✅ Express server setup
```

**Legend:**
- ✅ **Active** - Currently implemented and functional
- 📋 **Created** - File exists but not yet fully integrated/active

---

## ✅ What's Been Implemented

### 1. **Authentication System** ✅
- **User Registration** (`/register`)
  - Email and password registration
  - Real-time form validation
  - Password confirmation matching
  - Email domain verification (adypu.edu.in)
  
- **User Login** (`/login`)
  - Secure login with email and password
  - "Remember Me" functionality (localStorage vs sessionStorage)
  - Password visibility toggle
  - Form validation with error handling

- **Protected Routes**
  - Route guards using React Router
  - Automatic redirect to login if unauthenticated
  - Token-based authentication check

- **Coming Soon Page** (`/coming-soon`)
  - Protected route requiring authentication
  - User info display
  - Logout functionality
  - Progress indicator

### 2. **Backend API** ✅
- Express.js server with CORS enabled
- MongoDB connection setup
- Authentication endpoints:
  - `POST /api/auth/signup` - User registration
  - `POST /api/auth/login` - User login
- Health check endpoint: `GET /api/health`

### 3. **Database Models** ✅
- **User Model** fully implemented with:
  - Email validation (adypu.edu.in domain)
  - Password hashing with bcrypt
  - User profile fields (name, bio, course, batch, profilePicture)
  - Email uniqueness constraint
  - Password comparison method

### 4. **Frontend Features** ✅
- React Router setup with protected routes
- Dark mode toggle support (infrastructure ready)
- Responsive design with Tailwind CSS
- Modern UI with glassmorphism effects
- Form validation on client-side
- Loading states and error handling

---

## 🔐 Authentication & Validation Implementation

### **Email Validation**

#### Frontend (`Login.jsx`, `Register.jsx`)
```javascript
const emailRegex = /^[a-zA-Z0-9._%+-]+@adypu\.edu\.in$/i;
if (!emailRegex.test(formData.email)) {
  setError('Email must be from adypu.edu.in domain');
  return false;
}
```

#### Backend (`authController.js`)
```javascript
const validateEmailDomain = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@adypu\.edu\.in$/i;
  return emailRegex.test(email);
};
```

#### Database Schema (`User.js` model)
```javascript
email: {
  type: String,
  required: [true, 'Email is required'],
  unique: true,
  lowercase: true,
  trim: true,
  match: [/^[a-zA-Z0-9._%+-]+@adypu\.edu\.in$/, 'Email must be from adypu.edu.in domain']
}
```

**Three-Layer Validation:**
1. **Client-side** - Immediate feedback for users
2. **Server-side** - Security check before processing
3. **Database** - Schema-level validation as final guard

### **Password Validation**

#### Frontend Validation (`Register.jsx`)
- Minimum 6 characters
- Password confirmation matching
- Real-time validation feedback

#### Backend Validation (`authController.js`)
```javascript
// Password length check
if (password.length < 6) {
  return res.status(400).json({
    success: false,
    message: 'Password must be at least 6 characters long'
  });
}
```

#### Database Schema (`User.js` model)
```javascript
password: {
  type: String,
  required: [true, 'Password is required'],
  minlength: [6, 'Password must be at least 6 characters']
}
```

### **Password Security**

#### Hashing Implementation (`User.js` model)
```javascript
// Pre-save hook - automatically hashes password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password during login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

**Security Features:**
- ✅ Passwords hashed with bcrypt (salt rounds: 10)
- ✅ Automatic hashing before saving to database
- ✅ Secure password comparison method
- ✅ Passwords never stored in plain text

### **JWT Authentication**

#### Token Generation (`authController.js`)
```javascript
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};
```

#### Token Storage (Frontend)
- **Remember Me**: Uses `localStorage` (persists across sessions)
- **Normal Login**: Uses `sessionStorage` (cleared on browser close)
- Token expiry tracking

#### Token Flow
1. User registers/logs in → Backend generates JWT
2. Token sent to frontend in response
3. Frontend stores token in localStorage/sessionStorage
4. Token included in Authorization header for protected routes
5. Token expires after 7 days

### **Route Protection**

#### Frontend (`App.jsx`)
```javascript
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}
```

#### Current Protected Routes
- ✅ `/coming-soon` - Requires authentication
- ✅ `/login`, `/register` - Redirect to `/coming-soon` if already authenticated

### **Input Validation Summary**

| Input | Frontend | Backend | Database |
|-------|----------|---------|----------|
| **Email** | ✅ Domain regex | ✅ Domain validation | ✅ Schema match |
| **Password** | ✅ Length & match | ✅ Length check | ✅ Minlength constraint |
| **Required Fields** | ✅ Required attributes | ✅ Null checks | ✅ Required schema |

### **Error Handling**

#### Frontend Error States
- Form validation errors
- API error messages
- Network connectivity errors
- Timeout handling

#### Backend Error Responses
```javascript
// Consistent error response format
{
  success: false,
  message: 'User-friendly error message'
}

// Success response format
{
  success: true,
  message: 'Operation successful',
  token: 'jwt_token_here',
  user: { ... }
}
```

---

## 🚀 Expected Outcome

- A **fully functional web app** accessible to all batches  
- **Stronger student–alumni connections**  
- A **central hub** for collaboration, learning, and opportunities  

---

## 🗓️ Project Timeline

| Phase | Duration | Tasks |
|--------|-----------|--------|
| **1. Planning & Research** | Week 1 ✅ | Define features, roles, and architecture |
| **2. UI/UX Design** | Week 2 🧩 | Create wireframes and interface designs |
| **3. Backend Development** | Weeks 3–4 ⏳ | Build APIs, database models, authentication |
| **4. Frontend Integration** | Weeks 5–6 | Connect frontend with backend |
| **5. Chat & Reels Module** | Weeks 7–8 | Implement Socket.io and media uploads |
| **6. Testing & Debugging** | Week 9 | Functional and performance testing |
| **7. Deployment & Demo** | Week 10 | Final deployment and presentation |

---

## 🧱 Modules / Features

| Module | Description |
|---------|-------------|
| **User Authentication** | Sign up and login via official college email |
| **Profile Management** | Add bio, batch, course, skills, photo |
| **Feed System** | Post images, videos, reels, and updates |
| **Chat & Groups** | Real-time messaging and group chats |
| **Study Rooms** | Join/create rooms for academic discussions |
| **Notifications** | Real-time updates for likes, messages, posts |
| **Search & Filter** | Find friends, alumni, or groups |
| **Admin Panel** | Manage users, monitor content, handle reports |

---

## ⚖️ Why Choose CampusConnect?

| Criteria | Existing Platforms | CampusConnect |
|-----------|--------------------|----------------|
| **College Verification** | ❌ No | ✅ College Email Login Only |
| **Academic Discussions** | ❌ Mixed Content | ✅ Focused Study Rooms |
| **Alumni Interaction** | ❌ Limited | ✅ Built-in Alumni Network |
| **Privacy** | ❌ Public/External | ✅ Private to College Members |
| **Professional + Social** | ❌ Separate Apps | ✅ All-in-One Platform |

---

## 🧠 Why These Tech Stacks?

| Layer | Technology | Reason |
|--------|-------------|--------|
| **Frontend** | React / Next.js | Fast, modern UI + SSR |
| **Backend** | Node.js + Express | Scalable, same language as frontend |
| **Database** | MongoDB | Flexible, schema-less, fast for social data |
| **Auth** | JWT | Secure, stateless authentication |
| **Real-Time** | Socket.io | Instant chat and notifications |
| **Storage** | AWS S3 / Firebase | Efficient media management |
| **Hosting** | Vercel / Render / AWS EC2 | Fast and scalable deployment |
| **Version Control** | Git & GitHub | Collaboration and version tracking |

---

## 🔮 Future Enhancements

- 📱 **Mobile App (React Native)**
- 🤖 **AI-based recommendations** – friends, groups, and study rooms  
- 📄 **Resume builder and placement integration**
- 🗓️ **Integration with college events and notices**

---

## 👩‍💻 Contributors
**Team CampusConnect**  
Students of **Newton School of Technology – Ajeenkya DY Patil University**

---

## 🏁 License
This project is for **educational and demonstration purposes**. All rights reserved by the developers.

---