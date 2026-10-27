import React, { useState } from 'react';
import {
  Activity,
  Users,
  Vote,
  CheckCircle2,
  ArrowRight,
  Clock,
  Layers,
  Trophy,
} from 'lucide-react';
import SegmentedControl from '../ui/SegmentedControl';
import {
  Panel,
  Metric,
  VoteMix,
} from './DashboardCommon';
import {
  number,
  percent,
  duration,
  phaseNames,
} from './DashboardFormatters';

export function Overview({ data, onSessions }) {
  const [metric, setMetric] = useState('rooms');
  const [selectedDay, setSelectedDay] = useState(null);

  const s = data.summary;
  const enriched = { audience: {}, votes: {}, phases: [], ...data };

  const trend = Array.from({ length: enriched.days }, (_, i) => {
    const d = new Date(enriched.asOf);
    d.setUTCDate(d.getUTCDate() - enriched.days + 1 + i);
    const day = d.toISOString().slice(0, 10);
    return {
      day,
      rooms: 0,
      resolved: 0,
      browsers: 0,
      ballots: 0,
      ...enriched.daily.find((x) => x.day === day),
    };
  });

  const max = Math.max(1, ...trend.map((x) => x[metric]));
  const selected = trend.find((d) => d.day === selectedDay) || trend.at(-1);
  const started = s.votingStarted || 0;

  return (
    <>
      <section className="dash-metrics" aria-label="App metrics">
        <Metric
          label="Rooms created"
          value={number(s.rooms)}
          caption={`${number(s.recentlyActive)} recently active`}
          Icon={Activity}
        />
        <Metric
          label="Unique browsers"
          value={number(s.uniqueDevices)}
          caption={`${number(enriched.audience.returning)} seen before this period`}
          Icon={Users}
        />
        <Metric
          label="Picks completed"
          value={number(s.resolved)}
          caption={`${s.completionRate}% of created rooms`}
          Icon={CheckCircle2}
        />
        <Metric
          label="Submitted ballots"
          value={number(s.voters)}
          caption={`${number(s.ratings)} individual card ratings`}
          Icon={Vote}
        />
      </section>

      <div className="dash-two-column">
        <Panel
          title="Room activity"
          subtitle="Tap a day to see its breakdown · UTC"
          Icon={Activity}
          className="dash-trend"
        >
          <div className="dash-chart-control-wrap">
            <SegmentedControl
              options={[
                { value: 'rooms', label: 'Rooms' },
                { value: 'browsers', label: 'Browsers' },
                { value: 'ballots', label: 'Ballots' },
              ]}
              value={metric}
              onChange={setMetric}
              size="sm"
            />
          </div>

          <div
            className="dash-chart"
            role="group"
            aria-label={`Daily activity over the last ${enriched.days} days`}
          >
            {trend.map((d) => (
              <button
                key={d.day}
                title={`${d.day}: ${d[metric]}`}
                aria-label={`${d.day}: ${d[metric]} ${metric}`}
                aria-pressed={selected?.day === d.day}
                className="dash-bar-slot"
                onClick={() => setSelectedDay(d.day)}
              >
                <span
                  className="dash-bar"
                  style={{
                    height: `${d[metric] ? Math.max(3, (d[metric] / max) * 100) : 0}%`,
                  }}
                />
              </button>
            ))}
          </div>

          <div className="dash-chart-labels">
            <span>{trend[0]?.day}</span>
            <span>{trend.at(-1)?.day}</span>
          </div>

          <div className="dash-day-detail">
            <strong>{selected?.day}</strong>
            <span>{number(selected?.rooms)} rooms</span>
            <span>{number(selected?.resolved)} completed</span>
            <span>{number(selected?.browsers)} browsers</span>
            <span>{number(selected?.ballots)} ballots</span>
          </div>
        </Panel>

        <Panel
          title="From room to result"
          subtitle="Where sessions reach in this period"
          Icon={Layers}
        >
          {[
            ['Rooms created', s.rooms],
            ['Voting reached', started],
            ['Pick completed', s.resolved],
          ].map(([label, value]) => (
            <div className="dash-funnel" key={label}>
              <div>
                <span>{label}</span>
                <strong>
                  {number(value)} <small>{percent(value, s.rooms)}%</small>
                </strong>
              </div>
              <div className="dash-progress">
                <span style={{ width: `${percent(value, s.rooms)}%` }} />
              </div>
            </div>
          ))}

          <div className="dash-inline-stats">
            <div>
              <strong>{s.averageGroupSize}</strong>
              <span>members / room</span>
            </div>
            <div>
              <strong>{duration(s.medianMinutesToLastBallot)}</strong>
              <span>median to last ballot</span>
            </div>
          </div>

          <p className="dash-note">
            Time is measured from room creation to the last accepted ballot in
            completed rooms. Older records may have no timing.
          </p>

          <button className="dash-text-button" onClick={onSessions}>
            Explore individual sessions <ArrowRight size={14} />
          </button>
        </Panel>
      </div>

      <div className="dash-two-column">
        <Panel
          title="How people voted"
          subtitle="Every accepted card rating, by action"
          Icon={Vote}
        >
          <VoteMix votes={enriched.votes} />
          <p className="dash-note">
            Unrated cards may be filled automatically when someone submits a
            ballot early.
          </p>
        </Panel>

        <Panel
          title="Who comes back"
          subtitle="Anonymous browsers in retained records"
          Icon={Users}
        >
          <div className="dash-audience">
            <div>
              <strong>{number(enriched.audience.firstSeen)}</strong>
              <span>first seen this period</span>
            </div>
            <div>
              <strong>{number(enriched.audience.returning)}</strong>
              <span>seen before this period</span>
            </div>
            <div>
              <strong>{number(enriched.audience.repeatInPeriod)}</strong>
              <span>joined multiple rooms</span>
            </div>
            <div>
              <strong>{number(s.joins)}</strong>
              <span>total room joins</span>
            </div>
          </div>
          <p className="dash-note">
            A browser is an anonymous device identity, not a verified person.
            Cleared browser data and removed old rooms affect these counts.
            {enriched.audience.unidentifiedJoins > 0
              ? ` ${number(enriched.audience.unidentifiedJoins)} older joins have no device identity.`
              : ''}
          </p>
        </Panel>
      </div>

      <div className="dash-two-column">
        <Panel
          title="Category performance"
          subtitle="Top 20 categories · rooms and participation"
          Icon={Layers}
        >
          {enriched.categories.length ? (
            enriched.categories.map((c) => (
              <div key={c.category} className="dash-category">
                <div>
                  <strong>{c.category}</strong>
                  <span>
                    {number(c.rooms)} rooms · {number(c.joins)} joins
                  </span>
                </div>
                <div>
                  <strong>{percent(c.resolved, c.rooms)}%</strong>
                  <span>{number(c.resolved)} completed</span>
                </div>
              </div>
            ))
          ) : (
            <p className="dash-empty">No rooms in this period yet.</p>
          )}
        </Panel>

        <Panel
          title="Group favourites"
          subtitle="Top 20 choices by rooms won"
          Icon={Trophy}
        >
          {enriched.popular.length ? (
            enriched.popular.map((p, i) => (
              <div key={p.name} className="dash-row">
                <span className="dash-rank">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{p.name}</span>
                <strong>
                  {number(p.wins)} <small>wins</small>
                </strong>
              </div>
            ))
          ) : (
            <p className="dash-empty">Completed picks will appear here.</p>
          )}
        </Panel>
      </div>

      <Panel
        title="Room status"
        subtitle="A closer look at unfinished sessions"
        Icon={Clock}
      >
        <div className="dash-status-grid">
          {enriched.phases.map((p) => (
            <div key={p.phase}>
              <span className={`dash-status ${p.phase}`}>
                {phaseNames[p.phase]}
              </span>
              <strong>{number(p.rooms)}</strong>
            </div>
          ))}
        </div>
        <p className="dash-note">
          Recently active means updated in the last 30 minutes. Inactive
          includes closed rooms. Older rooms were created before durable session
          snapshots.
        </p>
      </Panel>
    </>
  );
}
