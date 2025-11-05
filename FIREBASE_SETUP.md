# Firebase Setup Guide for Vakta AI

This guide will help you set up Firebase Authentication with Phone Number OTP for the Vakta AI frontend.

## 📋 Prerequisites

- A Google account
- Firebase project access
- Node.js and npm installed

## 🚀 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select an existing project
3. Enter project name: `Vakta AI`
4. Enable Google Analytics (optional)
5. Click "Create project"

## 🔐 Step 2: Enable Phone Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started" if you haven't enabled it yet
3. Go to **Sign-in method** tab
4. Click on **Phone** authentication
5. Toggle **Enable** switch
6. Click "Save"

## 📱 Step 3: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click on **Web** icon (`</>`)
4. Enter app nickname: `Vakta AI Web`
5. Click "Register app"
6. Copy the configuration object

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "vakta-ai.firebaseapp.com",
  projectId: "vakta-ai",
  storageBucket: "vakta-ai.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-ABC123"
};
```

## 🌐 Step 4: Add Authorized Domains

1. In Authentication settings, go to **Authorized domains**
2. Add your development domain: `localhost`
3. (Optional) Add your production domain when deploying

## ⚙️ Step 5: Configure Frontend

1. Open `frontend/.env.example`
2. Copy it to `frontend/.env`
3. Fill in the Firebase configuration:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=vakta-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vakta-ai
VITE_FIREBASE_STORAGE_BUCKET=vakta-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123
```

## 🧪 Step 6: Test the Setup

1. Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open `http://localhost:3000/signup`
3. Enter a phone number with country code
4. Click "Send OTP"
5. Check your phone for SMS with OTP code

## 🔒 Security Considerations

### For Development:
- reCAPTCHA will be handled automatically
- Test with real phone numbers
- OTP codes are sent via Firebase's secure infrastructure

### For Production:
1. Go to Firebase Console > Authentication > Settings
2. Enable "SMS region restrictions" if needed
3. Set up app check for additional security
4. Add your production domain to authorized domains
5. Configure rate limiting for OTP requests

## 🐛 Troubleshooting

### OTP Not Received:
- Check phone number format (include country code)
- Verify Firebase Phone Authentication is enabled
- Check Firebase Console > Authentication > Usage for any limits
- Try with a different phone number

### reCAPTCHA Issues:
- Clear browser cache
- Try in incognito mode
- Check browser console for errors
- Verify domain is authorized in Firebase Console

### Console Errors:
- Verify all environment variables are set correctly
- Check Firebase config matches your project
- Ensure backend API is running on correct port

## 📱 Testing Phone Authentication

### Test Phone Numbers (Development):
Firebase provides test phone numbers for development:
1. Go to Firebase Console > Authentication > Phone numbers
2. Add test phone numbers for development
3. Use the test OTP code: `000000` (for all test numbers)

Example test numbers:
- US: +1 650-555-1234
- India: +91 9999999999

### Production Testing:
- Use real phone numbers
- Real SMS will be sent
- May incur charges (check Firebase pricing)

## 💡 Additional Resources

- [Firebase Phone Auth Docs](https://firebase.google.com/docs/auth/web/phone-auth)
- [Firebase Console](https://console.firebase.google.com)
- [Firebase Pricing](https://firebase.google.com/pricing)

## ✅ Checklist

Before deploying to production:

- [ ] Firebase project created
- [ ] Phone authentication enabled
- [ ] Environment variables configured
- [ ] Tested signup flow
- [ ] Tested login flow
- [ ] OTP verification working
- [ ] Production domain authorized
- [ ] App Check configured (optional)
- [ ] Rate limiting configured (optional)

## 📞 Support

If you encounter issues:
1. Check Firebase Console for errors
2. Review browser console for frontend errors
3. Check backend logs for API errors
4. Verify all environment variables are set correctly

