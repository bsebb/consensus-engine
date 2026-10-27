import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Trophy,
  Vote,
  MessageSquare,
} from 'lucide-react';
import { dashboardRequest as request } from '../../utils/dashboardApi';
import {
  Panel,
  VoteMix,
} from './DashboardCommon';
import {
  number,
  date,
  phaseNames,
} from './DashboardFormatters';

export function SessionDetailView({
  selected,
  traffic,
  revision,
  onUnauthorized,
  onClassified,
  onBack,
}) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [classifying, setClassifying] = useState(false);

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
      setDetail(null);
      setAttempt((n) => n + 1);
      onClassified();
    } catch (e) {
      if (e.status === 401) onUnauthorized();
      setError(e.message);
    } finally {
      setClassifying(false);
    }
  }

  return (
    <section className="dash-session-detail">
      <button
        className="dash-button secondary"
        onClick={onBack}
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
          Loading this session...
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
                ? 'Saving...'
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
                {detail.matchScore === null ? '-' : `${detail.matchScore}%`}
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
}
