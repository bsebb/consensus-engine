# REST API Contract

All endpoints expect and return `application/json`.
Base URL: `/api/v1`

---

## 🛑 Standard Error Responses
If the frontend sends bad data, the backend will return a 400 or 404 status code with this standard structure so the frontend knows exactly what went wrong.
```json
{
  "success": false,
  "error": "INVALID_PIN",
  "message": "The room PIN 4921 does not exist or voting has already closed."
}
```

---

## 1. Create Room
**Endpoint:** `POST /rooms`
**Description:** Initializes a new voting lobby.
**Request Body:**
```json
{
  "host_id": "uuid-string",
  "mode": "DISCOVERY", // or "CUSTOM"
  "theme": "restaurant", // only if DISCOVERY
  "radius": 5000 // only if DISCOVERY
}
```
**Response (201 Created):**
```json
{
  "room_id": "uuid-string",
  "pin": "4921",
  "status": "CONFIGURING"
}
```

---

## 2. Submit Step-Zero Constraints
**Endpoint:** `POST /rooms/:pin/constraints`
**Description:** Participants submit their anonymous budget limits.
**Request Body:**
```json
{
  "participant_id": "uuid-string",
  "max_price_level": 2 // 1 to 4
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Constraint locked."
}
```

---

## 3. Submit Custom Suggestions
**Endpoint:** `POST /rooms/:pin/suggestions`
**Description:** Participants submit strings for Custom Mode.
**Request Body:**
```json
{
  "participant_id": "uuid-string",
  "suggestion": "John's House"
}
```
**Response (200 OK):**
```json
{
  "success": true
}
```

---

## 4. Submit Batched Votes
**Endpoint:** `POST /rooms/:pin/votes`
**Description:** After swiping all cards, the client sends the final rankings.
**Request Body:**
```json
{
  "participant_id": "uuid-string",
  "rankings": [
    { "option_id": "uuid-1", "score": 1 },
    { "option_id": "uuid-2", "score": -1 },
    { "option_id": "uuid-3", "score": 0 }
  ]
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Votes recorded safely."
}
```

---

## 5. Submit Feedback (Post-Event)
**Endpoint:** `POST /rooms/:pin/feedback`
**Description:** Updates the proprietary analytics table.
**Request Body:**
```json
{
  "participant_id": "uuid-string",
  "option_id": "uuid-string",
  "satisfaction_score": 4,
  "price_accuracy_score": 3
}
```
**Response (200 OK):**
```json
{
  "success": true
}
```
