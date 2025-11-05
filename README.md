# Vakta AI Frontend

Modern React frontend for Vakta AI platform built with Vite, TypeScript, and Tailwind CSS.

## 🚀 Features

- 🔐 Firebase Authentication with OTP verification
- 📱 Phone number-based signup and login
- ⚛️ React 18 with TypeScript
- 🎨 Tailwind CSS for styling
- 🔒 Protected routes
- 🔄 Automatic token refresh
- 📦 Axios for API calls

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase project setup
- Backend API running on `http://localhost:5000`

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables:**
   
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api/v1
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```

3. **Configure Firebase Authentication:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Enable Phone Authentication
   - Add your domain to authorized domains
   - Set up reCAPTCHA for production

## 🏃 Running the Application

### Development mode:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Production build:
```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   ├── context/        # React Context providers
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── types/          # TypeScript type definitions
│   ├── firebase/       # Firebase configuration
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── package.json
└── vite.config.ts      # Vite configuration
```

## 🔑 Authentication Flow

### Signup Flow:
1. User enters phone number
2. Firebase sends OTP via SMS
3. User verifies OTP
4. User enters profile information
5. Account created in backend
6. User redirected to dashboard

### Login Flow:
1. User enters phone number
2. Firebase sends OTP via SMS
3. User enters OTP
4. Backend verifies and returns JWT tokens
5. User redirected to dashboard

## 🎨 UI Components

- **Login Page**: Phone-based OTP authentication
- **Signup Page**: Multi-step registration with OTP verification
- **Dashboard**: User profile and quick actions

## 🔧 API Integration

The app integrates with the backend API at `/api/v1`:

- `POST /auth/send-otp` - Send OTP to phone
- `POST /auth/signup` - Create user account
- `POST /auth/login` - Login with OTP
- `GET /auth/me` - Get current user profile
- `POST /auth/logout` - Logout user

## 📝 Development Notes

### Token Management:
- Access tokens stored in localStorage
- Automatic token refresh on 401 errors
- Protected routes redirect to login if not authenticated

### Firebase Setup:
1. Create a Firebase project
2. Enable Phone Authentication
3. Add web app to project
4. Copy config to `.env` file

### Environment Variables:
All environment variables must start with `VITE_` to be accessible in the frontend code.

## 🐛 Troubleshooting

### Firebase OTP not sending:
- Check if phone authentication is enabled in Firebase Console
- Verify domain is authorized
- Check browser console for errors

### API connection issues:
- Ensure backend is running on port 5000
- Check CORS configuration in backend
- Verify API_BASE_URL in .env file

### Build errors:
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Delete .vite cache: `rm -rf .vite`

## 📄 License

MIT

