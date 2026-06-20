# Offer Update Integration Guide (অফার আপডেট ইন্টিগ্রেশন গাইড)

এই গাইডটি মূলত Frontend Team এবং Backend Developers দের জন্য তৈরি করা হয়েছে, যাতে তারা অ্যাপ্লিকেশনে খুব সহজেই **Offer (অফার) আপডেট** করার API এন্ডপয়েন্টটি ব্যবহার ও ইন্টিগ্রেট করতে পারে।

---

## 1. Overview (সংক্ষিপ্ত বিবরণ)
কোনো এক্সিস্টিং অফারের তথ্য (যেমন: শিরোনাম, বিবরণ, ডিসকাউন্ট টাইপ, ভ্যালিডিটি, স্ট্যাটাস ইত্যাদি) পরিবর্তন বা আপডেট করার জন্য Backend-এ একটি `PATCH` API তৈরি করা আছে। এই API টিতে অফারের আইডি প্যারামিটার হিসেবে পাঠাতে হবে এবং নতুন তথ্যগুলো রিকোয়েস্ট বডিতে পাঠাতে হবে।

**Base API URL:** `/api/v1/offer/:id`

---

## 2. API Endpoint & Authentication (API এন্ডপয়েন্ট ও অথেন্টিকেশন)

- **Endpoint:** `PATCH /api/v1/offer/:id` (এখানে `:id` হলো অফারের MongoDB ObjectId)
- **Headers:** 
  - `Authorization: Bearer <your_access_token>`
  - `Content-Type: application/json` অথবা `multipart/form-data` (যদি ইমেজ আপলোড করা হয়)
- **Allowed Roles (অনুমোদিত রোলস):** 
  - `ADMIN`
  - `SUPER_ADMIN`
  - `MAP_EDITOR`
  
> [!IMPORTANT]
> শুধুমাত্র এই তিনটি রোলের ইউজাররাই অফার আপডেট করতে পারবেন। সাধারণ ইউজার (`USER`) এই API কল করলে `403 Forbidden` এরর পাবেন।

---

## 3. Payload (Request Body) Fields - (রিকোয়েস্ট বডির তথ্যাদি)

যেহেতু এটি একটি `PATCH` রিকোয়েস্ট, তাই বডির সবগুলো ফিল্ডই **ঐচ্ছিক (Optional)**। আপনি শুধুমাত্র যে ফিল্ডগুলো পরিবর্তন করতে চান, সেগুলো বডিতে পাঠাবেন।

| ফিল্ডের নাম (Field) | ডাটা টাইপ (Type) | বিবরণ (Description) | ভ্যালিডেশন / ডিফল্ট ভ্যালু |
| :--- | :--- | :--- | :--- |
| `title` | `String` | অফারের মূল শিরোনাম বা নাম। | ঐচ্ছিক (Optional) |
| `description` | `String` | অফারের বিস্তারিত বিবরণ। | ঐচ্ছিক (Optional) |
| `images` | `File / Array` | অফারের নতুন ছবি। আপলোড করার সময় ফর্মে কি (key) হবে `images`। | এটি প্রথম ইমেজটিকে `photo` হিসেবে সেভ করবে। |
| `place` | `String (ObjectId)` | অফারটি কোন নির্দিষ্ট প্লেসের জন্য প্রযোজ্য তার ID। | ঐচ্ছিক (Optional) |
| `business` | `String (ObjectId)` | অফারটি কোন নির্দিষ্ট বিজনেসের জন্য প্রযোজ্য তার ID। | ঐচ্ছিক (Optional) |
| `discountType` | `String (Enum)` | ডিসকাউন্টের ধরণ। | অবশ্যই নিচের যেকোনো একটি হতে হবে:<br>`Percentage`<br>`Flat`<br>`Free item`<br>`BOGO` |
| `discountValue` | `String / Number` | ডিসকাউন্টের পরিমাণ বা মান। | - `Percentage` হলে: **১ থেকে ১০০** এর মধ্যে হতে হবে।<br>- `Flat` হলে: **পজিটিভ সংখ্যা** হতে হবে। |
| `validFrom` | `String (ISO Date)` | অফারটি কবে থেকে কার্যকর হবে। | ISO 8601 ফরম্যাট (e.g., `2026-06-20T22:54:02.000Z`) |
| `validUntil` | `String (ISO Date)` | অফারের মেয়াদ শেষ হওয়ার তারিখ। | ISO 8601 ফরম্যাট বা `null` |
| `noExpiration` | `Boolean` | অফারের কোনো মেয়াদ শেষ হওয়ার ডেট না থাকলে এটি `true` হবে। | ডিফল্ট: `false` |
| `maxRedemptions` | `Number` | এই অফারটি সর্বোচ্চ মোট কতবার রিডিম করা যাবে। | ঐচ্ছিক (Optional) |
| `redemptionRules` | `Array of Strings` | অফার ব্যবহারের নিয়মাবলী। | যেমন: `["একবার ব্যবহারযোগ্য", "শুধুমাত্র রবিবারে প্রযোজ্য"]` |
| `buttonLabel` | `String` | রিডিম বাটনের টেক্সট। | ডিফল্ট: `"Redeem Offer"` |
| `redemptionDuration`| `Number` | রিডিম করার পর কুপনটি কত মিনিট ভ্যালিড থাকবে। | মিনিট ইউনিটে (ডিফল্ট: `5` মিনিট) |
| `status` | `String (Enum)` | অফারের বর্তমান অবস্থা বা স্ট্যাটাস। | অবশ্যই নিচের যেকোনো একটি হতে হবে:<br>`Active`<br>`Expired`<br>`Paused` |
| `redemptionsCount` | `Number` | অফারটি এ পর্যন্ত কতবার রিডিম করা হয়েছে। | অবশ্যই নন-নেগেটিভ সংখ্যা হতে হবে। |

---

## 4. Business Logic & Validation Rules (বিজনেস লজিক ও ভ্যালিডেশন)

আপডেট করার সময় নিচের বিজনেস লজিকগুলো কঠোরভাবে চেক করা হয়:

### ক. একই প্লেস বা বিজনেসে একাধিক অ্যাক্টিভ অফার না থাকা
একটি নির্দিষ্ট `Place` অথবা `Business`-এর জন্য একই সময়ে শুধুমাত্র **একটিই অ্যাক্টিভ (`Active`) অফার** থাকতে পারবে।
- যদি কোনো অফারের স্ট্যাটাস `Active` করা হয় এবং ঐ অফারের সাথে যুক্ত প্লেস/বিজনেসে ইতিমধ্যেই অন্য কোনো অ্যাক্টিভ অফার থাকে, তবে সার্ভার থেকে এরর থ্রো করবে:
  > **Error Message:** `An active offer already exists for this place or business` (Status Code: `400 Bad Request`)

### খ. ডিসকাউন্ট ভ্যালু ভ্যালিডেশন (Zod)
রিকোয়েস্ট বডিতে যদি `discountType` এবং `discountValue` আপডেট করা হয়, তবে নিচের নিয়মগুলো প্রযোজ্য হবে:
- **Percentage (শতকরা হারে ডিসকাউন্ট):** `discountValue` অবশ্যই `1` থেকে `100` এর মধ্যে হতে হবে। (যেমন: `20` মানে ২০% ডিসকাউন্ট)।
- **Flat (নির্দিষ্ট অংকের ছাড়):** `discountValue` অবশ্যই একটি পজিটিভ সংখ্যা (`> 0`) হতে হবে। (যেমন: `15` মানে ১৫ টাকা/ডলার ছাড়)।

---

## 5. Example API Requests & Responses (উদাহরণসমূহ)

### রিকোয়েস্টের উদাহরণ (JSON Payload)
```http
PATCH /api/v1/offer/66743b2a2b0c950a48b56f89
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "title": "Super Weekend 20% Discount",
  "discountType": "Percentage",
  "discountValue": 20,
  "redemptionDuration": 15,
  "status": "Active"
}
```

### সফল রেসপন্সের উদাহরণ (Success Response)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Offer updated successfully",
  "data": {
    "_id": "66743b2a2b0c950a48b56f89",
    "title": "Super Weekend 20% Discount",
    "photo": "uploads/images/offer-banner.jpg",
    "place": "66743a122b0c950a48b56f12",
    "description": "Get 20% off on all weekend rides!",
    "discountType": "Percentage",
    "discountValue": 20,
    "validFrom": "2026-06-21T00:00:00.000Z",
    "validUntil": "2026-06-23T23:59:59.000Z",
    "noExpiration": false,
    "maxRedemptions": 100,
    "redemptionRules": [
      "Only valid on weekends",
      "Cannot be combined with other offers"
    ],
    "buttonLabel": "Claim Weekend discount",
    "redemptionDuration": 15,
    "status": "Active",
    "redemptionsCount": 0,
    "createdAt": "2026-06-20T16:50:00.000Z",
    "updatedAt": "2026-06-20T16:55:00.000Z"
  }
}
```

### ভুল বা অবৈধ ডাটা সাবমিট করলে এরর রেসপন্স (Validation/Conflict Errors)

#### ১. যদি একই প্লেসে অলরেডি একটি অ্যাক্টিভ অফার থাকে:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "An active offer already exists for this place or business",
  "errorMessages": [
    {
      "path": "",
      "message": "An active offer already exists for this place or business"
    }
  ]
}
```

#### ২. পার্সেন্টেজ ডিসকাউন্টে ১০০-এর বেশি ভ্যালু দিলে (Zod Validation Failure):
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "discountValue",
      "message": "Percentage discount must be between 1 and 100"
    }
  ]
}
```

#### ৩. যদি ভুল বা অস্তিত্বহীন অফার আইডি (Offer ID) দিয়ে রিকোয়েস্ট করা হয়:
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Offer not found",
  "errorMessages": [
    {
      "path": "",
      "message": "Offer not found"
    }
  ]
}
```

---

## 6. Frontend Integration Notes (ফ্রন্টএন্ড টিমদের জন্য বিশেষ টিপস)

ইমেজ (ছবি) সহ অফার আপডেট করার সময় অনেকেই শুধু ইমেজটি আপডেট করতে সমস্যায় পড়েন অথবা অন্যান্য টাইপ-ভিত্তিক ডাটা ফিল্ডগুলোতে (যেমন: `Number`, `Boolean`, `Array`) ভ্যালিডেশন এরর পেয়ে থাকেন। এর মূল কারণ হলো `multipart/form-data` দিয়ে সাধারণ টেক্সট ফিল্ড পাঠালে ব্যাকএন্ড সেগুলো সরাসরি `String` হিসেবে পায়।

এই সমস্যা এড়াতে এবং সঠিকভাবে ইমেজ ও ডাটা আপডেট করতে নিচের নিয়মটি অনুসরণ করুন:

### ১. FormData ফরম্যাট (Structure)
রিকোয়েস্ট পাঠানোর সময় অবশ্যই **`multipart/form-data`** ব্যবহার করতে হবে এবং ডাটা স্ট্রাকচারটি হতে হবে নিম্নরূপ:
- **`data` (Key):** অফারের সমস্ত টেক্সট, নাম্বার, বুলিয়ান বা অ্যারে ফিল্ডগুলোকে একটি JSON অবজেক্ট হিসেবে সাজিয়ে, সেটিকে `JSON.stringify()` করে এই কি-তে যুক্ত করতে হবে। (এর ফলে ব্যাকএন্ড সব ডাটার সঠিক টাইপ যেমন- `Number`, `Boolean` ধরে রাখতে পারে)।
- **`images` (Key):** নতুন অফার ইমেজ/ফাইলটি এই কি-তে যুক্ত করতে হবে।

> [!CAUTION]
> ফর্ম ডাটায় ছবির কি (Key) অবশ্যই **`images`** হতে হবে। অন্য কোনো কি (যেমন- `photo`, `image`) ব্যবহার করলে ব্যাকএন্ডের ফাইল প্রসেসর ইমেজটি ধরতে পারবে না এবং ইমেজ আপডেট হবে না।

---

### ২. JavaScript / React / Next.js কোড এক্সাম্পল (Fetch API)

নিচের কোডটি দেখে আপনার ফ্রন্টএন্ড ইন্টিগ্রেশন সাজিয়ে নিন:

```javascript
const updateOfferWithImage = async (offerId, updatedFields, imageFile) => {
  try {
    const formData = new FormData();

    // ১. টেক্সট, নাম্বার, বুলিয়ান ও অ্যারে ফিল্ডগুলোকে 'data' কী-তে JSON stringify করে যুক্ত করুন
    const offerData = {
      title: updatedFields.title,
      description: updatedFields.description,
      discountType: updatedFields.discountType,
      discountValue: Number(updatedFields.discountValue), // Number টাইপ নিশ্চিত করুন
      noExpiration: Boolean(updatedFields.noExpiration),  // Boolean টাইপ নিশ্চিত করুন
      redemptionDuration: Number(updatedFields.redemptionDuration), // Number
      status: updatedFields.status, // "Active" / "Expired" / "Paused"
      // ... অন্য যেকোনো প্রয়োজনীয় ফিল্ড
    };
    
    formData.append('data', JSON.stringify(offerData));

    // ২. যদি নতুন ইমেজ থাকে, তাহলে সেটি 'images' কী-তে যুক্ত করুন
    if (imageFile) {
      formData.append('images', imageFile);
    }

    // ৩. API রিকোয়েস্ট পাঠানো
    const response = await fetch(`/api/v1/offer/${offerId}`, {
      method: 'PATCH',
      headers: {
        // টোকেন যুক্ত করুন
        'Authorization': `Bearer ${accessToken}`,
        // সতর্কতা: Fetch ব্যবহার করার সময় 'Content-Type' হেডার ম্যানুয়ালি সেট করবেন না! 
        // ব্রাউজার নিজেই বাউন্ডারিসহ সঠিক Content-Type সেট করে নিবে।
      },
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log('Offer updated successfully:', result.data);
      // সফল আপডেটের পরবর্তী কাজ করুন
    } else {
      console.error('Update failed:', result.message, result.errorMessages);
    }
  } catch (error) {
    console.error('Error updating offer:', error);
  }
};
```

### ৩. Axios ব্যবহার করে রিকোয়েস্ট পাঠানোর উদাহরণ
আপনি যদি Axios ব্যবহার করেন, তবে রিকোয়েস্টটি এভাবে পাঠাবেন:

```javascript
import axios from 'axios';

const updateOfferWithAxios = async (offerId, offerData, imageFile) => {
  const formData = new FormData();
  
  formData.append('data', JSON.stringify(offerData));
  if (imageFile) {
    formData.append('images', imageFile);
  }

  const response = await axios.patch(`/api/v1/offer/${offerId}`, formData, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'multipart/form-data', // Axios এর ক্ষেত্রে এটি দেওয়া নিরাপদ
    },
  });
  return response.data;
};
```

---

### ৪. Redux Toolkit (RTK Query) দিয়ে রিকোয়েস্ট পাঠানোর উদাহরণ

আপনার Next.js + Redux অ্যাপে যদি **RTK Query** সেটআপ করা থাকে, তবে নিচে দেওয়া নিয়মে API Slice এবং Component-এ রিকোয়েস্ট হ্যান্ডেল করুন:

#### ক. RTK Query API Slice তৈরি করা:
```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const offerApi = createApi({
  reducerPath: 'offerApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token'); // অথবা আপনার রেডক্স স্টেট থেকে টোকেন নিন
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      // সতর্কতা: এখানে 'Content-Type' হেডার সেট করবেন না। 
      // RTK Query বডিতে FormData অবজেক্ট দেখলে অটোমেটিক সঠিক multipart boundary সেট করে নেয়।
      return headers;
    },
  }),
  endpoints: (builder) => ({
    updateOffer: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/offer/${id}`,
        method: 'PATCH',
        body: formData, // FormData সরাসরি বডিতে পাস করতে হবে
      }),
    }),
  }),
});

export const { useUpdateOfferMutation } = offerApi;
```

#### খ. React / Next.js Component থেকে কল করার উদাহরণ:
```tsx
import React, { useState } from 'react';
import { useUpdateOfferMutation } from '@/redux/api/offerApi';

const EditOfferComponent = ({ offerId }) => {
  const [updateOffer, { isLoading }] = useUpdateOfferMutation();
  const [title, setTitle] = useState('');
  const [imageFile, setImageFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    // ১. টেক্সট ও নাম্বার ফিল্ডগুলোকে 'data' কী-তে JSON stringify করুন
    const offerData = {
      title: title,
      // অন্যান্য ডাটা ফিল্ড
    };
    formData.append('data', JSON.stringify(offerData));

    // ২. ইমেজ ফাইলটি 'images' কী-তে ফর্ম ডাটায় অ্যাপেন্ড করুন
    if (imageFile) {
      formData.append('images', imageFile);
    }

    try {
      // ৩. RTK Mutation কল করুন
      const response = await updateOffer({ id: offerId, formData }).unwrap();
      
      if (response.success) {
        alert('অফার সফলভাবে আপডেট হয়েছে!');
      }
    } catch (error) {
      console.error('আপডেট করতে ব্যর্থ হয়েছে:', error);
      alert('এরর: ' + (error?.data?.message || 'কিছু ভুল হয়েছে'));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
        placeholder="Offer Title"
      />
      <input 
        type="file" 
        onChange={(e) => setImageFile(e.target.files[0])} 
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Updating...' : 'Update Offer'}
      </button>
    </form>
  );
};

export default EditOfferComponent;
```

---

## 7. Troubleshooting: ইমেজ আপডেট না হওয়ার কারণ ও সমাধান (Backend Zod Schema Bug)

যদি আপনার ফ্রন্টএন্ডে সবকিছু সঠিক সেটআপ করা থাকা সত্ত্বেও ইমেজ (ছবি) আপডেট না হয় এবং ডাটাবেজে পুরনো ইমেজটিই থেকে যায়, তবে এর প্রধান কারণ হলো **Backend-এর Zod Validation Schema-র একটি বাগ**।

### সমস্যার মূল কারণ (The Root Cause):
১. রিকোয়েস্টটি প্রথমে ফাইল প্রসেসর মিডলওয়্যার (`fileAndBodyProcessorUsingDiskStorage`) দিয়ে যায়, যা ইমেজ ফাইলটি প্রসেস করে `req.body.images` হিসেবে যুক্ত করে।
২. এরপর রিকোয়েস্টটি Zod ভ্যালিডেশন মিডলওয়্যার (`validateRequest`) দিয়ে যায়।
৩. প্রজেক্টের Zod ভ্যালিডেশন স্কিমাতে (`updateOfferZodSchema`) ছবির কি **`images`** ফিল্ডটি ডিফাইন করা নেই।
৪. Zod ডিফল্ট আচরণ অনুযায়ী স্কিমাতে ডিফাইন না করা যেকোনো অতিরিক্ত ফিল্ড (যেমন- `images`) রিকোয়েস্ট বডি থেকে **ছেঁটে ফেলে (Strips out)**।
৫. এর ফলে কন্ট্রোলারে পৌঁছানোর আগেই `req.body.images` সম্পূর্ণ ভ্যানিশ বা `undefined` হয়ে যায়। তাই কন্ট্রোলারের `if (images)` কন্ডিশনটি সত্য হয় না এবং ইমেজ আপডেট হয় না।

---

### সমাধানের উপায় (How to Fix):

আপনার ব্যাকএন্ড কোডের `src/modules/offer/offer.validation.ts` ফাইলে Zod স্কিমাগুলোতে `images` ফিল্ডটি যুক্ত করে দিতে হবে।

#### [MODIFY] `src/modules/offer/offer.validation.ts` ফাইলে পরিবর্তনসমূহ:

`createOfferZodSchema` এবং `updateOfferZodSchema` উভয় স্কিমাতেই `images` ফিল্ডটি নিম্নরূপভাবে যুক্ত করুন:

```diff
// createOfferZodSchema এর ভেতর:
export const createOfferZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    photo: z.string().optional(),
+   images: z.any().optional(), // এই লাইনটি যোগ করুন যাতে Zod ইমেজ ফাইলটিকে রিকোয়েস্ট বডি থেকে মুছে না ফেলে
    place: z.string().optional(),
    business: z.string().optional(),
    description: z.string({ required_error: 'Description is required' }),
...
```

```diff
// updateOfferZodSchema এর ভেতর:
export const updateOfferZodSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Offer ID is required' }),
  }),
  body: z.object({
    title: z.string().optional(),
    photo: z.string().optional(),
+   images: z.any().optional(), // এই লাইনটি যোগ করুন
    place: z.string().optional(),
    business: z.string().optional(),
    description: z.string().optional(),
...
```

এই পরিবর্তনটি করার পর ব্যাকএন্ড পুনরায় চালু (Restart) করলে ইমেজ আপলোড ও আপডেট হওয়া শতভাগ কাজ করা শুরু করবে।



