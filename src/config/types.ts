import type { devices } from '@playwright/test';

export type DeviceProfile = (typeof devices)[string];
