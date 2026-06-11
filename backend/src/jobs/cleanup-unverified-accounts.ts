import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';

const DEFAULT_UNVERIFIED_ACCOUNT_TTL_DAYS = 7;
const DEFAULT_UNVERIFIED_ACCOUNT_CLEANUP_CRON = '0 2 * * *';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getPositiveIntegerFromEnv(
    value: string | undefined,
    fallback: number
): number {
    const parsed = Number.parseInt(value?.trim() || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getCleanupSchedule() {
    return (
        process.env.UNVERIFIED_ACCOUNT_CLEANUP_CRON?.trim() ||
        DEFAULT_UNVERIFIED_ACCOUNT_CLEANUP_CRON
    );
}

function getUnverifiedAccountTtlDays() {
    return getPositiveIntegerFromEnv(
        process.env.UNVERIFIED_ACCOUNT_TTL_DAYS,
        DEFAULT_UNVERIFIED_ACCOUNT_TTL_DAYS
    );
}

export async function cleanupUnverifiedAccounts(now = new Date()) {
    const cutoff = new Date(
        now.getTime() - getUnverifiedAccountTtlDays() * ONE_DAY_MS
    );

    const { count } = await prisma.user.deleteMany({
        where: {
            emailVerified: false,
            createdAt: { lt: cutoff },
            memorials: { none: {} },
        },
    });

    if (count > 0) {
        console.log(
            `Removed ${count} unverified account${count === 1 ? '' : 's'} older than ${getUnverifiedAccountTtlDays()} days.`
        );
    }

    return count;
}

export function startUnverifiedAccountCleanupJob() {
    const schedule = getCleanupSchedule();

    if (!cron.validate(schedule)) {
        throw new Error('UNVERIFIED_ACCOUNT_CLEANUP_CRON is invalid');
    }

    return cron.schedule(schedule, async () => {
        try {
            await cleanupUnverifiedAccounts();
        } catch (error) {
            console.error('Failed to clean up unverified accounts:', error);
        }
    });
}