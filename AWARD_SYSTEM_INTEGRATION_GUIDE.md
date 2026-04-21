# Award System Integration Guide

এই গাইডটি মূলত Frontend Team (Next.js) এর জন্য তৈরি করা হয়েছে, যাতে তারা Backend-এর Award System খুব সহজেই অ্যাপ্লিকেশনে ইন্টিগ্রেট করতে পারে।

## Overview
Award System-এর জন্য Backend-এ ২টি প্রধান API এন্ডপয়েন্ট তৈরি করা আছে। একটি দিয়ে User তার সবগুলো Award-এর স্ট্যাটাস (locked/unlocked/progress) দেখতে পারবে, এবং অন্যটি দিয়ে 'Free Map' অ্যাওয়ার্ডটি রিডিম (Redeem) করতে পারবে।

**Base API URL Prefix (Assuming):** `/api/v1/awards` (আপনার প্রজেক্টের গ্লোবাল রাউট সেটআপ অনুযায়ী এটি `/awards` বা অন্য কিছু হতে পারে)।

---

## 1. Get My Awards (আমার অ্যাওয়ার্ডস দেখা)
এই API কল করলে লগ-ইন করা ইউজার তার সবগুলো অ্যাওয়ার্ডের লিস্ট পাবে। এর মধ্যে প্রতিটি অ্যাওয়ার্ডের বর্তমান `progress`, `target` পয়েন্ট, এবং `isUnlocked` স্ট্যাটাস থাকবে।

- **Endpoint:** `GET /awards/my-awards`
- **Headers:** `Authorization: Bearer <your_access_token>`
- **Response Data Type:** `IAward[]`

**Response Example:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User awards retrieved successfully",
  "data": [
    {
      "_id": "60d5ec49f1...",
      "userId": "60d5ec...",
      "type": "PDF Itinerary",
      "progress": 250,
      "target": 500,
      "isUnlocked": false
    },
    {
      "_id": "60d5ec49f2...",
      "userId": "60d5ec...",
      "type": "Free Map",
      "progress": 1100,
      "target": 1000,
      "isUnlocked": true
    }
    // ...other awards like 'Gourmet Guide', 'Top Reviewer' etc.
  ]
}
```

### 💡 Frontend (Next.js) Integration Tips:
1. **Data Fetching:** React Query (TanStack Query), SWR অথবা Next.js App Router-এর Server Component (fetch API) দিয়ে ডাটা পেজ লোডের সময় ফেচ করতে পারেন। 
2. **UI Rendering:** 
   - `data` array টা লুপ (map) করে সুন্দর কার্ড আকারে অ্যাওয়ার্ডগুলো দেখাবেন।
   - `isUnlocked: true` হলে আনলকড স্টাইল/আইকন এবং `false` হলে লকড স্টাইল/আইকন দিতে পারেন।
   - প্রোগ্রেস বার (Progress Bar) দেখানোর জন্য ফর্মুলা ব্যবহার করতে পারেন: `(progress / target) * 100`%।

---

## 2. Redeem Free Map (ফ্রি ম্যাপ রিডিম করা)
যখন ইউজারের 'Free Map' অ্যাওয়ার্ডটি আনলক হয়ে যাবে (`isUnlocked: true`), তখন সে চাইলে যেকোনো একটি Map ফ্রিতে নিতে পারবে। এই API-তে কাঙ্ক্ষিত Map-এর `mapId` বডিতে পাঠাতে হবে।

- **Endpoint:** `POST /awards/redeem-free-map`
- **Headers:** `Authorization: Bearer <your_access_token>`
- **Body:**
```json
{
  "mapId": "<map_id_here>"
}
```

**Response Example:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Free map redeemed successfully",
  "data": {
     // This will return the updated User object
     "_id": "60d5ec...",
     "username": "...",
     "redeemedFreeMap": "65bdf3...", // The map ID that was just redeemed
     "purchasedMaps": ["65bdf3..."]  // The map is successfully added here
  }
}
```

### 💡 Frontend (Next.js) Integration Tips:
1. **Button Logic:** Map details page বা Checkout page-এ, "ফ্রিতে রিডিম করুন" বা "Redeem Free Map" নামে একটি বাটন রাখতে পারেন।
2. **Conditions:** বাটনটি দেখানোর আগে চেক করবেন:
   - ইউজারের `Free Map` অ্যাওয়ার্ড আনলকড আছে কিনা।
   - ইউজার আগে থেকেই ম্যাপ রিডিম করে ফেলেছে কিনা (ইউজারের ডাটাতে `redeemedFreeMap` ফিল্ড চেক করতে হবে)।
3. **API Call & State Update:** বাটনে ক্লিক করলে POST রিকোয়েস্ট পাঠাবেন। 
   - Response `success: true` হলে Toast দিয়ে "Map Redeemed Successfully" মেসেজ দেখাবেন।
   - `purchasedMaps` স্টেট আপডেট করে ইউজারকে কনফার্মেশন পেইজে নিয়ে যেতে পারেন।
4. **Error Handling:** ইউজার যদি আগে থেকেই রিডিম করে থাকে অথবা পয়েন্ট না থাকে, সার্ভার থেকে `400 Bad Request` আসতে পারে। সেক্ষেত্রে Toast-এ এরর মেসেজটি দেখাবেন।

---

## 🛠 TypeScript Interfaces
Next.js-এ টাইপ সেফটির জন্য নিচের ইন্টারফেসগুলো ব্যবহার করতে পারেন:

```typescript
export type AwardType = 
  | 'PDF Itinerary' 
  | 'Free Map' 
  | 'Gourmet Guide' 
  | 'Top Reviewer' 
  | 'Trail Master' 
  | 'History Buff' 
  | 'Legendary Explorer';

export interface IAward {
  _id: string;
  userId: string;
  type: AwardType;
  progress: number;
  target: number;
  isUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

// User object should have these fields updated after redeeming
export interface IUser {
  // ... other user fields
  redeemedFreeMap?: string | null;
  purchasedMaps: string[];
}
```
