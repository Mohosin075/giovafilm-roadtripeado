# Award System Integration Guide

This guide is primarily intended for the Frontend Team (Next.js) to help them easily integrate the Backend Award System into the application.

## Overview
The Backend has 2 main API endpoints for the Award System. One allows a user to view the status (locked/unlocked/progress) of all their awards, and the other allows them to redeem the 'Free Map' award.

**Base API URL Prefix (Assuming):** `/api/v1/awards` (This may be `/awards` or something else depending on your project's global route setup).

---

## 1. Get My Awards
Calling this API will return a list of all awards for the logged-in user. Each award will include its current `progress`, `target` points, and `isUnlocked` status.

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
1. **Data Fetching:** You can fetch data at page load using React Query (TanStack Query), SWR, or Next.js App Router's Server Component (fetch API).
2. **UI Rendering:**
   - Loop (map) through the `data` array to display awards as nice cards.
   - If `isUnlocked: true`, show an unlocked style/icon; if `false`, show a locked style/icon.
   - To display a Progress Bar, use the formula: `(progress / target) * 100`%.

---

## 2. Redeem Free Map
When a user's 'Free Map' award is unlocked (`isUnlocked: true`), they can claim any one map for free. The `mapId` of the desired map must be sent in the body of this API request.

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
1. **Button Logic:** On the Map details page or Checkout page, you can add a button labeled "Redeem for Free" or "Redeem Free Map".
2. **Conditions:** Before showing the button, check:
   - Whether the user's `Free Map` award is unlocked.
   - Whether the user has already redeemed a map (check the `redeemedFreeMap` field in the user's data).
3. **API Call & State Update:** Send a POST request when the button is clicked.
   - If the response has `success: true`, show a Toast message saying "Map Redeemed Successfully".
   - Update the `purchasedMaps` state and redirect the user to a confirmation page.
4. **Error Handling:** If the user has already redeemed or doesn't have enough points, the server may return a `400 Bad Request`. In that case, show the error message in a Toast.

---

## 🛠 TypeScript Interfaces
You can use the following interfaces for type safety in your Next.js project:

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
