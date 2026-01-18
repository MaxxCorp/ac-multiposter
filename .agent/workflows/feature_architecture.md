---
description: Architecture overview and standard pattern for building full-stack features (Routes, Forms, DB, Auth)
---

# Feature Architecture & Implementation Pattern

This document outlines the standard architectural pattern for implementing a major feature (e.g., `events`, `contacts`, `campaigns`) in this codebase.

## 1. Directory Structure (Routes)

Features follow a resource-based routing pattern under `src/routes/[feature_plural]`:

```text
src/routes/[feature_plural]/
├── +page.svelte                 # List View (Index)
├── list.remote.ts               # Server: Fetch all items
├── new/
│   ├── +page.svelte             # Create View (wraps shared Form)
│   └── create.remote.ts         # Server: Handle Creation
└── [id]/
    ├── +page.svelte             # Edit View (wraps shared Form)
    ├── view/
    │   └── +page.svelte         # Read-Only View (Details)
    ├── update.remote.ts         # Server: Handle Updates
    ├── delete.remote.ts         # Server: Handle Deletion
    └── read.remote.ts           # Server: Fetch single item details
```

## 2. Shared Components

Shared UI logic resides in `src/lib/components/[feature_plural]/`.

-   **`[Feature]Form.svelte`**: A single form component used for both Create and Update.
    -   **Props**:
        -   `remoteFunction`: The `create` or `update` remote function object.
        -   `validationSchema`: The Valibot schema.
        -   `initialData`: (Optional) Data object for "Edit" mode.
        -   `isUpdating`: Boolean flag to toggle UI (e.g., "Create" vs "Save" button text).
    -   **Behavior**:
        -   Uses the standardized form workflow (see `standardized_svelte_forms.md`).
        -   Handles validation display and submission feedback.

## 3. Data & Validation Schemas

### Drizzle ORM (Database)
Define the table schema in `src/lib/server/db/schema/[feature_singular].ts`.
-   Export the table definition.
-   Define relations (if any).
-   Export Type Inference helpers (`Select[Feature]`, `Insert[Feature]`).

### Valibot (Frontend and Backend Validation)
Define validation schemas in `src/lib/validations/[feature_plural].ts`.
-   **Base Schema**: Common fields.
-   **Create Schema**: `baseSchema` + required fields.
-   **Update Schema**: `baseSchema` + `id` field.
-   **JSON Parsing**: If the form sends JSON strings (for arrays/objects), the schema must handle or transforming them.

## 4. Authorization Handling

**ALL** remote functions (`create`, `update`, `delete`, `read`, `list`) must implement explicit authorization checks.

```typescript
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';

export const someRemoteAction = form(schema, async (input) => {
    // 1. Authenticate
    const user = getAuthenticatedUser();
    
    // 2. Authorize
    ensureAccess(user, 'feature_name'); // e.g., 'events', 'contacts'
    
    // 3. Logic...
});
```

## 5. Implementation Workflow

1.  **Define Schema**: Create Drizzle table and Valibot validation schemas.
2.  **Server Logic**: Implement `create.remote.ts`, `update.remote.ts`, etc., with Auth and Error handling.
3.  **Shared Form**: Build `[Feature]Form.svelte` connecting to the schema and handling UI.
4.  **Route Pages**:
    -   `new/+page.svelte`: Import `create` remote and pass to Form.
    -   `[id]/+page.svelte`: Import `update` remote, fetch data via `read` remote (in load or effect), and pass to Form.
    -   `[id]/+page.svelte`: Import `update` remote, fetch data via `read` remote (in load or effect), and pass to Form.
    -   `[id]/view/+page.svelte`: Fetch data via `read` remote and display read-only UI.
5.  **Register Feature**: Add the feature to the system configuration (see Section 6).

## 6. Feature Registration (UI & Auth)

To ensure the feature is accessible and secured:

1.  **Authorization Type**:
    -   Add the feature key (e.g., `'announcements'`) to the `Feature` usage type in `src/lib/authorization.ts`.

2.  **Home Page Tile & Navigation**:
    -   Add an entry to `FEATURES` in `src/lib/features.ts`.
    -   Configure the tile's title, description, icon, and color theme.
    -   If a new icon is needed, add it to `src/lib/icons.ts`.