import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import { getStorageProvider } from '$lib/server/blob-storage';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { uploadImageSchema } from '$lib/validations/cms';

export const uploadMedia = command(uploadImageSchema, async (data) => {
    try {
        const user = getAuthenticatedUser();
        // Allow any authenticated user to upload
        if (!user) {
            error(401, 'Unauthorized');
        }

        const { filename, contentType, content } = data;

        // Generate a path
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const uuid = crypto.randomUUID();
        const path = `cms/images/${year}/${month}/${uuid}-${filename}`;

        // Convert base64 string to Buffer
        // content is expected to be data URI scheme or raw base64. 
        // If data URI (e.g. data:image/png;base64,...), split it.
        const base64Data = content.includes('base64,') ? content.split('base64,')[1] : content;
        const buffer = Buffer.from(base64Data, 'base64');

        const provider = getStorageProvider();
        const url = await provider.put(path, buffer, contentType);

        return {
            success: true,
            urls: {
                default: url
            }
        };
    } catch (err: any) {
        console.error('Upload failed:', err);
        return {
            success: false,
            error: err.message || 'Upload failed'
        };
    }
});
