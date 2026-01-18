
export class KioskState {
    isKiosk = $state(false);
    isHeaderVisible = $state(true);
}

export const kioskState = new KioskState();
