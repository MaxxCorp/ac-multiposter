import * as v from 'valibot';

/**
 * Validates block creation
 */
export const createBlockSchema = v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Block name is required')),
    description: v.optional(v.string()),
});

/**
 * Validates linking a block to a slot
 */
export const linkBlockSchema = v.object({
    blockId: v.pipe(v.string(), v.uuid('Invalid block ID')),
});

/**
 * Validates updating content (creating a version)
 */
export const updateContentSchema = v.object({
    blockId: v.pipe(v.string(), v.uuid('Invalid block ID')),
    language: v.pipe(v.string(), v.minLength(2, 'Language code required')),
    branch: v.pipe(v.string(), v.picklist(['draft', 'published'], 'Invalid branch')),
    content: v.string('Content must be a string'), // Storing HTML string
});

/**
 * Validates deleting a block
 */
export const deleteBlockSchema = v.object({
    blockId: v.pipe(v.string(), v.uuid('Invalid block ID')),
});

/**
 * Validates renaming a block
 */
export const renameBlockSchema = v.object({
    blockId: v.pipe(v.string(), v.uuid('Invalid block ID')),
    newName: v.pipe(v.string(), v.minLength(1, 'Block name is required')),
});

/**
 * Validates reading content
 */
export const readContentSchema = v.object({
    language: v.optional(v.string()),
    branch: v.optional(v.string()),
});

/**
 * Validates image upload via base64
 */
export const uploadImageSchema = v.object({
    filename: v.string(),
    contentType: v.string(),
    content: v.string(), // Base64 string
});
