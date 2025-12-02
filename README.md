#  CampusConnect – A Social and Professional Network for Our College Community

> A unified platform to connect students, alumni, and faculty for collaboration, communication, and career growth.

---

##  Objective

The main goal of **CampusConnect** is to create a secure digital ecosystem where members of the college community can:
- Build a **college-exclusive social network**
- Enable **senior–junior mentorship and guidance**
- Facilitate **academic collaboration** through study rooms and discussions
- Share **updates, reels, posts, and achievements**

---

##  Problem Statement

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

###  Key Features
- Login with **official college email (email verification)**
- **Profile creation** – bio, course, batch, interests, skills  
- **Chat system** – 1:1 and group chats using Socket.io  
- **Study rooms** – topic-based academic discussions  
- **Feed section** – posts, updates, reels  
- **Event board** – internships, hackathons, workshops  
- **Alumni connect** – mentorship and networking  

---

## Technology Stack

| Component | Technology Used |
|------------|-----------------|
| **Frontend** | React.js (modern UI, fast rendering) |
| **Backend** | Node.js + Express.js |
| **Database** | MongoDB (flexible and scalable) |
| **Authentication** | JWT + College Email Verification |
| **Real-Time Chat** | Socket.io |
| **Cloud Storage** | Cloudinary (for images, videos, and media) |
| **Video Calls** | VideoSDK.live (for 1-on-1 and group video/voice calls) |
| **Hosting** | Vercel / Render / AWS EC2 |
| **Version Control** | Git & GitHub |

---

## Security & Privacy

- Only **verified college emails** can register  
- **Passwords hashed** securely using bcrypt  
- **JWT** for authentication  
- **Admin moderation** for posts and activities  

---

## Current Project Structure

### Frontend (`/client`)
```
client/
├── src/
│   ├── pages/
│   │   ├── Login.jsx              ✅ User authentication
│   │   ├── Register.jsx           ✅ User registration
│   │   ├── BioSetup.jsx            ✅ Profile bio setup
│   │   ├── Feed.jsx                ✅ Social media feed
│   │   ├── Profile.jsx             ✅ User profiles
│   │   ├── Chat.jsx                ✅ Real-time chat (1-on-1 & groups)
│   │   ├── Reels.jsx               ✅ Video reels viewer
│   │   ├── StudyRooms.jsx          ✅ Study groups with channels
│   │   ├── Requests.jsx            ✅ Friend requests management
│   │   ├── SavedPosts.jsx          ✅ Saved posts collection
│   │   ├── FindStudyPartner.jsx    ✅ Study partner finder
│   │   ├── JoinGroup.jsx           ✅ Group join via invite link
│   │   └── Admin.jsx               ✅ Admin dashboard
│   ├── components/
│   │   ├── DashboardNavbar.jsx     ✅ Main navigation
│   │   ├── DashboardSidebar.jsx    ✅ Sidebar navigation
│   │   ├── PostCard.jsx            ✅ Post display component
│   │   ├── CreatePostModal.jsx     ✅ Post creation
│   │   ├── MessageBubble.jsx       ✅ Chat message display
│   │   ├── MessageInput.jsx        ✅ Chat input with emoji
│   │   ├── VideoCallModal.jsx      ✅ Video/voice call interface
│   │   ├── StorySection.jsx        ✅ Stories display
│   │   ├── StoryViewer.jsx         ✅ Story viewer
│   │   ├── ReelsViewer.jsx         ✅ Reels viewer
│   │   ├── NotificationBell.jsx    ✅ Notification system
│   │   ├── StudyGroupsSidebar.jsx  ✅ Study groups sidebar
│   │   ├── CollaborationBoard.jsx  ✅ Collaboration board
│   │   └── [20+ more components]   ✅ Various UI components
│   ├── contexts/
│   │   └── SocketContext.jsx       ✅ Socket.io context provider
│   └── App.jsx                     ✅ Routing and protected routes
├── public/
│   ├── sounds/                    ✅ Call sounds (ringing, calling)
│   └── [media assets]
└── package.json
```

### Backend (`/server`)
```
server/
├── config/
│   ├── db.js                      ✅ MongoDB connection
│   ├── socket.js                  ✅ Socket.io configuration
│   └── cloudinary.js              ✅ Cloudinary media storage
├── controllers/
│   ├── authController.js          ✅ Authentication logic
│   ├── userController.js          ✅ User management
│   ├── postController.js          ✅ Posts CRUD & interactions
│   ├── chatController.js          ✅ Chat & messaging
│   ├── reelController.js          ✅ Reels management
│   ├── storyController.js         ✅ Stories management
│   ├── studyGroupController.js    ✅ Study groups & channels
│   ├── callController.js          ✅ Video/voice calls (VideoSDK)
│   ├── notificationController.js  ✅ Notifications system
│   ├── adminController.js         ✅ Admin operations
│   ├── collaborationController.js ✅ Collaboration board
│   ├── eventController.js         ✅ Events management
│   └── reportController.js        ✅ Content reporting
├── middleware/
│   ├── authMiddleware.js          ✅ JWT verification
│   └── errorHandler.js            ✅ Error handling
├── models/
│   ├── User.js                    ✅ User schema
│   ├── Post.js                    ✅ Post schema
│   ├── Message.js                 ✅ Message schema
│   ├── Room.js                    ✅ Chat room schema
│   ├── Reel.js                    ✅ Reel schema
│   ├── Story.js                   ✅ Story schema
│   ├── StudyGroup.js              ✅ Study group schema
│   ├── Notification.js            ✅ Notification schema
│   ├── Event.js                   ✅ Event schema
│   ├── Report.js                  ✅ Report schema
│   ├── JoinRequest.js             ✅ Join request schema
│   ├── CollaborationBoardRequest.js ✅ Collaboration request schema
│   └── EventRequest.js            ✅ Event request schema
├── routes/
│   ├── authRoutes.js              ✅ Authentication endpoints
│   ├── userRoutes.js              ✅ User endpoints
│   ├── postRoutes.js              ✅ Post endpoints
│   ├── chatRoutes.js              ✅ Chat endpoints
│   ├── reelRoutes.js              ✅ Reel endpoints
│   ├── storyRoutes.js             ✅ Story endpoints
│   ├── studyGroupRoutes.js        ✅ Study group endpoints
│   ├── callRoutes.js              ✅ Call endpoints
│   ├── notificationRoutes.js     ✅ Notification endpoints
│   ├── adminRoutes.js             ✅ Admin endpoints
│   ├── collaborationRoutes.js    ✅ Collaboration endpoints
│   ├── eventRoutes.js             ✅ Event endpoints
│   └── reportRoutes.js            ✅ Report endpoints
└── index.js                       ✅ Express server setup
```

**Legend:**
- ✅ **Fully Implemented** - Feature is complete and functional

---

## What's Been Implemented

### 1. **Authentication & User Management** ✅
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

- **Bio Setup** (`/bio-setup`)
  - Profile completion flow
  - Bio, course, batch, learning journey
  - Profile picture upload via Cloudinary
  - Achievements tracking

- **Protected Routes**
  - Route guards using React Router
  - Automatic redirect based on bio completion status
  - Token-based authentication check

### 2. **Social Feed System** ✅
- **Feed Page** (`/feed`)
  - Infinite scroll post feed
  - Real-time post updates via Socket.io
  - Post creation with images (Cloudinary upload)
  - Post privacy settings (public, friends, private)
  - Post tags (Achievement, Campus Post)
  - Post pinning to profile

- **Post Interactions**
  - Like/Unlike posts
  - Comment system with upvote/downvote
  - Nested comment replies
  - Save posts for later
  - Delete own posts
  - View post likes list

- **Post Features**
  - Image upload and display
  - Content text with formatting
  - Author information display
  - Timestamp and engagement metrics
  - ETag caching for performance

### 3. **Real-Time Chat System** ✅
- **Chat Interface** (`/chat`)
  - 1-on-1 direct messaging
  - Group chat creation and management
  - Real-time message delivery via Socket.io
  - Message read receipts
  - Typing indicators
  - Online/offline status
  - Message search and pagination

- **Chat Features**
  - Text messages with emoji support
  - Image/file sharing via Cloudinary
  - Message deletion (for self)
  - Chat clearing
  - Group invite links
  - Group member management
  - Admin controls for groups
  - User blocking functionality
  - Message reactions (future-ready)

- **Video & Voice Calls** 📞
  - 1-on-1 video calls
  - 1-on-1 voice calls
  - Group video calls
  - Group voice calls
  - Call initiation and acceptance
  - Mute/unmute controls
  - Video on/off toggle
  - Call timeout handling
  - Integration with VideoSDK.live

### 4. **Reels System** ✅
- **Reels Page** (`/reels`)
  - Vertical video feed (Instagram-style)
  - Video upload with compression
  - Reel creation with captions
  - Like/Unlike reels
  - View count tracking
  - Comment system with voting
  - Save reels functionality
  - Delete own reels

### 5. **Stories System** ✅
- **Stories Feature**
  - Create stories with images
  - 24-hour expiration
  - Story viewer interface
  - View tracking
  - Story deletion
  - Display in feed sidebar

### 6. **Study Groups & Rooms** ✅
- **Study Rooms** (`/study-rooms`)
  - Create study groups
  - Join study groups
  - Group channels for topics
  - Channel-based messaging
  - Join requests system
  - Member invitation
  - Admin management
  - Leave group functionality
  - Group deletion (admin only)

### 7. **User Profiles & Social** ✅
- **Profile Page** (`/profile`)
  - View own profile
  - View other users' profiles
  - Profile picture display
  - Bio and achievements
  - Pinned posts
  - Friend list display
  - Friend request management

- **Friend System**
  - Send friend requests
  - Accept/reject friend requests
  - Remove friends
  - View friend requests (`/requests`)
  - Friend suggestions

- **Find Study Partner** (`/find-study-partner`)
  - Browse users by course/batch
  - Connect with study partners

### 8. **Notifications System** ✅
- **Real-Time Notifications**
  - Socket.io-based real-time delivery
  - Notification bell with unread count
  - Notification dropdown
  - Mark as read
  - Mark all as read
  - Delete notifications
  - Types: likes, comments, friend requests, messages, posts

### 9. **Admin Panel** ✅
- **Admin Dashboard** (`/admin`)
  - User management (ban/unban)
  - Content moderation (delete posts/reels)
  - Report review system
  - Analytics dashboard
  - Collaboration board requests
  - Event management
  - Event request approval

### 10. **Additional Features** ✅
- **Saved Posts** (`/saved-posts`)
  - Collection of saved posts
  - Easy access to bookmarked content

- **Collaboration Board**
  - Request collaboration board access
  - Admin approval workflow
  - Board post management

- **Events System**
  - Event creation (admin)
  - Event requests (users)
  - Event approval workflow

- **Reporting System**
  - Report posts, reels, users
  - Admin review workflow

### 11. **Backend API** ✅
- Express.js server with CORS enabled
- MongoDB connection with Mongoose
- Socket.io for real-time communication
- Cloudinary integration for media storage
- VideoSDK integration for video calls
- Comprehensive REST API endpoints:
  - Authentication: `/api/auth/*`
  - Users: `/api/users/*`
  - Posts: `/api/posts/*`
  - Chat: `/api/chat/*`
  - Reels: `/api/reels/*`
  - Stories: `/api/stories/*`
  - Study Groups: `/api/study-groups/*`
  - Calls: `/api/calls/*`
  - Notifications: `/api/notifications/*`
  - Admin: `/api/admin/*`
  - Events: `/api/events/*`
  - Reports: `/api/reports/*`
  - Collaboration: `/api/collaboration/*`

### 12. **Database Models** ✅
- **User Model**: Complete user schema with friends, requests, saved content
- **Post Model**: Posts with likes, comments, replies, privacy settings
- **Message Model**: Chat messages with read receipts, file support
- **Room Model**: Chat rooms (direct & group) with participants
- **Reel Model**: Video reels with engagement metrics
- **Story Model**: Time-limited stories
- **StudyGroup Model**: Study groups with channels
- **Notification Model**: User notifications
- **Event Model**: Events and event requests
- **Report Model**: Content/user reports
- **JoinRequest Model**: Study group join requests
- **CollaborationBoardRequest Model**: Collaboration requests
- **EventRequest Model**: Event participation requests

### 13. **Frontend Features** ✅
- React Router with comprehensive routing
- Dark mode support (infrastructure ready)
- Responsive design with Tailwind CSS
- Modern UI with glassmorphism effects
- Real-time updates via Socket.io
- Toast notifications system
- Loading states and error handling
- Image/video upload with compression
- Emoji picker integration
- Video player components
- Modal dialogs and overlays

---

## 📡 API Endpoints Overview

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Users
- `GET /api/users/profile` - Get current user profile
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/bio` - Update user bio
- `GET /api/users/all` - Get all users (search)
- `GET /api/users/:id/friends` - Get user's friends
- `POST /api/users/friend-request` - Send friend request
- `GET /api/users/friend-requests` - Get friend requests
- `PUT /api/users/friend-requests/:id/accept` - Accept friend request
- `PUT /api/users/friend-requests/:id/reject` - Reject friend request
- `DELETE /api/users/friends/:id` - Remove friend
- `GET /api/users/saved-posts` - Get saved posts
- `GET /api/users/saved-reels` - Get saved reels
- `PUT /api/users/posts/:id/save` - Save/unsave post
- `PUT /api/users/reels/:id/save` - Save/unsave reel

### Posts
- `POST /api/posts` - Create post
- `GET /api/posts` - Get all posts (feed)
- `DELETE /api/posts/:id` - Delete post
- `PUT /api/posts/:id/like` - Like/unlike post
- `PUT /api/posts/:id/pin` - Pin/unpin post to profile
- `GET /api/posts/:id/likes` - Get post likes
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Add comment
- `PUT /api/posts/:postId/comments/:commentId/vote` - Vote on comment
- `DELETE /api/posts/:postId/comments/:commentId` - Delete comment

### Chat
- `GET /api/chat/conversations` - Get all conversations
- `GET /api/chat/conversations/:roomId/messages` - Get messages
- `POST /api/chat/conversations/:roomId/messages` - Send message
- `POST /api/chat/direct` - Create direct chat
- `POST /api/chat/groups` - Create group
- `GET /api/chat/groups/:groupId` - Get group details
- `PUT /api/chat/groups/:groupId` - Update group
- `DELETE /api/chat/groups/:groupId` - Delete group
- `POST /api/chat/groups/:groupId/invite-link` - Generate invite link
- `GET /api/chat/groups/join/:inviteLink` - Join group by link
- `POST /api/chat/groups/:groupId/members` - Add member
- `DELETE /api/chat/groups/:groupId/members/:memberId` - Remove member
- `PUT /api/chat/messages/:messageId/read` - Mark message as read
- `DELETE /api/chat/messages/:messageId` - Delete message
- `DELETE /api/chat/conversations/:roomId/messages` - Clear chat
- `PUT /api/chat/users/:userId/block` - Block user
- `GET /api/chat/users/:userId/block-status` - Get block status
- `POST /api/chat/groups/:groupId/admins` - Make member admin
- `POST /api/chat/groups/:groupId/leave` - Leave group
- `GET /api/chat/online-users` - Get online users
- `GET /api/chat/upload-signature` - Get Cloudinary upload signature

### Calls
- `POST /api/calls/create-room` - Create video/voice call room
- `POST /api/calls/join-room` - Join call room
- `POST /api/calls/end-session` - End call session

### Reels
- `GET /api/reels/upload-signature` - Get upload signature
- `POST /api/reels` - Create reel
- `GET /api/reels` - Get all reels
- `PUT /api/reels/:id/like` - Like/unlike reel
- `PUT /api/reels/:id/view` - Add view
- `DELETE /api/reels/:id` - Delete reel
- `GET /api/reels/:id/comments` - Get comments
- `POST /api/reels/:id/comments` - Add comment
- `PUT /api/reels/:reelId/comments/:commentId/vote` - Vote on comment
- `DELETE /api/reels/:reelId/comments/:commentId` - Delete comment

### Stories
- `POST /api/stories` - Create story
- `GET /api/stories` - Get all active stories
- `PUT /api/stories/:id/view` - Add view
- `DELETE /api/stories/:id` - Delete story

### Study Groups
- `POST /api/study-groups` - Create study group
- `GET /api/study-groups` - Get all study groups
- `GET /api/study-groups/:groupId` - Get study group
- `POST /api/study-groups/join` - Join study group
- `POST /api/study-groups/:groupId/leave` - Leave study group
- `DELETE /api/study-groups/:groupId` - Delete study group
- `POST /api/study-groups/:groupId/request` - Request to join
- `GET /api/study-groups/:groupId/requests` - Get join requests
- `POST /api/study-groups/:groupId/requests/:requestId/approve` - Approve request
- `POST /api/study-groups/:groupId/requests/:requestId/reject` - Reject request
- `POST /api/study-groups/:groupId/invite` - Invite member
- `POST /api/study-groups/:groupId/members/:memberId/make-admin` - Make admin
- `DELETE /api/study-groups/:groupId/members/:memberId` - Remove member
- `POST /api/study-groups/:groupId/channels` - Create channel
- `DELETE /api/study-groups/:groupId/channels/:channelId` - Delete channel
- `GET /api/study-groups/:groupId/channels/:channelId/messages` - Get channel messages
- `POST /api/study-groups/:groupId/channels/:channelId/messages` - Send channel message

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Admin
- `GET /api/admin/analytics` - Get analytics
- `GET /api/admin/collaboration-board-requests` - Get collaboration requests
- `PUT /api/admin/collaboration-board-requests/:id/approve` - Approve collaboration request
- `PUT /api/admin/collaboration-board-requests/:id/reject` - Reject collaboration request
- `GET /api/admin/events` - Get all events
- `POST /api/admin/events` - Create event
- `DELETE /api/admin/events/:id` - Delete event
- `GET /api/admin/event-requests` - Get event requests
- `PUT /api/admin/event-requests/:id/approve` - Approve event request
- `PUT /api/admin/event-requests/:id/reject` - Reject event request
- `GET /api/admin/reports` - Get all reports
- `PUT /api/admin/reports/:id/review` - Review report
- `DELETE /api/admin/posts/:id` - Delete post (admin)
- `DELETE /api/admin/reels/:id` - Delete reel (admin)
- `PUT /api/admin/users/:id/ban` - Ban user
- `PUT /api/admin/users/:id/unban` - Unban user

### Events
- `GET /api/events` - Get all events
- `POST /api/events/request` - Create event request

### Reports
- `POST /api/reports` - Create report

### Collaboration
- `GET /api/collaboration/posts` - Get collaboration board posts
- `POST /api/collaboration/request` - Request collaboration board access

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
- Passwords hashed with bcrypt (salt rounds: 10)
- Automatic hashing before saving to database
- Secure password comparison method
- Passwords never stored in plain text

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

#### Protected Routes
- `/bio-setup` - Requires authentication, redirects if bio completed
- `/feed` - Requires authentication and bio completion
- `/profile` - Requires authentication
- `/chat` - Requires authentication
- `/reels` - Requires authentication
- `/study-rooms` - Requires authentication
- `/requests` - Requires authentication
- `/saved-posts` - Requires authentication
- `/find-study-partner` - Requires authentication
- `/admin` - Requires authentication and admin role
- `/login`, `/register` - Redirects to `/feed` if already authenticated

### **Input Validation Summary**

| Input | Frontend | Backend | Database |
|-------|----------|---------|----------|
| **Email** |  Domain regex |  Domain validation |  Schema match |
| **Password** |  Length & match |  Length check | Minlength constraint |
| **Required Fields** |  Required attributes |  Null checks |  Required schema |

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

## Expected Outcome

- A **fully functional web app** accessible to all batches  
- **Stronger student–alumni connections**  
- A **central hub** for collaboration, learning, and opportunities  

---

## Project Status

### ✅ Completed Modules
- ✅ Authentication & User Management
- ✅ Social Feed with Posts
- ✅ Real-Time Chat System
- ✅ Video & Voice Calls
- ✅ Reels System
- ✅ Stories System
- ✅ Study Groups & Channels
- ✅ Friend System
- ✅ Notifications System
- ✅ Admin Panel
- ✅ Profile Management
- ✅ Content Moderation
- ✅ Reporting System
- ✅ Events System
- ✅ Collaboration Board

### 🚀 Key Achievements
- **Real-Time Communication**: Full Socket.io integration for chat, notifications, and live updates
- **Media Management**: Cloudinary integration for efficient image/video storage and delivery
- **Video Calling**: VideoSDK.live integration for seamless video/voice calls
- **Scalable Architecture**: RESTful API with proper error handling and middleware
- **Modern UI/UX**: Responsive design with Tailwind CSS and modern React patterns
- **Security**: JWT authentication, password hashing, input validation at multiple layers

---

## Modules / Features

| Module | Status | Description |
|---------|--------|-------------|
| **User Authentication** | ✅ Complete | Sign up and login via official college email |
| **Profile Management** | ✅ Complete | Add bio, batch, course, achievements, photo |
| **Feed System** | ✅ Complete | Post images, updates with privacy settings |
| **Chat & Groups** | ✅ Complete | Real-time messaging, group chats, file sharing |
| **Video/Voice Calls** | ✅ Complete | 1-on-1 and group calls via VideoSDK |
| **Reels System** | ✅ Complete | Video reels with likes, comments, views |
| **Stories System** | ✅ Complete | 24-hour stories with view tracking |
| **Study Rooms** | ✅ Complete | Study groups with channels and messaging |
| **Notifications** | ✅ Complete | Real-time updates for all interactions |
| **Friend System** | ✅ Complete | Friend requests, connections, blocking |
| **Admin Panel** | ✅ Complete | User management, content moderation, reports |
| **Saved Content** | ✅ Complete | Save posts and reels for later |
| **Events System** | ✅ Complete | Event creation and participation requests |
| **Collaboration Board** | ✅ Complete | Collaboration requests and board access |
| **Reporting System** | ✅ Complete | Report content and users |

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
| **Storage** | Cloudinary | Efficient media management (images, videos) |
| **Video Calls** | VideoSDK.live | Real-time video/voice calling infrastructure |
| **Hosting** | Vercel / Render / AWS EC2 | Fast and scalable deployment |
| **Version Control** | Git & GitHub | Collaboration and version tracking |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account (for media storage)
- VideoSDK.live account (for video calls)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd server_side
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Install client dependencies**
```bash
cd ../client
npm install
```

4. **Environment Setup**

Create a `.env` file in the `server` directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# VideoSDK Configuration
VIDEOSDK_API_KEY=your_videosdk_api_key
VIDEOSDK_SECRET_KEY=your_videosdk_secret_key
```

Create a `.env` file in the `client` directory (optional, for VideoSDK):
```env
VITE_VIDEOSDK_API_KEY=your_videosdk_api_key
```

5. **Run the development servers**

Terminal 1 - Backend:
```bash
cd server
npm start
# or for development with nodemon
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/api/health

### Creating an Admin User

Run the admin creation script:
```bash
cd server
npm run create-admin
```

---

## 🔮 Future Enhancements

- 📱 **Mobile App (React Native)**
- 🤖 **AI-based recommendations** – friends, groups, and study rooms  
- 📄 **Resume builder and placement integration**
- 🗓️ **Integration with college events and notices**
- 🔍 **Advanced search and filtering**
- 📊 **Analytics dashboard for users**
- 🌐 **Multi-language support**

---

## 👩‍💻 Contributors
**Team CampusConnect**  
Students of **Newton School of Technology – Ajeenkya DY Patil University**

---

## 🏁 License
This project is for **educational and demonstration purposes**. All rights reserved by the developers.

---
