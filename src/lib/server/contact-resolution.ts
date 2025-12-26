import { db } from './db';
import { getEntityContacts } from './contacts';
import type { ExternalEvent } from './sync/types';

/**
 * Contact resolution algorithm for sync providers
 * Resolves the primary contact for an event based on the following priority:
 * 1. First event contact tagged as "Employee"
 * 2. First location contact (if no Employee-tagged event contact exists)
 */
export async function resolveEventContact(event: ExternalEvent): Promise<{
	name: string;
	email: string;
	phone: string;
} | null> {
	const eventId = event.metadata?.eventId;
	if (!eventId) {
		return null;
	}

	// 1. Check for event contacts tagged as "Employee"
	const eventContacts = await getEntityContacts('event', eventId);

	// Find contacts with "Employee" tag
	for (const contact of eventContacts) {
		const contactTags = await db.query.contactTag.findMany({
			where: (ct, { eq }) => eq(ct.contactId, contact.id),
			with: {
				tag: true
			}
		});

		const hasEmployeeTag = contactTags.some(ct => ct.tag.name.toLowerCase() === 'employee');
		if (hasEmployeeTag) {
			return {
				name: contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim(),
				email: (contact as any).emails?.find((e: any) => e.primary)?.value ||
				       (contact as any).emails?.[0]?.value || '',
				phone: (contact as any).phones?.find((p: any) => p.primary)?.value ||
				       (contact as any).phones?.[0]?.value || ''
			};
		}
	}

	// 2. If no Employee-tagged event contact, check location contacts
	const resources = await db.query.eventResource.findMany({
		where: (er, { eq }) => eq(er.eventId, eventId),
		with: {
			resource: {
				with: {
					location: true
				}
			}
		}
	});

	for (const er of resources) {
		const locationId = (er.resource as any)?.locationId;
		if (locationId) {
			const locationContacts = await getEntityContacts('location', locationId);
			if (locationContacts.length > 0) {
				const contact = locationContacts[0];
				return {
					name: contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim(),
					email: (contact as any).emails?.find((e: any) => e.primary)?.value ||
					       (contact as any).emails?.[0]?.value || '',
					phone: (contact as any).phones?.find((p: any) => p.primary)?.value ||
					       (contact as any).phones?.[0]?.value || ''
				};
			}
		}
	}

	// 3. No contact found
	return null;
}