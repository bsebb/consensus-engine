const { PrismaClient } = require('@prisma/client');

function getSafeDatabaseUrl() {
    const rawUrl = (process.env.DATABASE_URL || '').trim();
    if (!rawUrl) return undefined;
    try {
        const parsed = new URL(rawUrl);
        // When using Neon's pooled endpoint (-pooler), enable PgBouncer transaction mode compatibility in Prisma
        if (parsed.hostname.includes('-pooler.') && !parsed.searchParams.has('pgbouncer')) {
            parsed.searchParams.set('pgbouncer', 'true');
        }
        // On serverless/free-tier PostgreSQL (Neon, Supabase, Render), balance concurrency and pool limits
        if (!parsed.searchParams.has('connection_limit')) {
            const defaultLimit = parsed.hostname.includes('-pooler.') ? '15' : '5';
            parsed.searchParams.set('connection_limit', defaultLimit);
        }
        if (!parsed.searchParams.has('pool_timeout')) {
            parsed.searchParams.set('pool_timeout', '15');
        }
        if (!parsed.searchParams.has('connect_timeout')) {
            parsed.searchParams.set('connect_timeout', '15');
        }
        return parsed.toString();
    } catch {
        return rawUrl;
    }
}

const safeUrl = getSafeDatabaseUrl();
const prisma = global.__prisma || new PrismaClient(
    safeUrl
        ? {
            datasources: {
                db: { url: safeUrl },
            },
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        }
        : {
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        }
);

global.__prisma = prisma;

module.exports = { prisma, getSafeDatabaseUrl };
