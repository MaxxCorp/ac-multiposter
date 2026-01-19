import { getRequestEvent } from '$app/server';
import type { UserWithRolesAndClaims } from './auth.d';

export type Feature = 'synchronizations' | 'events' | 'campaigns' | 'locations' | 'resources' | 'users' | 'contacts' | 'kiosks' | 'announcements';

/**
 * Get the authenticated user from the request event locals.
 * Throws an error if the user is not authenticated.
 */
export function getAuthenticatedUser(): UserWithRolesAndClaims {
	const event = getRequestEvent();
	if (!event.locals.user) {
		throw new Error('Unauthorized');
	}
	return event.locals.user as UserWithRolesAndClaims;
}

/**
 * Get the user from the request event locals if authenticated.
 * Returns null if not authenticated (does not throw).
 */
export function getOptionalUser(): UserWithRolesAndClaims | null {
	const event = getRequestEvent();
	return event.locals.user as UserWithRolesAndClaims | null;
}

export function parseRoles(user: UserWithRolesAndClaims): string[] {
	const raw = user?.roles;
	if (!raw) return [];
	if (Array.isArray(raw)) return raw as string[];
	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

export function parseClaims<T extends Record<string, unknown> = Record<string, unknown>>(
	user: UserWithRolesAndClaims
): T | null {
	const raw = user?.claims;
	if (!raw) return null;
	if (typeof raw === 'object') return raw as T;
	if (typeof raw === 'string') {
		try {
			return JSON.parse(raw) as T;
		} catch {
			return null;
		}
	}
	return null;
}

export function hasAccess(user: UserWithRolesAndClaims, feature: Feature): boolean {
	const roles = parseRoles(user);
	if (roles.includes('admin')) return true;
	const claims = parseClaims<Record<string, boolean>>(user);

	// Check for the current claim key
	if (claims?.[feature]) return true;

	// Backward compatibility: check for old 'calendarSyncs' key if checking 'synchronizations'
	if (feature === 'synchronizations' && claims?.['calendarSyncs']) return true;

	return false;
}

export function ensureAccess(user: UserWithRolesAndClaims, feature: Feature) {
	if (hasAccess(user, feature)) return;
	throw new Error('Forbidden');
}

