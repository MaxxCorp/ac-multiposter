import { db } from './db';
import { getEntityContacts } from './contacts';
import type { ExternalEvent } from './sync/types';

/**
 * Contact resolution algorithm for sync providers
 * Resolves the primary contact for an event based on the following priority:
 * 1. First event contact tagged as "Employee"
 * 2. First location contact (if no Employee-tagged event contact exists)
 */
export async function resolveContactForEventId(eventId: string | undefined, filterWorkOnly = false): Promise<{
	name: string;
	email: string;
	phone: string;
} | null> {
	if (!eventId) {
		return null;
	}

	// Helper to find data
	const findData = (items: any[], type: string) => {
		if (filterWorkOnly) {
			return items?.find((item: any) => item.type?.toLowerCase() === 'work')?.value || '';
		}
		return items?.find((item: any) => item.primary)?.value || items?.[0]?.value || '';
	};

	// 1. Check for event contacts tagged as "Employee"
	const eventContacts = await getEntityContacts('event', eventId, true);

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
				email: findData((contact as any).emails, 'email'),
				phone: findData((contact as any).phones, 'phone')
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
			const locationContacts = await getEntityContacts('location', locationId, true);
			if (locationContacts.length > 0) {
				const contact = locationContacts[0];
				return {
					name: contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim(),
					email: findData((contact as any).emails, 'email'),
					phone: findData((contact as any).phones, 'phone')
				};
			}
		}
	}

	// 3. No contact found
	return null;
}

export async function resolveEventContact(event: ExternalEvent) {
	return resolveContactForEventId(event.metadata?.eventId);
}
