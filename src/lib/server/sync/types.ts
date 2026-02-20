/**
 * Core types for the sync architecture
 */

export type SyncDirection = 'pull' | 'push' | 'bidirectional';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'paused';
export type ProviderType = 'google-calendar' | 'microsoft-calendar' | 'webhook' | 'custom' | 'berlin-de-main-calendar' | 'wp-the-events-calendar' | 'eventbrite' | 'meetup' | 'seniorennetz-berlin' | 'bewegungsatlas-berlin' | 'email';

/**
 * Configuration for a sync provider instance
 */
export interface SyncConfig {
	id: string;
	userId: string;
	providerId: string;
	providerType: ProviderType;
	direction: SyncDirection;
	enabled: boolean;
	credentials?: Record<string, any>;
	settings?: Record<string, any>;
	lastSyncAt?: Date;
	nextSyncAt?: Date;
	syncToken?: string; // For incremental syncs
	webhookId?: string; // For push notification subscriptions
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Represents an external event from a provider
 */
export interface ExternalEvent {
	externalId: string;
	providerId: string;
	summary: string;
	status?: 'confirmed' | 'tentative' | 'cancelled';
	description?: string;
	location?: string;
	isAllDay?: boolean;
	startDateTime?: Date;
	startTimeZone?: string;
	endDateTime?: Date;
	endTimeZone?: string;
	attendees?: Array<{
		email: string;
		displayName?: string;
		responseStatus?: string;
	}>;
	recurrence?: string[];
	reminders?: {
		useDefault: boolean;
		overrides?: Array<{
			method: string;
			minutes: number;
		}>;
	};
	metadata?: Record<string, any>;
	etag?: string;
	updatedAt?: Date;
	source?: {
		url?: string;
		title?: string;
	};
	ticketPrice?: string;

	tags?: Array<{ id: string; name: string }>;
	venueId?: string; // Internal ID reference for mapping lookups

	// Enhanced sync fields
	venue?: {
		name: string;
		address?: string;
		city?: string;
		country?: string;
		province?: string;
		zip?: string;
		phone?: string;
		website?: string;
	};
	organizer?: {
		name: string;
		email?: string;
		phone?: string;
		website?: string;
	};
	image?: {
		url: string;
		title?: string;
	};
}

/**
 * Tracks sync operations for auditing and retry
 */
export interface SyncOperation {
	id: string;
	syncConfigId: string;
	operation: 'pull' | 'push' | 'delete';
	status: 'pending' | 'completed' | 'failed';
	entityType: 'event' | 'announcement';
	entityId?: string;
	externalId?: string;
	error?: string;
	startedAt: Date;
	completedAt?: Date;
	retryCount: number;
}

/**
 * Maps internal events to external provider events
 */
export interface SyncMapping {
	id: string;
	eventId?: string; // Internal event ID (nullable)
	announcementId?: string; // Internal announcement ID (nullable)
	syncConfigId: string;
	externalId: string; // Provider's event ID
	providerId: string;
	lastSyncedAt: Date;
	etag?: string;
	metadata?: Record<string, any>;
	locationId?: string;
	contactId?: string;
	tagId?: string;
}

/**
 * Webhook subscription for push notifications
 */
export interface WebhookSubscription {
	id: string;
	syncConfigId: string;
	providerId: string;
	resourceId: string; // Provider's resource identifier
	channelId: string; // Unique channel identifier
	expiresAt: Date;
	createdAt: Date;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
	success: boolean;
	pulled: number;
	pushed: number;
	errors: Array<{
		entityId?: string;
		externalId?: string;
		message: string;
	}>;
	syncToken?: string;
}

/**
 * Provider interface that all sync providers must implement
 */
export interface SyncProvider {
	readonly type: ProviderType;
	readonly name: string;
	readonly supportsWebhooks: boolean;
	readonly supportedDirections: SyncDirection[];
	readonly supportedEntityTypes: ('event' | 'announcement')[];

	/**
	 * Initialize the provider with credentials
	 */
	initialize(config: SyncConfig): Promise<void>;

	/**
	 * Validate credentials and connection
	 */
	validateConnection(): Promise<boolean>;

	/**
	 * Pull events from the provider
	 * @param syncToken - Token for incremental sync (optional)
	 * @returns Events and new sync token
	 */
	pullEvents(syncToken?: string): Promise<{
		events: ExternalEvent[];
		nextSyncToken?: string;
	}>;

	/**
	 * Push an event to the provider
	 */
	pushEvent(event: ExternalEvent): Promise<{ externalId: string; etag?: string }>;

	/**
	 * Update an existing event on the provider
	 */
	updateEvent(externalId: string, event: ExternalEvent): Promise<{ etag?: string }>;

	/**
	 * Delete an event from the provider
	 */
	deleteEvent(externalId: string): Promise<void>;

	/**
	 * Set up webhook/push notification subscription
	 */
	setupWebhook?(callbackUrl: string): Promise<WebhookSubscription>;

	/**
	 * Renew webhook subscription before expiry
	 */
	renewWebhook?(subscription: WebhookSubscription): Promise<WebhookSubscription>;

	/**
	 * Cancel webhook subscription
	 */
	cancelWebhook?(subscription: WebhookSubscription): Promise<void>;

	/**
	 * Process webhook notification payload
	 */
	processWebhook?(payload: any): Promise<{
		changes: Array<{ externalId: string; changeType: 'created' | 'updated' | 'deleted' }>;
	}>;
}
