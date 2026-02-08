
import * as rruleModule from 'rrule';

// Use 'import *' to safely load the module in both ESM (Vite) and CJS (Node) contexts.
// In Vite/ESM: 'rruleModule' will contain named exports (RRule, Frequency, etc.).
// In Node/CJS: 'rruleModule' might put everything under 'default' depending on interop.

const mod = rruleModule as any;

export const RRule = mod.RRule || mod.default?.RRule || mod.default;
export const Frequency = mod.Frequency || mod.default?.Frequency || RRule?.Frequency;
