import React, { useEffect, useState } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Layers,
  Trophy,
} from 'lucide-react';
import { dashboardRequest as request } from '../../utils/dashboardApi';
import {
  Panel,
} from './DashboardCommon';
import {
  number,
  date,
  phaseNames,
} from './DashboardFormatters';
import { SessionDetailView } from './SessionDetailView';

export function SessionExplorer({
  days,
  traffic,
  revision,
  onUnauthorized,
  onClassified,
}) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [mode, setMode] = useState('all');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

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

  function filters(set, value) {
    set(value);
    setPage(1);
    setResult(null);
    setError('');
  }

  if (selected) {
    return (
      <SessionDetailView
        selected={selected}
        traffic={traffic}
        revision={revision}
        onUnauthorized={onUnauthorized}
        onClassified={() => {
          setSelected(null);
          setResult(null);
          setAttempt((n) => n + 1);
          onClassified();
        }}
        onBack={() => {
          setSelected(null);
          setError('');
        }}
      />
    );
  }

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
            : 'Finding sessions...'
        }
        Icon={Layers}
      >
        {!result ? (
          <p className="dash-loading" role="status">
            Loading sessions...
          </p>
        ) : result.items.length ? (
          <ul className="dash-session-list">
            {result.items.map((r) => (
              <li key={r.id}>
                <button
                  className="dash-session-card"
                  aria-label={`Open session ${r.topic} from ${date(r.createdAt)}`}
                  onClick={() => {
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
