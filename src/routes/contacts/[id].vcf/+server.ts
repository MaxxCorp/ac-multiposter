import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import ICAL from 'ical.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const contactId = params.id;

    const data = await db.query.contact.findFirst({
        where: (table, { eq }) => eq(table.id, contactId),
        with: {
            emails: true,
            phones: true,
            addresses: true
        }
    });

    if (!data) {
        throw error(404, 'Contact not found');
    }

    // vCard generation (logic copied from contacts.ts)
    const card = new ICAL.Component(['vcard', [], []]);
    card.addPropertyWithValue('version', '4.0');

    const fullName = data.displayName || `${data.givenName || ''} ${data.familyName || ''}`.trim();
    if (fullName) {
        card.addPropertyWithValue('fn', fullName);
    }

    card.addPropertyWithValue('n', [
        data.familyName || '',
        data.givenName || '',
        data.middleName || '',
        data.honorificPrefix || '',
        data.honorificSuffix || ''
    ]);

    data.emails?.forEach(e => {
        const prop = card.addPropertyWithValue('email', e.value);
        if (e.type) prop.setParameter('type', e.type.toLowerCase());
    });

    data.phones?.forEach(p => {
        const prop = card.addPropertyWithValue('tel', p.value);
        if (p.type) prop.setParameter('type', p.type.toLowerCase());
    });

    data.addresses?.forEach(a => {
        const adrValue = [
            '', // po box
            a.addressSuffix || '',
            `${a.street || ''} ${a.houseNumber || ''}`.trim(),
            a.city || '',
            a.state || '',
            a.zip || '',
            a.country || ''
        ];
        const prop = card.addPropertyWithValue('adr', adrValue);
        if (a.type) prop.setParameter('type', a.type.toLowerCase());
    });

    if (data.notes) {
        card.addPropertyWithValue('note', data.notes);
    }

    return new Response(card.toString(), {
        headers: {
            'Content-Type': 'text/vcard',
            'Content-Disposition': `attachment; filename="${fullName.replace(/\s+/g, '_')}.vcf"`
        }
    });
};
