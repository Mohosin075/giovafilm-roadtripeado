# Location Access Integration Guide (Website & Dashboard)

This guide documents the frontend changes required on the **Admin Dashboard** and the **Customer Website** to support the new location-level access control (`type: 'Business' | 'Regular'`).

---

## 1. Admin Dashboard Changes (Location Management Form)

Admins must be able to specify the location type when creating or editing a Location (Place). 

### UI/Form Updates:
Add a new dropdown or radio group field labeled **"Location Type"** directly in the Location (Place) Create and Edit forms.

- **Field Name:** `type`
- **Options:**
  - **Regular Location:** Sends `"Regular"` (default)
  - **Business:** Sends `"Business"`

### Payload Changes:

#### Create Location (`POST /api/places`)
Modify the request payload to include the `type` field:
```json
{
  "name": "La Parguera Jet Ski Rentals",
  "map": "65abcdef1234567890abcdef",
  "category": "65abcdef1234567890abcde2",
  "type": "Business", // "Business" or "Regular"
  "description": "Premium jet ski rental services in La Parguera.",
  "address": "La Parguera, Lajas",
  "location": {
    "type": "Point",
    "coordinates": [-67.015, 17.973]
  }
}
```

#### Edit Location (`PATCH /api/places/:id`)
Include the updated `type` field in the patch payload:
```json
{
  "type": "Regular"
}
```

---

## 2. Customer Website Changes (Map Page & Details)

Since the backend automatically filters out `"Regular"` locations from unpaid maps for guests and free users, the customer website will naturally receive only authorized pins.

### Map Rendering (Pins):
- **No changes needed for filtering:** The `GET /api/maps/:id` and `GET /api/places` endpoints will only return `"Business"` locations if the map is locked, and all locations if the map is purchased/free. The website can simply render all pins returned by the API.

### Place Details View (`GET /api/places/:id`):
If a user directly accesses a locked location URL (e.g., deep-linking or refreshing a place page) without purchasing the map, the API will respond with `403 Forbidden`.

- **Action Required:**
  - Detect HTTP Status `403` when fetching place details.
  - Show a user-friendly modal or block the view with a message prompting them to purchase the map.
  - **Example Message:** 
    > *"Unlock this Location! This spot is part of a premium map. Purchase the map to get access to all hidden viewpoints, waterfalls, and locations."*
  - Add a **"Purchase Map"** button linking to the checkout flow.

---

## 3. Backward Compatibility & Deployment Safety (No-Breakage Guarantee)

Since the frontend codebase is already integrated and live, we have designed the backend changes to be **fully backward-compatible**. This means deploying the backend will **NOT** break the current website or dashboard:

### 1. Existing Data is Preserved
- All existing places in the database do not have a `type` field.
- The Mongoose schema will automatically treat these places as `"Regular"`.
- Since `"Regular"` places are restricted until a map is purchased (which matches the existing paid map logic), **no old data will become exposed or corrupted**.

### 2. Frontend Form Submission is Safe
- The Zod validation schema has the `type` field marked as `.optional()`.
- If the current Admin Dashboard form sends payloads *without* the `type` field (before you update the frontend code), the backend will accept it and save it as `"Regular"`.
- **Recommendation:** You can deploy the backend code first. The Admin Panel will continue working normally. Then, you can update the dashboard form to add the "Location Type" dropdown at your convenience.

### 3. API Response Structure is Unchanged
- The payload format (keys, nested category, structure, pagination meta) returned by `GET /api/maps/:id`, `GET /api/places`, and `GET /api/maps/discovery` is **exactly identical** to before.
- The backend only performs filtering of values (i.e. removing locked items), not structural modifications.
- The website's current rendering logic will display pins and search results without any modification.

