import { query } from '$app/server';
import { getContent } from '$lib/server/cms/operations';
import { getRequestEvent } from '$app/server';
import { readContentSchema } from '$lib/validations/cms';

export const readContent = query(readContentSchema, async (params) => {
    console.log('[read.remote] Called with params:', params);

    // If params.language is provided, we use it directly and skip header parsing fallback
    let lang = params.language;
    const branch = params.branch || 'published';

    if (!lang) {
        const event = getRequestEvent();
        if (event) {
            const acceptLanguage = event.request.headers.get('accept-language');
            if (acceptLanguage) {
                // Parsing based on Paraglide's logic (or simple q-value sort)
                const languages = acceptLanguage
                    .split(",")
                    .map((lang) => {
                        const [tag, qStr] = lang.trim().split(";q=");
                        const q = qStr ? parseFloat(qStr) : 1.0;
                        return { tag, q };
                    })
                    .sort((a, b) => b.q - a.q);

                // Find first supported language
                const supported = ['en', 'de'];
                for (const l of languages) {
                    const baseLang = l.tag.split('-')[0];
                    if (supported.includes(baseLang)) {
                        lang = baseLang;
                        break;
                    }
                }
            }
        }
    }

    console.log(`[read.remote] Resolved lang: ${lang || 'en'}, branch: ${branch}`);

    try {
        const result = await getContent('imprint', 'main', lang || 'en', branch);
        console.log('[read.remote] Result block:', result?.block?.name);
        return result;
    } catch (e) {
        console.error('[read.remote] Error:', e);
        throw e;
    }
});
