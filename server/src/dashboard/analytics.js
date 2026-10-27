const { rootPrisma: db } = require('../../db/prismaClient');
async function analytics(days) {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
  return db.$transaction(
    async (tx) => {
      const [summary] = await tx.$queryRaw`
      SELECT count(*)::int AS rooms,
        count(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved,
        count(*) FILTER (WHERE "runtimeState" IS NOT NULL AND status != 'RESOLVED' AND NOT COALESCE(("runtimeState"->>'closed')::boolean,false) AND "updatedAt" > NOW() - INTERVAL '30 minutes')::int AS "recentlyActive",
        count(*) FILTER (WHERE theme LIKE 'custom:%')::int AS "customRooms"
      FROM rooms WHERE "createdAt" >= ${cutoff}`;
      const [people] =
        await tx.$queryRaw`SELECT count(*)::int AS joins, count(DISTINCT "deviceId")::int AS "uniqueDevices" FROM participants WHERE "createdAt" >= ${cutoff}`;
      const [ballots] =
        await tx.$queryRaw`SELECT count(*)::int AS "ratings", count(DISTINCT v."participantId")::int AS "voters" FROM votes v JOIN participants p ON p.id=v."participantId" JOIN rooms r ON r.id=p."roomId" WHERE r."createdAt" >= ${cutoff}`;
      const [feedback] =
        await tx.$queryRaw`SELECT count(*)::int AS count,round(avg("satisfactionScore")::numeric,1)::float8 AS satisfaction FROM feedbacks WHERE "createdAt" >= ${cutoff}`;
      const daily =
        await tx.$queryRaw`SELECT to_char("createdAt",'YYYY-MM-DD') AS day,count(*)::int AS rooms,count(*) FILTER (WHERE status='RESOLVED')::int AS resolved FROM rooms WHERE "createdAt" >= ${cutoff} GROUP BY 1 ORDER BY 1`;
      const categories =
        await tx.$queryRaw`SELECT CASE WHEN theme LIKE 'custom:%' THEN 'Custom polls' ELSE COALESCE(theme,'Other') END AS category,count(*)::int AS rooms FROM rooms WHERE "createdAt" >= ${cutoff} GROUP BY 1 ORDER BY rooms DESC LIMIT 10`;
      const popular =
        await tx.$queryRaw`SELECT o.name,count(*)::int AS wins FROM rooms r JOIN options o ON o.id=r."winnerOptionId" WHERE r."createdAt" >= ${cutoff} GROUP BY o.name ORDER BY wins DESC,o.name LIMIT 10`;
      return {
        days,
        asOf: new Date().toISOString(),
        summary: {
          ...summary,
          ...people,
          ...ballots,
          feedback: feedback.count,
          satisfaction: feedback.satisfaction,
          completionRate: summary.rooms
            ? Math.round((summary.resolved / summary.rooms) * 100)
            : 0,
        },
        daily,
        categories,
        popular,
      };
    },
    { isolationLevel: 'RepeatableRead', timeout: 15000 }
  );
}
module.exports = { analytics };
