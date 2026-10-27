import React, { useEffect, useState } from 'react';
import {
  Activity,
  Users,
  Vote,
  CheckCircle2,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  ThumbsUp,
  Star,
  X,
  Ban,
  Minus,
  MessageSquare,
  Layers,
  Trophy,
} from 'lucide-react';
import { dashboardRequest as request } from '../../utils/dashboardApi';
const number = (n) => new Intl.NumberFormat('en').format(n || 0);
const percent = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const duration = (minutes) =>
  minutes == null
    ? '—'
    : minutes >= 1440
      ? `${Math.round(minutes / 144) / 10}d`
      : minutes >= 60
        ? `${Math.round(minutes / 6) / 10}h`
        : `${minutes}m`;
const date = (value) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
const phaseNames = {
  setup: 'In the lobby',
  voting: 'Voting',
  completed: 'Completed',
  inactive: 'Inactive',
  legacy: 'Older room',
};
const actions = [
  { key: 'likes', label: 'Likes', Icon: ThumbsUp, color: 'var(--c-like)' },
  { key: 'supers', label: 'Super likes', Icon: Star, color: 'var(--c-super)' },
  { key: 'passes', label: 'Passes', Icon: X, color: 'var(--c-pass)' },
  { key: 'vetoes', label: 'Vetoes', Icon: Ban, color: 'var(--c-veto)' },
  {
    key: 'unseen',
    label: 'Unrated',
    Icon: Minus,
    color: 'var(--text-tertiary)',
  },
];
function Panel({ title, subtitle, Icon, children, className = '' }) {
  return (
    <section className={`dash-panel ${className}`}>
      <div className="dash-panel-heading">
        <div className="dash-panel-icon">
          <Icon size={17} />
        </div>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
function Metric({ label, value, caption, Icon }) {
  return (
    <article className="dash-metric">
      <div className="dash-metric-top">
        <span>{label}</span>
        <Icon size={16} />
      </div>
      <strong>{value}</strong>
      <p>{caption}</p>
    </article>
  );
}
export function VoteMix({ votes = {}, small = false }) {
  const total = actions.reduce((n, a) => n + (votes[a.key] || 0), 0);
  return (
    <>
      <div className="dash-vote-track" aria-label="Card rating distribution">
        {actions.map((a) => (
          <span
            key={a.key}
            style={{
              width: `${percent(votes[a.key] || 0, total)}%`,
              background: a.color,
            }}
          />
        ))}
      </div>
      <div className={`dash-vote-legend ${small ? 'small' : ''}`}>
        {actions.map(({ key, label, Icon, color }) => (
          <div key={key}>
            <span style={{ color }}>
              <Icon size={14} />
              {label}
            </span>
            <strong>
              {number(votes[key])}
              {!small && <small>{percent(votes[key] || 0, total)}%</small>}
            </strong>
          </div>
        ))}
      </div>
    </>
  );
}
export function Overview({ data, onSessions }) {
  const [metric, setMetric] = useState('rooms'),
    [selectedDay, setSelectedDay] = useState(null);
  const s = data.summary;
  data = { audience: {}, votes: {}, phases: [], ...data };
  const trend = Array.from({ length: data.days }, (_, i) => {
    const d = new Date(data.asOf);
    d.setUTCDate(d.getUTCDate() - data.days + 1 + i);
    const day = d.toISOString().slice(0, 10);
    return {
      day,
      rooms: 0,
      resolved: 0,
      browsers: 0,
      ballots: 0,
      ...data.daily.find((x) => x.day === day),
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
          caption={`${number(data.audience.returning)} seen before this period`}
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
          <div
            className="dash-chart-switch"
            role="group"
            aria-label="Chart metric"
          >
            {[
              ['rooms', 'Rooms'],
              ['browsers', 'Browsers'],
              ['ballots', 'Ballots'],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={metric === key}
                onClick={() => setMetric(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="dash-chart"
            role="group"
            aria-label={`Daily activity over the last ${data.days} days`}
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
          <VoteMix votes={data.votes} />
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
              <strong>{number(data.audience.firstSeen)}</strong>
              <span>first seen this period</span>
            </div>
            <div>
              <strong>{number(data.audience.returning)}</strong>
              <span>seen before this period</span>
            </div>
            <div>
              <strong>{number(data.audience.repeatInPeriod)}</strong>
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
            {data.audience.unidentifiedJoins > 0
              ? ` ${number(data.audience.unidentifiedJoins)} older joins have no device identity.`
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
          {data.categories.length ? (
            data.categories.map((c) => (
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
          {data.popular.length ? (
            data.popular.map((p, i) => (
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
          {data.phases.map((p) => (
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
export function FeedbackList({ items = [], summary }) {
  return (
    <>
      <section className="dash-metrics feedback-metrics">
        <Metric
          label="Reviews submitted"
          value={number(summary.feedback)}
          caption="For rooms created in this period"
          Icon={MessageSquare}
        />
        <Metric
          label="Average satisfaction"
          value={
            summary.satisfaction === null ? '—' : `${summary.satisfaction}/5`
          }
          caption="From submitted reviews"
          Icon={Star}
        />
        <Metric
          label="Average price accuracy"
          value={
            summary.priceAccuracy == null ? '—' : `${summary.priceAccuracy}/5`
          }
          caption="From submitted reviews"
          Icon={CheckCircle2}
        />
      </section>
      <Panel
        title="Recent feedback"
        subtitle="Latest 20 reviews · participants stay anonymous"
        Icon={MessageSquare}
      >
        {items.length ? (
          items.map((f) => (
            <article className="dash-review" key={f.id}>
              <div>
                <strong>{f.choice}</strong>
                <time>{date(f.createdAt)}</time>
              </div>
              <div className="dash-review-scores">
                <span>
                  <Star size={13} /> Satisfaction {f.satisfaction}/5
                </span>
                <span>Price accuracy {f.priceAccuracy}/5</span>
              </div>
              {f.comment ? (
                <p>{f.comment}</p>
              ) : (
                <p className="dash-note">No written comment.</p>
              )}
            </article>
          ))
        ) : (
          <p className="dash-empty">No feedback in this period yet.</p>
        )}
      </Panel>
    </>
  );
}
export function SessionExplorer({
  days,
  traffic,
  revision,
  onUnauthorized,
  onClassified,
}) {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState('all'),
    [mode, setMode] = useState('all'),
    [draft, setDraft] = useState(''),
    [search, setSearch] = useState(''),
    [result, setResult] = useState(null),
    [selected, setSelected] = useState(null),
    [detail, setDetail] = useState(null),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0),
    [classifying, setClassifying] = useState(false);
  useEffect(() => {
    const control = new AbortController();
    request(
      `/sessions?${new URLSearchParams({ days, page, status, mode, search, traffic })}`,
      undefined,
      { signal: control.signal }
    )
      .then((value) => {
        setResult(value);
        setError('');
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        if (e.status === 401) onUnauthorized();
        setError(e.message);
      });
    return () => control.abort();
  }, [
    days,
    page,
    status,
    mode,
    search,
    traffic,
    revision,
    attempt,
    onUnauthorized,
  ]);
  useEffect(() => {
    if (!selected) return;
    const control = new AbortController();
    request(`/sessions/${selected}?traffic=${traffic}`, undefined, {
      signal: control.signal,
    })
      .then((value) => {
        setDetail(value);
        setError('');
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        if (e.status === 401) onUnauthorized();
        setError(e.message);
      });
    return () => control.abort();
  }, [selected, traffic, revision, attempt, onUnauthorized]);
  async function changeClassification() {
    setClassifying(true);
    setError('');
    try {
      await request(`/sessions/${selected}/classification`, {
        isTest: !detail.isTest,
      });
      setSelected(null);
      setDetail(null);
      setResult(null);
      setAttempt((n) => n + 1);
      onClassified();
    } catch (e) {
      if (e.status === 401) onUnauthorized();
      setError(e.message);
    } finally {
      setClassifying(false);
    }
  }
  function filters(set, value) {
    set(value);
    setPage(1);
    setResult(null);
    setError('');
  }
  if (selected)
    return (
      <section className="dash-session-detail">
        <button
          className="dash-button secondary"
          onClick={() => {
            setSelected(null);
            setDetail(null);
            setError('');
          }}
        >
          <ChevronLeft size={15} /> Back to sessions
        </button>
        {error && (
          <div className="dash-error" role="alert">
            {error}{' '}
            <button
              className="dash-text-button"
              onClick={() => {
                setError('');
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}
        {!detail ? (
          <p className="dash-loading" role="status">
            Loading this session…
          </p>
        ) : (
          <>
            <div className="dash-detail-title">
              <span className={`dash-status ${detail.phase}`}>
                {phaseNames[detail.phase] || detail.status}
              </span>
              <h2>{detail.topic}</h2>
              <p>
                {date(detail.createdAt)} ·{' '}
                {detail.mode === 'custom' ? 'Custom poll' : 'Discovery'}
              </p>
            </div>
            <div className="dash-classification">
              <div>
                <strong>
                  {detail.isTest ? 'Test session' : 'User activity'}
                </strong>
                <p>
                  {detail.isTest
                    ? 'Excluded from the default dashboard.'
                    : 'Included in the default dashboard.'}{' '}
                  Changing this label keeps the session and all its data.
                </p>
              </div>
              <button
                className="dash-button secondary"
                disabled={classifying}
                onClick={changeClassification}
              >
                {classifying
                  ? 'Saving…'
                  : detail.isTest
                    ? 'Include as user activity'
                    : 'Exclude as test session'}
              </button>
            </div>
            <div className="dash-inline-stats detail-stats">
              <div>
                <strong>{number(detail.members)}</strong>
                <span>members</span>
              </div>
              <div>
                <strong>
                  {number(detail.voters)}
                  {detail.expectedVoters ? ` / ${detail.expectedVoters}` : ''}
                </strong>
                <span>submitted ballots</span>
              </div>
              <div>
                <strong>{number(detail.candidateCount)}</strong>
                <span>candidates in room</span>
              </div>
              <div>
                <strong>
                  {detail.matchScore === null ? '—' : `${detail.matchScore}%`}
                </strong>
                <span>saved match score</span>
              </div>
            </div>
            {detail.winner && (
              <div className="dash-winner-banner">
                <Trophy size={20} />
                <div>
                  <span>Current winner</span>
                  <strong>{detail.winner}</strong>
                </div>
              </div>
            )}
            <Panel
              title="Choice-by-choice results"
              subtitle="Up to 100 choices · counts across accepted ballots"
              Icon={Vote}
            >
              {detail.options.length ? (
                detail.options.map((o) => (
                  <article className="dash-option-result" key={o.id}>
                    <div>
                      <h3>{o.name}</h3>
                      {o.winner && (
                        <span className="dash-status completed">Winner</span>
                      )}
                    </div>
                    <VoteMix votes={o} small />
                  </article>
                ))
              ) : (
                <p className="dash-empty">
                  No saved choices for this room yet.
                </p>
              )}
            </Panel>
            <Panel
              title="Session feedback"
              subtitle="Latest 30 reviews for this room"
              Icon={MessageSquare}
            >
              {detail.feedback.length ? (
                detail.feedback.map((f) => (
                  <article className="dash-review" key={f.id}>
                    <div>
                      <strong>{f.choice}</strong>
                      <time>{date(f.createdAt)}</time>
                    </div>
                    <div className="dash-review-scores">
                      <span>Satisfaction {f.satisfaction}/5</span>
                      <span>Price accuracy {f.priceAccuracy}/5</span>
                    </div>
                    <p>{f.comment || 'No written comment.'}</p>
                  </article>
                ))
              ) : (
                <p className="dash-empty">No feedback for this room yet.</p>
              )}
            </Panel>
            <p className="dash-note">
              Created {date(detail.createdAt)} · Last room activity{' '}
              {date(detail.updatedAt)}. Personal device credentials, budgets and
              participant identities are not displayed.
            </p>
          </>
        )}
      </section>
    );
  return (
    <>
      <form
        className="dash-session-filters"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim() !== search) filters(setSearch, draft.trim());
        }}
      >
        <label className="dash-search">
          <Search size={16} />
          <input
            aria-label="Search sessions"
            placeholder="Search topics or winners"
            value={draft}
            maxLength={80}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <button className="dash-button primary" type="submit">
          Search
        </button>
        <label>
          <span>Status</span>
          <select
            aria-label="Session status"
            value={status}
            onChange={(e) => filters(setStatus, e.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(phaseNames).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Mode</span>
          <select
            aria-label="Session mode"
            value={mode}
            onChange={(e) => filters(setMode, e.target.value)}
          >
            <option value="all">All modes</option>
            <option value="discovery">Discovery</option>
            <option value="custom">Custom polls</option>
          </select>
        </label>
      </form>
      {error && (
        <div className="dash-error" role="alert">
          {error}{' '}
          <button
            className="dash-text-button"
            onClick={() => {
              setError('');
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}
      <Panel
        title="Session explorer"
        subtitle={
          result
            ? `${number(result.total)} matching rooms · newest first`
            : 'Finding sessions…'
        }
        Icon={Layers}
      >
        {!result ? (
          <p className="dash-loading" role="status">
            Loading sessions…
          </p>
        ) : result.items.length ? (
          <ul className="dash-session-list">
            {result.items.map((r) => (
              <li key={r.id}>
                <button
                  className="dash-session-card"
                  aria-label={`Open session ${r.topic} from ${date(r.createdAt)}`}
                  onClick={() => {
                    setDetail(null);
                    setSelected(r.id);
                    setError('');
                  }}
                >
                  <div className="dash-session-icon">
                    {r.status === 'completed' ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Layers size={18} />
                    )}
                  </div>
                  <div className="dash-session-main">
                    <strong>{r.topic || r.category}</strong>
                    <span>
                      {date(r.createdAt)} ·{' '}
                      {r.mode === 'custom' ? 'Custom poll' : 'Discovery'}
                    </span>
                    {r.winner && (
                      <span className="dash-session-winner">
                        <Trophy size={11} />
                        {r.winner}
                      </span>
                    )}
                  </div>
                  <div className="dash-session-counts">
                    <span>{r.members} members</span>
                    <span>
                      {r.voters} ballots · {r.ratings} ratings
                    </span>
                  </div>
                  <span className={`dash-status ${r.status}`}>
                    {phaseNames[r.status]}
                  </span>
                  <ChevronRight size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dash-empty">No sessions match these filters.</p>
        )}
        <div className="dash-pagination">
          <button
            className="dash-button secondary"
            disabled={page === 1 || !result}
            onClick={() => {
              setPage(page - 1);
              setResult(null);
            }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span>
            Page {page} of {Math.max(1, Math.ceil((result?.total || 0) / 20))}
          </span>
          <button
            className="dash-button secondary"
            disabled={!result || page * 20 >= result.total}
            onClick={() => {
              setPage(page + 1);
              setResult(null);
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </Panel>
      <p className="dash-note">
        Open a session to see individual choices, vote actions and feedback.
        Times here use your local timezone.
      </p>
    </>
  );
}
