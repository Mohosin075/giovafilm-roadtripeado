# User Role Management & Update Guide

এই গাইডটি মূলত Frontend Team (Next.js/Dashboard) এর জন্য তৈরি করা হয়েছে, যাতে তারা Backend-এর User Role Update এবং Listing সংক্রান্ত API খুব সহজেই অ্যাডমিন ড্যাশবোর্ডে ইন্টিগ্রেট করতে পারে।

## Overview
অ্যাডমিন ড্যাশবোর্ডে ইউজার লিস্ট দেখা এবং ইউজারের রোল পরিবর্তন (যেমন: সাধারণ ইউজারকে এডমিন বা ম্যাপ এডিটর বানানো) করার জন্য Backend-এ ২টি প্রধান API এন্ডপয়েন্ট ব্যবহার করতে হবে।

**Base API URL Prefix (Assuming):** `/api/v1/user`

---

## 1. Get All Users (ইউজার লিস্ট দেখা)
অ্যাডমিন ড্যাশবোর্ডে সব ইউজারের তালিকা দেখানোর জন্য এই API ব্যবহার করা হয়। এটি পেজিনেশন, সার্চিং এবং ফিল্টারিং সাপোর্ট করে।

- **Endpoint:** `GET /user`
- **Headers:** `Authorization: Bearer <admin_or_super_admin_token>`
- **Query Parameters:**
  - `page` (ঐচ্ছিক, default: 1) - কত নম্বর পেজ দেখতে চান।
  - `limit` (ঐচ্ছিক, default: 10) - প্রতি পেজে কয়টি রেকর্ড চান।
  - `searchTerm` (ঐচ্ছিক) - নাম বা ইমেইল দিয়ে সার্চ করার জন্য।
  - `role` (ঐচ্ছিক) - নির্দিষ্ট রোলের ইউজার ফিল্টার করার জন্য (`admin`, `user`, `map_editor`, `super_admin`)।
  - `status` (ঐচ্ছিক) - ইউজারের স্ট্যাটাস ফিল্টার করার জন্য (`active`, `inactive`, `deleted`)।
    - **গুরুত্বপূর্ণ:** ডিফল্টভাবে (যদি `status` কুয়েরি প্যারামিটার না পাঠানো হয়), ডিলিট হওয়া (`deleted`) ইউজাররা এই লিস্টে আসবে না।
    - যদি ডিলিট করা ইউজারদের দেখতে চান, তবে কুয়েরি প্যারামিটারে স্পষ্টভাবে `status=deleted` পাঠাতে হবে (যেমন: `GET /user?status=deleted`)।

**Response Example:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Users retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "data": [
    {
      "_id": "65bdf3b9e4b0c2a5d8f7e911",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "status": "active",
      "verified": true,
      "createdAt": "2026-06-20T12:00:00.000Z",
      "updatedAt": "2026-06-20T12:30:00.000Z"
    },
    {
      "_id": "65bdf3b9e4b0c2a5d8f7e912",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "map_editor",
      "status": "active",
      "verified": true,
      "createdAt": "2026-06-19T10:00:00.000Z",
      "updatedAt": "2026-06-20T11:00:00.000Z"
    }
  ]
}
```

### 💡 Frontend (Next.js) Integration Tips:
1. **Table View & Pagination:** Next.js বা React-এর কোনো টেবল লাইব্রেরি (যেমন: shadcn/ui table) ব্যবহার করে ইউজারদের তালিকা দেখান। `meta` অবজেক্ট থেকে `totalPages` ও `total` ব্যবহার করে পেজিনেশন সেটআপ করুন।
2. **Search Debounce:** সার্চবার ইন্টিগ্রেট করার সময় `searchTerm` কুয়েরি প্যারামিটারে সার্চ ইনপুট পাঠানোর আগে ৩00ms-৫00ms ডেবউন্স (Debounce) লজিক ব্যবহার করুন, যাতে টাইপ করার সময় প্রতি ক্যারেক্টারে API কল না হয়।
3. **Show Deleted Users Toggle:** ড্যাশবোর্ডে একটি ফিল্টার ড্রপডাউন বা ট্যাব রাখতে পারেন (যেমন: "Active", "Inactive", "Deleted")। যখন "Deleted" ট্যাব বা ফিল্টার সিলেক্ট করা হবে, তখন এপিআই কুয়েরিতে `status=deleted` পাস করতে হবে, ফলে ডিলিট হওয়া ইউজারদের আলাদা তালিকায় রেন্ডার করা যাবে।

---

## 2. Update User Role (ইউজার রোল আপডেট করা)
ইউজার লিস্ট থেকে কোনো ইউজারের রোল পরিবর্তন (যেমন: `user` থেকে `map_editor` বা `admin`) করার জন্য এই API এন্ডপয়েন্ট কল করতে হবে।

- **Endpoint:** `PATCH /user/update-role/:userId`
- **Headers:** 
  - `Authorization: Bearer <admin_or_super_admin_token>`
  - `Content-Type: application/json`
- **Path Parameters:**
  - `userId` - যে ইউজারের রোল আপডেট করতে চান তার `_id`।
- **Request Body:**
  ```json
  {
    "role": "map_editor" 
  }
  ```

**Response Example (Success):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User role updated successfully",
  "data": "User role updated successfully."
}
```

### 💡 Frontend (Next.js) Integration Tips:
1. **Role Select Dropdown:** টেবিলে প্রতিটি ইউজারের রোলের পাশে একটি সিলেক্ট ড্রপডাউন (Select Dropdown/Popover) রাখতে পারেন।
2. **Confirmation Dialog:** ড্যাশবোর্ডে ভুলবশত কারো রোল পরিবর্তন এড়াতে ড্রপডাউন সিলেক্ট করার পর একটি কনফার্মেশন মোডাল (Confirmation Modal) দেখানো ভালো: *"Are you sure you want to change this user's role to Admin?"*
3. **API Mutation & Refetch:** ইউজারের কনফার্মেশনের পর এই `PATCH` রিকোয়েস্ট পাঠান। সাকসেসফুল রেসপন্স পাওয়ার পর একটি Toast মেসেজ (যেমন: "User role updated successfully") দেখান এবং ইউজার ডাটা রি-ফেচ (refetch) করুন যাতে টেবিলে আপডেট হওয়া রোলটি দেখা যায়।
4. **Disabled State:** নিজের অ্যাকাউন্টের রোল যাতে নিজেই ড্যাশবোর্ড থেকে পরিবর্তন করতে না পারে, সেজন্য লগ-ইন করা ইউজারের আইডি এবং টেবিলে থাকা ইউজারের আইডি সমান হলে রোল এডিটের অপশনটি ডিজেবল (disabled) করে রাখুন।

---

## 🛠 Available User Roles
ইউজার রোলের জন্য ব্যাকএন্ডে ডিফাইন করা এনামসমূহ:

```typescript
export enum USER_ROLES {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
  MAP_EDITOR = 'map_editor',
}
```

---

## 🛠 TypeScript Interfaces (Next.js)
Next.js প্রোজেক্টে ইন্টিগ্রেশন এবং টাইপ সেফটির জন্য নিচের ইন্টারফেসগুলো ব্যবহার করতে পারেন:

```typescript
export type UserRole = 'super_admin' | 'admin' | 'user' | 'map_editor';

export type UserStatus = 'active' | 'inactive' | 'deleted';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  verified: boolean;
  profile?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IUsersResponse {
  statusCode: number;
  success: boolean;
  message: string;
  meta: IPaginationMeta;
  data: IUser[];
}

export interface IRoleUpdatePayload {
  role: UserRole;
}
```
