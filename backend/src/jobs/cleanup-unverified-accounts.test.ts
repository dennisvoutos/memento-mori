import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteManyMock } = vi.hoisted(() => ({
  deleteManyMock: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      deleteMany: deleteManyMock,
    },
  },
}));

vi.mock('node-cron', () => ({
  default: {
    validate: vi.fn(() => true),
    schedule: vi.fn(),
  },
}));

import { cleanupUnverifiedAccounts } from './cleanup-unverified-accounts.js';

describe('cleanupUnverifiedAccounts', () => {
  beforeEach(() => {
    deleteManyMock.mockReset();
    deleteManyMock.mockResolvedValue({ count: 0 });
  });

  it('skips unverified users who already own memorials', async () => {
    const now = new Date('2026-06-01T00:00:00.000Z');

    await cleanupUnverifiedAccounts(now);

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        emailVerified: false,
        createdAt: { lt: new Date('2026-05-25T00:00:00.000Z') },
        memorials: { none: {} },
      },
    });
  });
});