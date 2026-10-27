const { Prisma } = require('@prisma/client');
const { rootPrisma: db } = require('../../db/prismaClient');

function periodStart(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date;
}

// Aggregate inside PostgreSQL. Credentials, names of participants and private
// runtime snapshots never cross the database boundary into a dashboard response.
function trafficFilter(traffic = 'real') {
  return Prisma.sql`(${traffic}='all' OR r."isTest"=(${traffic}='test'))`;
}

function cohort(start, traffic) {
  return Prisma.sql`WITH scoped AS (
    SELECT r.id, r.theme, r.status, r."createdAt", r."updatedAt", r."winnerOptionId",
      CASE WHEN r.theme LIKE 'custom:%' THEN 'custom' ELSE 'discovery' END AS mode,
      CASE WHEN r.theme LIKE 'custom:%' THEN 'Custom polls' ELSE COALESCE(NULLIF(r.theme,''),'Other') END AS category,
      CASE WHEN r.status='RESOLVED' THEN 'completed'
        WHEN r."runtimeState" IS NULL THEN 'legacy'
        WHEN r."runtimeState"->>'closed'='true' OR r."updatedAt" < (NOW() AT TIME ZONE 'UTC')-INTERVAL '30 minutes' THEN 'inactive'
        WHEN r.status='VOTING' THEN 'voting' ELSE 'setup' END AS phase
    FROM rooms r WHERE r."createdAt" >= ${start} AND ${trafficFilter(traffic)}
  ), people AS (
    SELECT p.id, p."roomId", p."deviceId", p."createdAt" FROM participants p JOIN scoped r ON r.id=p."roomId"
  ), member_counts AS (
    SELECT "roomId", count(*)::int AS members FROM people GROUP BY "roomId"
  ), vote_counts AS (
    SELECT p."roomId", count(DISTINCT v."participantId")::int AS voters,
      count(*)::int AS ratings, min(v."createdAt") AS first_ballot, max(v."createdAt") AS last_ballot,
      count(*) FILTER(WHERE score=1)::int AS likes, count(*) FILTER(WHERE score=2)::int AS supers,
      count(*) FILTER(WHERE score=-1)::int AS passes, count(*) FILTER(WHERE score=-100)::int AS vetoes,
      count(*) FILTER(WHERE score=0)::int AS unseen
    FROM votes v JOIN people p ON p.id=v."participantId" GROUP BY p."roomId"
  ), review_counts AS (
    SELECT p."roomId", count(*)::int AS reviews FROM feedbacks f JOIN people p ON p.id=f."participantId" GROUP BY p."roomId"
  ), room_stats AS (
    SELECT r.*, COALESCE(m.members,0)::int AS members, COALESCE(v.voters,0)::int AS voters,
      COALESCE(v.ratings,0)::int AS ratings, COALESCE(f.reviews,0)::int AS reviews,
      v.first_ballot, v.last_ballot, COALESCE(v.likes,0)::int AS likes, COALESCE(v.supers,0)::int AS supers,
      COALESCE(v.passes,0)::int AS passes, COALESCE(v.vetoes,0)::int AS vetoes, COALESCE(v.unseen,0)::int AS unseen,
      o.name AS winner
    FROM scoped r LEFT JOIN member_counts m ON m."roomId"=r.id LEFT JOIN vote_counts v ON v."roomId"=r.id
      LEFT JOIN review_counts f ON f."roomId"=r.id LEFT JOIN options o ON o.id=r."winnerOptionId"
  )`;
}

async function analytics(days, traffic = 'real') {
  const start = periodStart(days);
  const [result] = await db.$queryRaw(Prisma.sql`${cohort(start, traffic)},
    device_visits AS (
      SELECT "deviceId" AS device, count(DISTINCT "roomId")::int AS visits
      FROM people WHERE NULLIF("deviceId",'') IS NOT NULL GROUP BY "deviceId"
    ), first_seen AS (
      SELECT p."deviceId" AS device, min(p."createdAt") AS first_seen
      FROM participants p JOIN device_visits d ON d.device=p."deviceId" JOIN rooms r ON r.id=p."roomId" WHERE ${trafficFilter(traffic)} GROUP BY p."deviceId"
    ), daily_rooms AS (
      SELECT to_char("createdAt",'YYYY-MM-DD') AS day, count(*)::int AS rooms,
        count(*) FILTER(WHERE status='RESOLVED')::int AS resolved
      FROM scoped GROUP BY 1
    ), daily_people AS (
      SELECT to_char("createdAt",'YYYY-MM-DD') AS day, count(DISTINCT NULLIF("deviceId",''))::int AS browsers
      FROM people GROUP BY 1
    ), daily_votes AS (
      SELECT to_char(v."createdAt",'YYYY-MM-DD') AS day, count(DISTINCT v."participantId")::int AS ballots
      FROM votes v JOIN people p ON p.id=v."participantId" GROUP BY 1
    ), days AS (SELECT day FROM daily_rooms UNION SELECT day FROM daily_people UNION SELECT day FROM daily_votes),
    category_stats AS (
      SELECT category, count(*)::int AS rooms, count(*) FILTER(WHERE status='RESOLVED')::int AS resolved,
        COALESCE(sum(members),0)::int AS joins, COALESCE(sum(voters),0)::int AS voters
      FROM room_stats GROUP BY category ORDER BY rooms DESC, category LIMIT 20
    ), winners AS (
      SELECT winner AS name, count(*)::int AS wins FROM room_stats
      WHERE winner IS NOT NULL AND status='RESOLVED' GROUP BY winner ORDER BY wins DESC, winner LIMIT 20
    ), recent_reviews AS (
      SELECT f.id, o.name AS choice, f."satisfactionScore" AS satisfaction, f."priceAccuracyScore" AS "priceAccuracy",
        left(f.comment,500) AS comment, to_char(f."createdAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
      FROM feedbacks f JOIN people p ON p.id=f."participantId" JOIN options o ON o.id=f."optionId"
      ORDER BY f."createdAt" DESC, f.id DESC LIMIT 20
    )
    SELECT
      (SELECT jsonb_build_object(
        'rooms',count(*)::int,'resolved',count(*) FILTER(WHERE status='RESOLVED')::int,
        'recentlyActive',count(*) FILTER(WHERE phase IN ('setup','voting'))::int,
        'customRooms',count(*) FILTER(WHERE mode='custom')::int,
        'joins',COALESCE(sum(members),0)::int,'voters',COALESCE(sum(voters),0)::int,'ratings',COALESCE(sum(ratings),0)::int,
        'uniqueDevices',(SELECT count(*)::int FROM device_visits),
        'completionRate',COALESCE(round(100.0*count(*) FILTER(WHERE status='RESOLVED')/NULLIF(count(*),0)),0)::int,
        'averageGroupSize',COALESCE(round(avg(members),1),0)::float8,
        'votingStarted',count(*) FILTER(WHERE status IN ('VOTING','RESOLVED') OR voters>0)::int,
        'withoutBallots',count(*) FILTER(WHERE voters=0)::int,
        'feedback',COALESCE(sum(reviews),0)::int,
        'satisfaction',(SELECT round(avg(f."satisfactionScore"),1)::float8 FROM feedbacks f JOIN people p ON p.id=f."participantId"),
        'priceAccuracy',(SELECT round(avg(f."priceAccuracyScore"),1)::float8 FROM feedbacks f JOIN people p ON p.id=f."participantId"),
        'medianMinutesToLastBallot',round((percentile_cont(0.5) WITHIN GROUP(ORDER BY extract(epoch FROM (last_ballot-"createdAt"))/60.0)
          FILTER(WHERE status='RESOLVED' AND last_ballot>="createdAt"))::numeric,1)::float8
      ) FROM room_stats) AS summary,
      (SELECT jsonb_build_object('firstSeen',count(*) FILTER(WHERE f.first_seen>=${start})::int,
        'returning',count(*) FILTER(WHERE f.first_seen<${start})::int,
        'repeatInPeriod',count(*) FILTER(WHERE d.visits>1)::int,
        'unidentifiedJoins',(SELECT count(*)::int FROM people WHERE NULLIF("deviceId",'') IS NULL))
        FROM device_visits d JOIN first_seen f ON f.device=d.device) AS audience,
      (SELECT jsonb_build_object('likes',COALESCE(sum(likes),0)::int,'supers',COALESCE(sum(supers),0)::int,
        'passes',COALESCE(sum(passes),0)::int,'vetoes',COALESCE(sum(vetoes),0)::int,'unseen',COALESCE(sum(unseen),0)::int) FROM room_stats) AS votes,
      COALESCE((SELECT jsonb_agg(x ORDER BY x.day) FROM (
        SELECT d.day,COALESCE(r.rooms,0)::int AS rooms,COALESCE(r.resolved,0)::int AS resolved,
          COALESCE(p.browsers,0)::int AS browsers,COALESCE(v.ballots,0)::int AS ballots
        FROM days d LEFT JOIN daily_rooms r USING(day) LEFT JOIN daily_people p USING(day) LEFT JOIN daily_votes v USING(day)
      ) x),'[]'::jsonb) AS daily,
      COALESCE((SELECT jsonb_agg(c) FROM category_stats c),'[]'::jsonb) AS categories,
      COALESCE((SELECT jsonb_agg(w) FROM winners w),'[]'::jsonb) AS popular,
      COALESCE((SELECT jsonb_agg(x) FROM (SELECT phase,count(*)::int AS rooms FROM room_stats GROUP BY phase ORDER BY rooms DESC) x),'[]'::jsonb) AS phases,
      COALESCE((SELECT jsonb_agg(x ORDER BY x.hour) FROM (SELECT extract(hour FROM "createdAt")::int AS hour,count(*)::int AS rooms FROM scoped GROUP BY 1) x),'[]'::jsonb) AS hourly,
      COALESCE((SELECT jsonb_agg(f) FROM recent_reviews f),'[]'::jsonb) AS feedback
  `);
  return { days, traffic, asOf: new Date().toISOString(), ...result };
}

async function sessions({
  days,
  page,
  status,
  mode,
  search,
  traffic = 'real',
}) {
  const where = Prisma.sql`WHERE (${status}='all' OR r.phase=${status}) AND (${mode}='all' OR r.mode=${mode})
    AND (${search}='' OR strpos(lower(COALESCE(r.theme,'') || ' ' || COALESCE(r.winner,'')),lower(${search}))>0)`;
  const [result] =
    await db.$queryRaw(Prisma.sql`${cohort(periodStart(days), traffic)}, filtered AS (SELECT r.* FROM room_stats r ${where})
    SELECT (SELECT count(*)::int FROM filtered) AS total,
      COALESCE((SELECT jsonb_agg(x) FROM (
        SELECT id, mode, category, CASE WHEN mode='custom' THEN regexp_replace(theme,'^custom:','') ELSE category END AS topic,
          phase AS status, members, voters, ratings, reviews, winner,
          to_char("createdAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
          to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
        FROM filtered ORDER BY "createdAt" DESC,id DESC LIMIT 20 OFFSET ${(page - 1) * 20}
      ) x),'[]'::jsonb) AS items`);
  return { ...result, page, pageSize: 20, days, traffic };
}

async function sessionDetail(id, traffic = 'real') {
  // Select only safe scalar metadata; never select/return the private snapshot.
  const [rows, options, [counts], feedback] = await db.$transaction(
    [
      db.$queryRaw`
    SELECT id,theme,status,"isTest","winnerOptionId",
      CASE WHEN status='RESOLVED' THEN 'completed' WHEN "runtimeState" IS NULL THEN 'legacy'
        WHEN "runtimeState"->>'closed'='true' OR "updatedAt" < (NOW() AT TIME ZONE 'UTC')-INTERVAL '30 minutes' THEN 'inactive'
        WHEN status='VOTING' THEN 'voting' ELSE 'setup' END AS phase,
      to_char("createdAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
      to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt",
      CASE WHEN jsonb_typeof("runtimeState"#>'{voting,expectedCount}')='number' THEN ("runtimeState"#>>'{voting,expectedCount}')::int ELSE NULL END AS "expectedVoters",
      CASE WHEN jsonb_typeof("runtimeState"#>'{voting,matchScore}')='number' THEN ("runtimeState"#>>'{voting,matchScore}')::float8 ELSE NULL END AS "matchScore"
    FROM rooms r WHERE id=${id} AND ${trafficFilter(traffic)}`,
      db.$queryRaw`SELECT o.id,o.name,o.id=r."winnerOptionId" AS winner,
      count(v.id)::int AS ratings,count(v.id) FILTER(WHERE v.score=1)::int AS likes,
      count(v.id) FILTER(WHERE v.score=2)::int AS supers,count(v.id) FILTER(WHERE v.score=-1)::int AS passes,
      count(v.id) FILTER(WHERE v.score=-100)::int AS vetoes,count(v.id) FILTER(WHERE v.score=0)::int AS unseen
      FROM options o JOIN rooms r ON r.id=o."roomId" LEFT JOIN votes v ON v."optionId"=o.id
      WHERE r.id=${id} GROUP BY o.id,o.name,r."winnerOptionId"
      ORDER BY winner DESC,count(v.id) FILTER(WHERE v.score IN (1,2)) DESC,o.name LIMIT 100`,
      db.$queryRaw`SELECT count(p.id)::int AS members,(SELECT count(DISTINCT v."participantId")::int FROM votes v JOIN participants p2 ON p2.id=v."participantId" WHERE p2."roomId"=${id}) AS voters,
      (SELECT count(*)::int FROM options WHERE "roomId"=${id}) AS "candidateCount" FROM participants p WHERE p."roomId"=${id}`,
      db.$queryRaw`SELECT f.id,o.name AS choice,f."satisfactionScore" AS satisfaction,f."priceAccuracyScore" AS "priceAccuracy",left(f.comment,500) AS comment,
      to_char(f."createdAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
      FROM feedbacks f JOIN participants p ON p.id=f."participantId" JOIN options o ON o.id=f."optionId"
      WHERE p."roomId"=${id} ORDER BY f."createdAt" DESC LIMIT 30`,
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
  );
  if (!rows.length) return null;
  const room = rows[0];
  const { winnerOptionId, theme, ...safe } = room;
  return {
    ...safe,
    ...counts,
    topic: theme?.replace(/^custom:/, '') || 'Other',
    mode: theme?.startsWith('custom:') ? 'custom' : 'discovery',
    winner: options.find((o) => o.winner)?.name || null,
    options,
    feedback,
  };
}
async function classifySession(id, isTest) {
  // Do not move updatedAt: changing analytics labels is not room activity.
  return Boolean(
    await db.$executeRaw`UPDATE rooms SET "isTest"=${isTest} WHERE id=${id}`
  );
}
module.exports = {
  analytics,
  sessions,
  sessionDetail,
  classifySession,
  periodStart,
};
