# Business Approval (Status Update) Guide

Use this single API endpoint to Approve or Reject any business from the Admin Panel.

**Base API URL:** `/api/v1/business/:id/status`

---

## API Request Details

* **Method:** `PATCH`
* **URL:** `/api/v1/business/:id/status`
* **Headers:**
  ```http
  Authorization: Bearer <admin_or_super_admin_token>
  Content-Type: application/json
  ```
* **Path Parameters:**
  * `id` - The ID of the business whose status you want to update (e.g. `6674b834fc12ba001af1b5e2`).

* **Request Body:**
  ```json
  {
    "status": "Approved", // Allowed values: 'Pending' | 'Approved' | 'Rejected'
    "isAccuracyVerified": true // (Optional) boolean value
  }
  ```

---

## Response Examples

### 1. Success Response (Approve / Reject)
**Status Code:** `200 OK`
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Business status updated to Approved successfully",
  "data": {
    "_id": "6674b834fc12ba001af1b5e2",
    "name": "La Parrilla San Juan",
    "status": "Approved",
    "isAccuracyVerified": true,
    "createdAt": "2026-06-20T23:15:32.124Z",
    "updatedAt": "2026-06-21T03:10:00.000Z"
  }
}
```

### 2. Error Response (Unauthorized)
**Status Code:** `401 Unauthorized` / `403 Forbidden`
```json
{
  "success": false,
  "message": "You are not authorized"
}
```

---

## TypeScript Interfaces (Next.js)

```typescript
export type BusinessStatus = 'Pending' | 'Approved' | 'Rejected';

export interface IUpdateBusinessStatusPayload {
  status: BusinessStatus;
  isAccuracyVerified?: boolean;
}
```
