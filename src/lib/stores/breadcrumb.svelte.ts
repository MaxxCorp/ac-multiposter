import type { Feature } from '$lib/authorization';

export class BreadcrumbStore {
    feature = $state<Feature | undefined>();
    current = $state<string | undefined>();
    segments = $state<Array<{ label: string; href?: string }> | undefined>();

    set(data: { feature?: Feature; current?: string; segments?: Array<{ label: string; href?: string }> }) {
        this.feature = data.feature;
        this.current = data.current;
        this.segments = data.segments;
    }
}

export const breadcrumbState = new BreadcrumbStore();
