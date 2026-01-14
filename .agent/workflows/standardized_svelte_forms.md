---
description: How to build standardized Svelte forms using the remote form library pattern
---

# Standardized Svelte Forms Workflow

This workflow describes the required pattern for creating and refactoring forms to ensure compatibility with the `svelte-kit-remote-form` library (used in `EventForm` and `ContactForm`).

## 1. Remote Function Setup (Server)

In your `create.remote.ts` or `update.remote.ts`:
-   ALWAYS import `form` from `$app/server`.
-   ALWAYS explicit authentication check: `ensureAccess(getAuthenticatedUser(), 'feature')`.
-   Use `try/catch` for the entire body.
-   Return `{ success: true, id: ... }` on success.
-   Return `{ success: false, error: { message: string } }` on failure.

## 2. Form Component Setup (Client)

In your `Form.svelte`:
-   Receive `remoteFunction` and `schema` as props.
-   Helper `getField` to traverse the fields object.

### Submission Handler
Use the `.preflight(...).enhance(...)` pattern:

```svelte
<form
    {...remoteFunction
        ?.preflight?.(schema)
        .enhance(async ({ submit }: any) => {
            try {
                const result: any = await submit();
                if (result?.success === false || result?.error) {
                    toast.error(result?.error?.message || result?.error || "Error");
                    return;
                }
                toast.success("Saved!");
                // Navigation or callback
            } catch (e: any) {
                toast.error(e?.message || "Error");
            }
        }) || remoteFunction}
>
```

### Input Field Syntax
-   **DO NOT** mix traditional attributes (`type`, `id`, `name`) with spread attributes if `.as()` handles them.
-   **USE** `{...getField("path.to.field").as("type")}`.
-   **Avoid** `bind:value` if the library manages state, OR ensure no conflict.
-   **Avoid** `bind:checked` with spread attributes (lint error). Use `checked={val}` and `onchange={handler}`.

#### Correct Example:
```svelte
<!-- Text Input -->
<input
    {...getField("summary").as("text")}
    bind:value={localState} 
    class="..."
/>

<!-- Checkbox -->
<input
    {...getField("isPublic").as("checkbox")}
    checked={localState}
    onchange={(e) => localState = e.currentTarget.checked}
    class="..."
/>
```

#### Incorrect Example:
```svelte
<input
    type="text" 
    id="summary" 
    {...getField("summary")} 
    bind:value={someState}
/>
```

## 4. Field Validation

To handle validation errors (client-side feedback):

1.  **Trigger**: Add `onblur={() => remoteFunction.validate()}` to inputs.
2.  **Style**: Check `getField("name").issues()` to apply error classes (e.g., border color).
3.  **Display**: Iterate over issues to show error messages.

### Example:
```svelte
<label class="block">
    <span class="text-sm">Name</span>
    <input
        {...getField("name").as("text")}
        class="w-full border rounded-md {(getField('name').issues()?.length ?? 0) > 0 ? 'border-red-500' : 'border-gray-300'}"
        onblur={() => remoteFunction.validate()}
    />
    {#each getField("name").issues() ?? [] as issue}
        <p class="text-sm text-red-600">{issue.message}</p>
    {/each}
</label>
```

## 5. JSON Fields
For complex data (arrays, objects):
-   Maintain local state (e.g. `items = [...]`).
-   Use `$derived(JSON.stringify(items))` to create a stringified version.
-   Pass to hidden input:
    ```svelte
    <input
        {...getField("itemsJson").as("hidden", jsonValue)}
    />
    ```