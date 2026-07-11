# User Role Management & Update Guide

This guide is primarily intended for the Frontend Team (Next.js/Dashboard) to help them easily integrate the Backend's User Role Update and Listing APIs into the Admin Dashboard.

## Overview
Two main API endpoints are used to view the user list and change a user's role (e.g., promoting a regular user to Admin or Map Editor) in the Admin Dashboard.

**Base API URL Prefix (Assuming):** `/api/v1/user`

---

## 1. Get All Users
This API is used to display a list of all users in the Admin Dashboard. It supports pagination, searching, and filtering.

- **Endpoint:** `GET /user`
- **Headers:** `Authorization: Bearer <admin_or_super_admin_token>`
- **Query Parameters:**
  - `page` (optional, default: 1) - Which page number to view.
  - `limit` (optional, default: 10) - How many records per page.
  - `searchTerm` (optional) - To search by name or email.
  - `role` (optional) - To filter users by a specific role (`admin`, `user`, `map_editor`, `super_admin`).
  - `status` (optional) - To filter users by status (`active`, `inactive`, `deleted`).
    - **Important:** By default (if the `status` query parameter is not sent), deleted (`deleted`) users will NOT appear in this list.
    - If you want to see deleted users, you must explicitly send `status=deleted` as a query parameter (e.g., `GET /user?status=deleted`).

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
1. **Table View & Pagination:** Use a table library for Next.js or React (e.g., shadcn/ui table) to display the user list. Set up pagination using `totalPages` and `total` from the `meta` object.
2. **Search Debounce:** When integrating a search bar, use a 300ms–500ms debounce logic before sending the `searchTerm` query parameter, so an API call isn't made on every keystroke.
3. **Show Deleted Users Toggle:** You can add a filter dropdown or tab on the dashboard (e.g., "Active", "Inactive", "Deleted"). When the "Deleted" tab or filter is selected, pass `status=deleted` in the API query to render deleted users in a separate list.

---

## 2. Update User Role
Use this API endpoint to change the role of a user from the user list (e.g., from `user` to `map_editor` or `admin`).

- **Endpoint:** `PATCH /user/update-role/:userId`
- **Headers:**
  - `Authorization: Bearer <admin_or_super_admin_token>`
  - `Content-Type: application/json`
- **Path Parameters:**
  - `userId` - The `_id` of the user whose role you want to update.
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
1. **Role Select Dropdown:** You can place a select dropdown (Select Dropdown/Popover) next to each user's role in the table.
2. **Confirmation Dialog:** To prevent accidental role changes on the dashboard, it's good practice to show a Confirmation Modal after selecting from the dropdown: *"Are you sure you want to change this user's role to Admin?"*
3. **API Mutation & Refetch:** Send this `PATCH` request after the user confirms. Once you receive a successful response, show a Toast message (e.g., "User role updated successfully") and refetch the user data so the updated role appears in the table.
4. **Disabled State:** To prevent an admin from changing their own role from the dashboard, disable the role edit option when the logged-in user's ID matches the ID of the user in the table.

---

## 🛠 Available User Roles
Enums defined in the backend for user roles:

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
You can use the following interfaces for integration and type safety in your Next.js project:

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
