export interface BlobStorageProvider {
    /**
     * Upload an asset to the storage provider
     * @param path The relative path (key) for the asset
     * @param content Buffer or string content
     * @param contentType MIME type of the content
     * @returns The public URL of the uploaded asset
     */
    put(path: string, content: Buffer | string, contentType: string): Promise<string>;

    /**
     * Delete an asset from the storage provider
     * @param url The public URL of the asset to delete
     */
    delete(url: string): Promise<void>;
}
