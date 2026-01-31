<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import "ckeditor5/ckeditor5.css";
    // Type-only import safe for SSR
    import type { ClassicEditor } from "ckeditor5";

    let { value = $bindable(), disabled = false } = $props();

    let editorElement: HTMLElement;
    let editorInstance = $state<ClassicEditor | null>(null);
    let isMounted = $state(false);
    let errorMsg = $state("");

    import { uploadMedia } from "../../../routes/cms/media/create.remote";

    onMount(async () => {
        isMounted = true;

        // Dynamic import to avoid SSR issues
        let CKEditorModule;
        try {
            CKEditorModule = await import("ckeditor5");
        } catch (e: any) {
            console.error("Failed to load CKEditor module:", e);
            errorMsg = "Failed to load CKEditor library: " + e.message;
            return;
        }

        const {
            ClassicEditor,
            Essentials,
            Paragraph,
            Bold,
            Italic,
            Heading,
            List,
            Link,
            Table,
            TableToolbar,
            SourceEditing,
            Image,
            ImageUpload,
            ImageToolbar,
            ImageCaption,
            ImageStyle,
            ImageResize,
            LinkImage,
            FileRepository, // Ensure FileRepository is available if needed, though usually core
        } = CKEditorModule;

        if (!editorElement) {
            errorMsg = "Editor element not found";
            return;
        }

        // Custom Upload Adapter Plugin
        function UploadAdapterPlugin(editor: any) {
            editor.plugins.get("FileRepository").createUploadAdapter = (
                loader: any,
            ) => {
                return {
                    upload: async () => {
                        try {
                            const file = await loader.file;

                            return new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.readAsDataURL(file);
                                reader.onload = async () => {
                                    try {
                                        const result = await (
                                            uploadMedia as any
                                        )({
                                            filename: file.name,
                                            contentType: file.type,
                                            content: reader.result as string,
                                        });

                                        if (result.success && result.urls) {
                                            resolve({
                                                default: result.urls.default,
                                            });
                                        } else {
                                            reject(
                                                result.error?.message ||
                                                    result.error ||
                                                    "Upload failed",
                                            );
                                        }
                                    } catch (err) {
                                        reject(err);
                                    }
                                };
                                reader.onerror = (err) => reject(err);
                            });
                        } catch (error: any) {
                            console.error("Upload error:", error);
                            throw error;
                        }
                    },
                };
            };
        }

        try {
            console.log("Initializing CKEditor...");

            editorInstance = await ClassicEditor.create(editorElement, {
                licenseKey: "GPL",
                plugins: [
                    Essentials,
                    Paragraph,
                    Bold,
                    Italic,
                    Heading,
                    List,
                    Link,
                    Table,
                    TableToolbar,
                    SourceEditing,
                    Image,
                    ImageUpload,
                    ImageToolbar,
                    ImageCaption,
                    ImageStyle,
                    ImageResize,
                    LinkImage,
                ],
                extraPlugins: [UploadAdapterPlugin],
                toolbar: [
                    "undo",
                    "redo",
                    "|",
                    "heading",
                    "|",
                    "bold",
                    "italic",
                    "|",
                    "link",
                    "uploadImage", // Add uploadImage button
                    "insertTable",
                    "|",
                    "bulletedList",
                    "numberedList",
                    "|",
                    "sourceEditing",
                ],
                image: {
                    toolbar: [
                        "imageStyle:inline",
                        "imageStyle:block",
                        "imageStyle:side",
                        "|",
                        "toggleImageCaption",
                        "imageTextAlternative",
                    ],
                },
                initialData: value,
            });
            console.log("CKEditor initialized");

            if (disabled) {
                editorInstance.enableReadOnlyMode("disabled_prop");
            }

            // Bind change event
            editorInstance.model.document.on("change:data", () => {
                const data = editorInstance?.getData();
                if (data !== value) {
                    value = data;
                }
            });
        } catch (error: any) {
            console.error("Failed to initialize CKEditor:", error);
            errorMsg = error.message || String(error);
        }
    });

    $effect(() => {
        if (editorInstance && value !== editorInstance.getData()) {
            editorInstance.setData(value || "");
        }
    });

    $effect(() => {
        if (editorInstance) {
            if (disabled) {
                editorInstance.enableReadOnlyMode("disabled_prop");
            } else {
                editorInstance.disableReadOnlyMode("disabled_prop");
            }
        }
    });

    onDestroy(() => {
        editorInstance?.destroy();
    });
</script>

<div class="editor-container">
    {#if errorMsg}
        <div class="error-state">
            <p class="text-red-600 font-bold mb-1">Editor Error</p>
            <p class="text-xs text-red-500 font-mono text-center px-4">
                {errorMsg}
            </p>
        </div>
    {:else if !editorInstance}
        <div class="loading-state">Loading Editor...</div>
    {/if}
    <div bind:this={editorElement} class="ck-content"></div>
</div>

<style>
    .editor-container {
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        min-height: 300px;
        position: relative;
    }

    .loading-state,
    .error-state {
        padding: 1rem;
        color: #64748b;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #f8fafc;
        z-index: 10;
    }

    .error-state {
        background: #fef2f2;
        border: 1px solid #fecaca;
    }

    /* Reset some styles that might conflict */
    :global(.ck-editor__editable) {
        min-height: 300px;
    }

    :global(.ck.ck-editor__main > .ck-editor__editable:not(.ck-focused)) {
        border-color: transparent;
    }
</style>
