# Offer Update Integration Guide

This guide is primarily intended for the Frontend Team and Backend Developers to help them easily use and integrate the **Offer Update** API endpoint into the application.

---

## 1. Overview
A `PATCH` API is available in the Backend to modify or update the details of an existing offer (such as: title, description, discount type, validity, status, etc.). The offer's ID must be sent as a parameter, and the new details must be sent in the request body.

**Base API URL:** `/api/v1/offer/:id`

---

## 2. API Endpoint & Authentication

- **Endpoint:** `PATCH /api/v1/offer/:id` (where `:id` is the offer's MongoDB ObjectId)
- **Headers:**
  - `Authorization: Bearer <your_access_token>`
  - `Content-Type: application/json` or `multipart/form-data` (if uploading an image)
- **Allowed Roles:**
  - `ADMIN`
  - `SUPER_ADMIN`
  - `MAP_EDITOR`

> [!IMPORTANT]
> Only users with these three roles can update an offer. A regular `USER` calling this API will receive a `403 Forbidden` error.

---

## 3. Payload (Request Body) Fields

Since this is a `PATCH` request, all fields in the body are **Optional**. You only need to send the fields you want to change.

| Field | Type | Description | Validation / Default Value |
| :--- | :--- | :--- | :--- |
| `title` | `String` | The main title or name of the offer. | Optional |
| `description` | `String` | A detailed description of the offer. | Optional |
| `images` | `File / Array` | New image(s) for the offer. The form key must be `images`. | Saves the first image as `photo`. |
| `place` | `String (ObjectId)` | The ID of the specific place this offer applies to. | Optional |
| `business` | `String (ObjectId)` | The ID of the specific business this offer applies to. | Optional |
| `discountType` | `String (Enum)` | The type of discount. | Must be one of:<br>`Percentage`<br>`Flat`<br>`Free item`<br>`BOGO` |
| `discountValue` | `String / Number` | The amount or value of the discount. | - For `Percentage`: must be between **1 and 100**.<br>- For `Flat`: must be a **positive number**. |
| `validFrom` | `String (ISO Date)` | The date from which the offer becomes active. | ISO 8601 format (e.g., `2026-06-20T22:54:02.000Z`) |
| `validUntil` | `String (ISO Date)` | The expiry date of the offer. | ISO 8601 format or `null` |
| `noExpiration` | `Boolean` | Set to `true` if the offer has no expiry date. | Default: `false` |
| `maxRedemptions` | `Number` | The maximum total number of times this offer can be redeemed. | Optional |
| `redemptionRules` | `Array of Strings` | Rules for using the offer. | e.g., `["Single use only", "Valid on Sundays only"]` |
| `buttonLabel` | `String` | The text for the redeem button. | Default: `"Redeem Offer"` |
| `redemptionDuration` | `Number` | How many minutes the coupon remains valid after redemption. | In minutes (Default: `5` minutes) |
| `status` | `String (Enum)` | The current status of the offer. | Must be one of:<br>`Active`<br>`Expired`<br>`Paused` |
| `redemptionsCount` | `Number` | How many times the offer has been redeemed so far. | Must be a non-negative number. |

---

## 4. Business Logic & Validation Rules

The following business logic is strictly checked during updates:

### a. No Multiple Active Offers for the Same Place or Business
Only **one active (`Active`) offer** can exist at a time for a specific `Place` or `Business`.
- If an offer's status is set to `Active` and there is already another active offer for the associated place/business, the server will throw an error:
  > **Error Message:** `An active offer already exists for this place or business` (Status Code: `400 Bad Request`)

### b. Discount Value Validation (Zod)
If `discountType` and `discountValue` are updated in the request body, the following rules apply:
- **Percentage:** `discountValue` must be between `1` and `100` (e.g., `20` means a 20% discount).
- **Flat:** `discountValue` must be a positive number (`> 0`) (e.g., `15` means a $15 discount).

---

## 5. Example API Requests & Responses

### Example Request (JSON Payload)
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

### Example Success Response
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

### Error Responses for Invalid or Bad Data (Validation/Conflict Errors)

#### 1. If an active offer already exists for the same place:
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

#### 2. If a percentage discount value exceeds 100 (Zod Validation Failure):
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

#### 3. If a request is made with an incorrect or non-existent Offer ID:
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

## 6. Frontend Integration Notes

Many developers run into issues when updating an offer with an image — either having trouble updating just the image, or receiving validation errors on type-based data fields (such as `Number`, `Boolean`, `Array`). The root cause is that when sending plain text fields via `multipart/form-data`, the backend receives them as `String`.

To avoid this issue and correctly update images and data, follow the rules below:

### 1. FormData Format (Structure)
When sending the request, you must use **`multipart/form-data`** and the data structure must be as follows:
- **`data` (Key):** Organize all text, number, boolean, or array fields of the offer as a single JSON object, then `JSON.stringify()` it and attach it to this key. (This allows the backend to preserve the correct types like `Number` and `Boolean` for all data.)
- **`images` (Key):** Attach the new offer image/file to this key.

> [!CAUTION]
> The key for the image in the form data MUST be **`images`**. Using any other key (such as `photo` or `image`) will prevent the backend's file processor from detecting the image, and the image will not be updated.

---

### 2. JavaScript / React / Next.js Code Example (Fetch API)

Use the code below to structure your frontend integration:

```javascript
const updateOfferWithImage = async (offerId, updatedFields, imageFile) => {
  try {
    const formData = new FormData();

    // 1. Add text, number, boolean, and array fields to the 'data' key as a JSON string
    const offerData = {
      title: updatedFields.title,
      description: updatedFields.description,
      discountType: updatedFields.discountType,
      discountValue: Number(updatedFields.discountValue), // Ensure Number type
      noExpiration: Boolean(updatedFields.noExpiration),  // Ensure Boolean type
      redemptionDuration: Number(updatedFields.redemptionDuration), // Number
      status: updatedFields.status, // "Active" / "Expired" / "Paused"
      // ... any other required fields
    };
    
    formData.append('data', JSON.stringify(offerData));

    // 2. If there is a new image, add it to the 'images' key
    if (imageFile) {
      formData.append('images', imageFile);
    }

    // 3. Send the API request
    const response = await fetch(`/api/v1/offer/${offerId}`, {
      method: 'PATCH',
      headers: {
        // Add your token
        'Authorization': `Bearer ${accessToken}`,
        // Warning: Do NOT manually set the 'Content-Type' header when using Fetch!
        // The browser will automatically set the correct Content-Type with boundary.
      },
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log('Offer updated successfully:', result.data);
      // Perform post-update actions
    } else {
      console.error('Update failed:', result.message, result.errorMessages);
    }
  } catch (error) {
    console.error('Error updating offer:', error);
  }
};
```

### 3. Example Request Using Axios
If you are using Axios, send the request as follows:

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
      'Content-Type': 'multipart/form-data', // Safe to include with Axios
    },
  });
  return response.data;
};
```

---

### 4. Example Request Using Redux Toolkit (RTK Query)

If your Next.js + Redux app has **RTK Query** set up, handle the request in your API Slice and Component as shown below:

#### a. Create the RTK Query API Slice:
```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const offerApi = createApi({
  reducerPath: 'offerApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token'); // Or get token from your Redux state
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      // Warning: Do NOT set the 'Content-Type' header here.
      // RTK Query automatically sets the correct multipart boundary when it sees a FormData object in the body.
      return headers;
    },
  }),
  endpoints: (builder) => ({
    updateOffer: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/offer/${id}`,
        method: 'PATCH',
        body: formData, // Pass FormData directly in the body
      }),
    }),
  }),
});

export const { useUpdateOfferMutation } = offerApi;
```

#### b. Example call from a React / Next.js Component:
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

    // 1. JSON stringify text and number fields into the 'data' key
    const offerData = {
      title: title,
      // Other data fields
    };
    formData.append('data', JSON.stringify(offerData));

    // 2. Append the image file to the 'images' key in form data
    if (imageFile) {
      formData.append('images', imageFile);
    }

    try {
      // 3. Call the RTK Mutation
      const response = await updateOffer({ id: offerId, formData }).unwrap();
      
      if (response.success) {
        alert('Offer updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update:', error);
      alert('Error: ' + (error?.data?.message || 'Something went wrong'));
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

## 7. Troubleshooting: Image Not Updating (Backend Zod Schema Bug)

If your frontend is set up correctly but the image (photo) still doesn't update and the old image remains in the database, the primary cause is **a bug in the Backend's Zod Validation Schema**.

### The Root Cause:
1. The request first goes through the file processor middleware (`fileAndBodyProcessorUsingDiskStorage`), which processes the image file and attaches it as `req.body.images`.
2. The request then goes through the Zod validation middleware (`validateRequest`).
3. The `images` field/key is not defined in the project's Zod validation schema (`updateOfferZodSchema`).
4. By default Zod behavior, any extra fields not defined in the schema (such as `images`) are **stripped out** from the request body.
5. As a result, `req.body.images` becomes completely vanished or `undefined` before reaching the controller. So the `if (images)` condition in the controller is never true and the image is not updated.

---

### How to Fix:
You need to add the `images` field to the Zod schemas in the `src/modules/offer/offer.validation.ts` file of your backend code.

#### [MODIFY] Changes to `src/modules/offer/offer.validation.ts`:

Add the `images` field to both `createOfferZodSchema` and `updateOfferZodSchema` as follows:

```diff
// Inside createOfferZodSchema:
export const createOfferZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    photo: z.string().optional(),
+   images: z.any().optional(), // Add this line so Zod doesn't strip the image file from the request body
    place: z.string().optional(),
    business: z.string().optional(),
    description: z.string({ required_error: 'Description is required' }),
...
```

```diff
// Inside updateOfferZodSchema:
export const updateOfferZodSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Offer ID is required' }),
  }),
  body: z.object({
    title: z.string().optional(),
    photo: z.string().optional(),
+   images: z.any().optional(), // Add this line
    place: z.string().optional(),
    business: z.string().optional(),
    description: z.string().optional(),
...
```

After making this change, restarting the backend will make image uploading and updating work 100%.
