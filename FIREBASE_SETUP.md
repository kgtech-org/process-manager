# Firebase Push Notifications Setup Guide

This guide will help you configure Firebase Cloud Messaging (FCM) for push notifications in the Process Manager application.

## Prerequisites

- A Google/Gmail account
- Access to Firebase Console (https://console.firebase.google.com)
- The Firebase project `yas-process-manager` should already be created

## Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select the `yas-process-manager` project

## Step 2: Generate Web Push Certificate (VAPID Key)

1. In Firebase Console, click on **Project Settings** (gear icon in the left sidebar)
2. Navigate to the **Cloud Messaging** tab
3. Scroll down to the **Web configuration** section
4. Under **Web Push certificates**, click **Generate key pair**
5. Copy the generated key (it will look like: `BKagOny0KF_2pCJQ3m...`)

## Step 3: Configure the Application

### Option A: Using Environment Variable (Recommended)

1. Create/update the `.env` file in the project root:
   ```bash
   FIREBASE_VAPID_KEY=YOUR_GENERATED_KEY_HERE
   ```

2. Restart the Docker containers:
   ```bash
   docker-compose down
   docker-compose up -d --build frontend
   ```

### Option B: Direct Configuration (Development Only)

If you're running in development mode without Docker, add the key to `frontend/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=YOUR_GENERATED_KEY_HERE
```

## Step 4: Verify Configuration

1. Login to the application
2. When prompted, allow notifications
3. Check the browser console for any errors
4. You should see: `FCM Token obtained: ...` in the console

## Troubleshooting

### Error: "Firebase VAPID key not configured"
- Make sure you've set the `FIREBASE_VAPID_KEY` environment variable
- Rebuild the frontend container after adding the variable

### Error: "Request is missing required authentication credential"
- The VAPID key doesn't match the Firebase project
- Generate a new key pair in Firebase Console for the correct project
- Make sure you're using the Web Push certificate, not the Server key

### Error: "Messaging: A problem occurred while subscribing"
- Check that the Firebase project ID in `frontend/src/config/firebase.ts` matches your project
- Verify that Cloud Messaging is enabled in your Firebase project

### Notifications not received
- Check browser notification permissions (should be "Allow")
- Verify the service worker is registered: Check DevTools -> Application -> Service Workers
- Check the FCM token is saved in the database: `docker exec -it process-manager-mongodb mongosh --username admin --password password --authenticationDatabase admin process_manager --eval "db.devices.find().pretty()"`

## Testing Push Notifications

### Test via API (Admin only)

1. Get your access token from browser localStorage
2. Send a test notification:
   ```bash
   curl -X POST http://localhost/api/notifications/admin/send \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Notification",
       "body": "This is a test push notification",
       "category": "system",
       "priority": "normal",
       "userIds": ["YOUR_USER_ID"]
     }'
   ```

### Test via Application

1. Navigate to `/notifications` page
2. Click on the "Send Test Notification" button
3. You should receive a notification

## Security Notes

- **NEVER** commit the VAPID key to version control
- The VAPID key is public (it's included in the frontend bundle)
- The server-side Firebase service account key (`serviceAccountKey.json`) is private and should never be exposed
- Use environment variables for all sensitive configuration

## Additional Resources

- [Firebase Cloud Messaging Web Guide](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [Firebase Console](https://console.firebase.google.com)
