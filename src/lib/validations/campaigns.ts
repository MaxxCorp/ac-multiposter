import * as v from 'valibot';

/**
 * Shared JSON validation helper for Valibot
 */
const contentSchema = v.pipe(
  v.any(),
  v.check((val) => val !== null && val !== undefined, 'Content is required'),
  v.check((val) => {
    try {
      if (typeof val === 'string') {
        JSON.parse(val);
      }
      return true;
    } catch {
      return false;
    }
  }, 'Content must be valid JSON')
);

/**
 * Schema for creating a new campaign.
 */
export const createCampaignSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Campaign name is required')),
  content: contentSchema,
});

/**
 * Schema for updating an existing campaign.
 */
export const updateCampaignSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.optional(v.pipe(v.string(), v.minLength(1, 'Campaign name is required'))),
  content: v.optional(contentSchema),
});

/**
 * Schema for deleting campaigns.
 */
export const deleteCampaignSchema = v.array(v.pipe(v.string(), v.uuid()));