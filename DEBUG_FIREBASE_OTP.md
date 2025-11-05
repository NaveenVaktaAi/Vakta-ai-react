# Debugging Firebase OTP - No OTP Received

## Issues Found:

### 1. **Daily SMS Quota (Most Likely)**
Firebase Console shows: **"To prevent abuse, new projects currently have a sent SMS daily quota of 10/day"**

This means:
- You can only send 10 SMS per day on free tier
- If quota exceeded, OTP won't be sent
- Need to add billing account to increase quota

### 2. **reCAPTCHA Not Loaded**
- Changed size from 'invisible' to 'normal' (visible)
- Now you'll see reCAPTCHA challenge
- Complete reCAPTCHA to send OTP

### 3. **Phone Number Format**
Make sure phone number is correct:
- Format: `+919999999999` (no spaces)
- Include country code
- Remove any spaces or dashes

## What to Check Now:

### Step 1: Check Console
Open browser console and click "Send OTP". Look for:
```
📱 Sending OTP via Firebase to: {...}
Firebase auth loaded
reCAPTCHA verifier created
📞 Formatted phone: +919999999999
Sending OTP request to Firebase...
✅ Firebase confirmation received
✅ OTP sent successfully via Firebase
```

OR Error:
```
❌ Firebase OTP error: ...
Error code: auth/...
Error message: ...
```

### Step 2: Check reCAPTCHA
- reCAPTCHA popup should appear
- Complete the challenge
- Then OTP will be sent

### Step 3: Check Firebase Console
1. Go to Firebase Console
2. Check "Authentication" → "Sign-in method"
3. Look at the quota warning
4. See if quota exceeded

## Solutions:

### Option 1: Increase SMS Quota (Recommended for Production)
1. Go to Firebase Console
2. Add billing account
3. Increase daily SMS quota
4. Test again

### Option 2: Use Test Phone Numbers (Development)
1. In Firebase Console, go to Authentication
2. Add test phone numbers
3. Use test OTP: `123456` (works for all test numbers)

### Option 3: For Now - Skip OTP
If just testing the signup flow:
- Use the mock OTP bypass we had before
- Or implement backend SMS OTP instead

## Quick Fix for Testing:

If you just want to test signup without OTP:

1. Comment out Firebase OTP code
2. Just skip to profile step
3. Test the signup API call

Would you like me to add this temporary bypass?

## Expected Behavior:

1. Enter phone number
2. Click "Send OTP"
3. **reCAPTCHA popup appears** (NEW!)
4. Complete reCAPTCHA
5. Console: "✅ OTP sent successfully"
6. **SMS arrives on phone**
7. Enter OTP
8. Verify

## If Still No OTP:

Check these in order:
1. ✅ Phone number format correct?
2. ✅ reCAPTCHA completed?
3. ✅ Console shows "OTP sent"?
4. ✅ SMS quota not exceeded?
5. ✅ Phone has SMS enabled?
6. ✅ Check spam folder?

## Test Again Now:
1. Refresh page
2. Enter phone number
3. Click "Send OTP"
4. Complete reCAPTCHA (if appears)
5. Check console logs
6. Report what you see!

