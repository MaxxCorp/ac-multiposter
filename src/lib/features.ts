import { ICONS } from '$lib/icons';
import type { Feature } from '$lib/authorization';

export interface FeatureMeta {
  key: Feature;
  title: string;
  description: string;
  href: string;
  buttonText: string;
  claim: Feature; // claim matches key for now
  icon: keyof typeof ICONS;
  gradientFrom: string;
  gradientTo: string;
  borderClass: string;
  buttonClass: string;
  order: number;
}

export const FEATURES: readonly FeatureMeta[] = [
  {
    key: 'synchronizations',
    title: 'Synchronizations',
    description: 'Connect and sync your Google Calendar and Microsoft 365 calendars.',
    href: '/synchronizations',
    buttonText: 'Manage Syncs',
    claim: 'synchronizations',
    icon: 'calendar',
    gradientFrom: 'from-blue-50',
    gradientTo: 'to-indigo-50',
    borderClass: 'border-blue-100',
    buttonClass: 'bg-blue-600 hover:bg-blue-700',
    order: 1
  },
  {
    key: 'events',
    title: 'Events',
    description: 'Create, edit, and manage your events across multiple calendars.',
    href: '/events',
    buttonText: 'Manage Events',
    claim: 'events',
    icon: 'plus',
    gradientFrom: 'from-purple-50',
    gradientTo: 'to-pink-50',
    borderClass: 'border-purple-100',
    buttonClass: 'bg-purple-600 hover:bg-purple-700',
    order: 2
  },
  {
    key: 'announcements',
    title: 'Announcements',
    description: 'Manage and publish announcements, news, and updates.',
    href: '/announcements',
    buttonText: 'Manage Announcements',
    claim: 'announcements',
    icon: 'megaphone',
    gradientFrom: 'from-amber-50',
    gradientTo: 'to-yellow-50',
    borderClass: 'border-amber-100',
    buttonClass: 'bg-amber-600 hover:bg-amber-700',
    order: 3
  },
  {
    key: 'campaigns',
    title: 'Campaigns',
    description: 'Create and manage message campaigns to post across your connected calendars.',
    href: '/campaigns',
    buttonText: 'Manage Campaigns',
    claim: 'campaigns',
    icon: 'checkSquare',
    gradientFrom: 'from-green-50',
    gradientTo: 'to-emerald-50',
    borderClass: 'border-emerald-100',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
    order: 4
  },
  {
    key: 'locations',
    title: 'Locations',
    description: 'Manage physical locations where resources can be found or events take place.',
    href: '/locations',
    buttonText: 'Manage Locations',
    claim: 'locations',
    icon: 'mapPin',
    gradientFrom: 'from-orange-50',
    gradientTo: 'to-amber-50',
    borderClass: 'border-orange-100',
    buttonClass: 'bg-orange-600 hover:bg-orange-700',
    order: 5
  },
  {
    key: 'resources',
    title: 'Resources',
    description: 'Manage bookable resources like rooms, equipment, and inventory items.',
    href: '/resources',
    buttonText: 'Manage Resources',
    claim: 'resources',
    icon: 'box',
    gradientFrom: 'from-teal-50',
    gradientTo: 'to-cyan-50',
    borderClass: 'border-teal-100',
    buttonClass: 'bg-teal-600 hover:bg-teal-700',
    order: 6
  },
  {
    key: 'users',
    title: 'Users',
    description: 'Manage users, roles, and access permissions.',
    href: '/users',
    buttonText: 'Manage Users',
    claim: 'users',
    icon: 'users',
    gradientFrom: 'from-rose-50',
    gradientTo: 'to-red-50',
    borderClass: 'border-rose-100',
    buttonClass: 'bg-rose-600 hover:bg-rose-700',
    order: 7
  },
  {
    key: 'contacts',
    title: 'Contacts',
    description: 'Manage your contact information, including emails, phones, and addresses.',
    href: '/contacts',
    buttonText: 'Manage Contacts',
    claim: 'contacts',
    icon: 'users',
    gradientFrom: 'from-indigo-50',
    gradientTo: 'to-blue-50',
    borderClass: 'border-indigo-100',
    buttonClass: 'bg-indigo-600 hover:bg-indigo-700',
    order: 8
  },
  {
    key: 'kiosks',
    title: 'Kiosks',
    description: 'Configure public displays to cycle through events for specific locations.',
    href: '/kiosks',
    buttonText: 'Manage Kiosks',
    claim: 'kiosks',
    icon: 'monitor',
    gradientFrom: 'from-gray-50',
    gradientTo: 'to-slate-50',
    borderClass: 'border-gray-100',
    buttonClass: 'bg-gray-600 hover:bg-gray-700',
    order: 9
  }
] as const;

export function getVisibleFeatures(user: any, hasAccessFn: (u: any, f: Feature) => boolean): FeatureMeta[] {
  return FEATURES.filter(f => hasAccessFn(user, f.key)).sort((a, b) => a.order - b.order);
}
