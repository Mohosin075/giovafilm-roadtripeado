# Invited User Verification & Password Setup Flow

এই ডকুমেন্টেশনটি ব্যাখ্যা করে কীভাবে কোনো ইউজারকে ইনভাইট করার পর তার OTP ভেরিফিকেশন এবং পাসওয়ার্ড সেটআপ সম্পন্ন করতে হবে।

---

## ১. পুরো প্রক্রিয়াটির সংক্ষিপ্ত রূপ (Flow Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    actor InvitedUser as Invited User
    participant Frontend
    participant Backend
    participant DB as MongoDB

    Admin->>Backend: POST /api/v1/user/invite {email, role}
    Backend->>DB: User তৈরি (verified: false, password: NULL)
    Backend->>InvitedUser: ইমেইলে OTP কোড পাঠানো
    InvitedUser->>Frontend: লিংকে ক্লিক (/otp-verify?email=...)
    Note over Frontend, InvitedUser: ২ উপায়ে ভেরিফাই করা সম্ভব

    alt Option A: Single-step (একসাথে OTP + Password পাঠানো)
        InvitedUser->>Frontend: OTP ও Password ইনপুট দেন
        Frontend->>Backend: POST /api/v1/auth/verify-account {email, oneTimeCode, password}
        Backend->>DB: Password হ্যাশ ও সংরক্ষণ এবং verified = true
        Backend-->>Frontend: JWT Tokens (Login successful)
    else Option B: Multi-step (প্রথমে OTP ভেরিফিকেশন, তারপর Password)
        InvitedUser->>Frontend: শুধুমাত্র OTP ইনপুট দেন
        Frontend->>Backend: POST /api/v1/auth/verify-account {email, oneTimeCode}
        Backend->>DB: OTP কোড মুছে দেয় এবং resetPassword = true করে
        Backend-->>Frontend: { needPassword: true, token: "JWT_TEMP_TOKEN" }
        InvitedUser->>Frontend: পাসওয়ার্ড ইনপুট দেন
        Frontend->>Backend: POST /api/v1/auth/reset-password {newPassword, confirmPassword} (Headers.Authorization = token)
        Backend->>DB: Password হ্যাশ ও সংরক্ষণ এবং verified = true
        Backend-->>Frontend: Success Message (Password set successfully)
    end
```

---

## ২. এপিআই এর বিবরণ (API Reference)

### ১. User Invitation (Admin বা Super Admin দ্বারা)
* **Endpoint:** `POST /api/v1/user/invite`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
* **Request Body:**
  ```json
  {
    "email": "mofit85267@hotkev.com",
    "role": "user" 
  }
  ```
* **কাজ:** এটি ডাটাবেজে ইউজারটিকে `verified: false` এবং কোনো `password` ছাড়াই তৈরি করবে। এরপর ইউজারের ইমেইলে একটি OTP পাঠানো হবে এবং ফ্রন্টএন্ড লিংক (`/otp-verify?email=mofit85267@hotkev.com`) পাঠানো হবে।

---

### ২. Account Verification (ইউজার দ্বারা OTP ভেরিফিকেশন)
* **Endpoint:** `POST /api/v1/auth/verify-account`
* **Request Body (পাসওয়ার্ড ছাড়া - Multi-step):**
  ```json
  {
    "email": "mofit85267@hotkev.com",
    "oneTimeCode": "123456"
  }
  ```
* **Response (পাসওয়ার্ড ছাড়া - Multi-step):**
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "OTP verified successfully, please set your password to complete your account.",
    "data": {
      "token": "eyJhbGciOi...",
      "needPassword": true
    }
  }
  ```
  > [!IMPORTANT]
  > এখানে `needPassword: true` রেসপন্স দেখে ফ্রন্টএন্ড বুঝতে পারবে যে ইউজারটির পাসওয়ার্ড সেট করা আবশ্যক এবং তাকে পাসওয়ার্ড ইনপুট নেওয়ার পেজে রিডাইরেক্ট করতে হবে। এই ধাপে ডাটাবেজে `verified` স্ট্যাটাসটি এখনও `false` থাকে।

* **Request Body (একসাথে পাসওয়ার্ড সহ - Single-step):**
  যদি ফ্রন্টএন্ডে একই স্ক্রিনে OTP এবং পাসওয়ার্ড উভয়ই ইনপুট নেওয়া হয়:
  ```json
  {
    "email": "mofit85267@hotkev.com",
    "oneTimeCode": "123456",
    "password": "mySecurePassword123"
  }
  ```
* **Response (পাসওয়ার্ড সহ - Single-step):**
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Welcome mofit85267 to our platform. Your account is now verified and password set.",
    "data": {
      "accessToken": "ey...",
      "refreshToken": "ey...",
      "role": "user"
    }
  }
  ```
  > [!TIP]
  > পাসওয়ার্ড সহ রিকোয়েস্ট পাঠালে ডাটাবেজে সরাসরি `verified` ফিল্ডটি `true` হয়ে যায় এবং ইউজার সরাসরি লগইন হয়ে টোকেন পেয়ে যায়।

---

### ৩. Password Setup (যদি ভেরিফিকেশনের সময় পাসওয়ার্ড না পাঠানো হয়)
* **Endpoint:** `POST /api/v1/auth/reset-password`
* **Headers:** `Authorization: <verify-account এপিআই থেকে প্রাপ্ত token>`
* **Request Body:**
  ```json
  {
    "newPassword": "mySecurePassword123",
    "confirmPassword": "mySecurePassword123"
  }
  ```
* **Response:**
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Password reset successfully, please login now.",
    "data": {
      "message": "Password reset successfully"
    }
  }
  ```
  > [!NOTE]
  > এই রিকোয়েস্টটি সফল হওয়ার সাথে সাথে ডাটাবেজে ইউজারের `password` সেভ হয়ে যাবে এবং `verified` স্ট্যাটাসটি `true` হবে। এরপর ইউজার ইমেইল ও নতুন পাসওয়ার্ড দিয়ে সাধারণ লগইন করতে পারবেন।
