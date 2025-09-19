# Email Service vs Push Notifications Architecture

This document clearly distinguishes between the two separate communication systems implemented in the Process Manager application.

## 🏗️ System Architecture Overview

### 1. **Email Service** (SMTP-based)
- **Purpose**: Send emails via SMTP server
- **Technology**: SMTP protocol
- **Routes**: `/api/emails/*`
- **Handler**: `EmailHandler`
- **Use Cases**: Registration confirmations, password resets, admin communications

### 2. **Push Notification Service** (Firebase FCM-based)
- **Purpose**: Send real-time push notifications to devices
- **Technology**: Firebase Cloud Messaging (FCM)
- **Routes**: `/api/notifications/*`
- **Handler**: `NotificationHandler`
- **Use Cases**: Real-time alerts, system updates, activity notifications

---

## 📧 Email Service (SMTP)

### **Endpoints**
- **Base URL**: `http://localhost:8080/api/emails`

#### **User Endpoints**
- `POST /test` - Test email configuration (any authenticated user)

#### **Admin Endpoints**
- `POST /send-to-user` - Send email to specific user
- `POST /send-to-group` - Send email to multiple users
- `POST /broadcast` - Broadcast email to all users (with role/status filters)

### **Features**
✅ **Implemented**:
- Test email sending
- Send to specific users by ID
- Send to groups of users
- Broadcast emails with role/status filtering
- HTML and plain text email support
- Comprehensive error handling
- Partial delivery reporting

### **REST API Testing**
- File: `backend/.rest/emails.rest`
- Contains complete examples for all email endpoints

---

## 🔔 Push Notification Service (Firebase FCM)

### **Endpoints**
- **Base URL**: `http://localhost:8080/api/notifications`

#### **User Endpoints**
- `GET /` - Get user's notifications (with pagination)
- `POST /mark-read` - Mark notifications as read
- `GET /preferences` - Get notification preferences
- `PUT /preferences` - Update notification preferences

#### **Device Management**
- `POST /devices/register` - Register device for FCM
- `GET /devices` - Get user's registered devices
- `PUT /devices/:deviceUuid/token` - Update FCM token
- `DELETE /devices/:deviceUuid` - Deregister device

#### **Test & Admin Endpoints**
- `POST /test` - Send test notification to current user
- `POST /admin/send` - Send push notifications (admin only)

### **Features**
🚧 **In Development** (Stubs implemented):
- Device registration with UUID-based tracking
- FCM token management
- User notification preferences
- Push notification sending with Firebase
- Real-time notification delivery
- Device-specific notification settings

### **REST API Testing**
- File: `backend/.rest/notifications.rest`
- Contains complete examples for all notification endpoints

---

## 🔧 Implementation Status

### ✅ **Completed**
1. **Email Service (SMTP)**
   - Complete email sending functionality
   - Admin endpoints for user communication
   - REST API tests and documentation
   - Error handling and delivery reporting

2. **System Architecture**
   - Clear separation between email and notifications
   - Proper handler and route organization
   - Backend integration and compilation

### 🚧 **In Progress**
1. **Push Notification System**
   - Handler stubs created with all endpoints
   - Route structure defined
   - REST API documentation complete

### 📋 **Next Steps**
1. **Firebase Setup**
   - Create Firebase project
   - Configure FCM for web/mobile
   - Generate service account keys

2. **Database Models**
   - Device management schema
   - Notification storage schema
   - User preferences schema

3. **Backend Implementation**
   - Firebase service integration
   - Device registration logic
   - Push notification sending

4. **Frontend Integration**
   - FCM SDK setup
   - Service worker for background notifications
   - Device registration flow
   - Notification UI components

---

## 📁 File Structure

```
backend/
├── .rest/
│   ├── emails.rest              # Email API tests
│   └── notifications.rest       # Notification API tests
├── internal/
│   ├── handlers/
│   │   ├── email.handler.go     # Email (SMTP) endpoints
│   │   └── notification.handler.go # Notification (FCM) endpoints
│   ├── routes/
│   │   ├── email.routes.go      # Email routes
│   │   └── notification.routes.go # Notification routes
│   └── services/
│       └── email.service.go     # SMTP email service
```

---

## 🎯 Key Differences

| Aspect | Email Service | Push Notifications |
|--------|---------------|-------------------|
| **Protocol** | SMTP | Firebase FCM |
| **Delivery** | Email inbox | Device push |
| **Real-time** | No | Yes |
| **Device Registration** | Not required | Required |
| **Offline Support** | Email server handles | FCM handles |
| **Rich Content** | HTML emails | Rich notifications |
| **User Interaction** | Email client | Notification center |
| **Implementation Status** | ✅ Complete | 🚧 In Progress |

---

## 🚀 Usage Examples

### Email Service
```bash
# Test email
curl -X POST http://localhost:8080/api/emails/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Send to user
curl -X POST http://localhost:8080/api/emails/send-to-user \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "...", "subject": "Hello", "body": "Test message"}'
```

### Push Notifications (When implemented)
```bash
# Register device
curl -X POST http://localhost:8080/api/notifications/devices/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceUuid": "...", "fcmToken": "...", "deviceType": "web"}'

# Send notification
curl -X POST http://localhost:8080/api/notifications/admin/send \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Alert", "body": "Important update", "userIds": ["..."]}'
```

---

This architecture ensures clear separation of concerns while providing comprehensive communication capabilities for the Process Manager application.