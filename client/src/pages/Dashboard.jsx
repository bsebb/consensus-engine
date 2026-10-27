import React, { useEffect, useState } from 'react';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import {
  Fingerprint,
  ArrowUpRight,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Users,
  Vote,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import './Dashboard.css';

const API = '/api/v1/dashboard';
async function request(path, body) {
  const response = await fetch(API + path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Dashboard temporarily unavailable. Please try again.');
  }
  if (!response.ok) {
    const error = new Error(data.error || 'Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}
const number = (n) => new Intl.NumberFormat('en').format(n || 0);
function Metric({ label, value, caption, Icon }) {
  return (
    <article className="dash-metric">
      <div className="dash-metric-top">
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <p>{caption}</p>
    </article>
  );
}
export default function Dashboard() {
  const [setupToken, setSetupToken] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('setup') || ''
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  // The one-time setup capability stays in memory and is removed from browser history.
  useEffect(() => {
    if (window.location.hash)
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname
      );
    const oldTitle = document.title;
    document.title = 'Owner Dashboard · NoYouPick';
    const receiveSetupLink = () => {
      const nextToken = new URLSearchParams(window.location.hash.slice(1)).get(
        'setup'
      );
      if (nextToken) {
        setSetupToken(nextToken);
        setError('');
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname
        );
      }
    };
    window.addEventListener('hashchange', receiveSetupLink);
    let cancelled = false;
    request('/session')
      .then((result) => {
        if (!cancelled) setAuthenticated(result.authenticated);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', receiveSetupLink);
      document.title = oldTitle;
    };
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    request(`/analytics?days=${days}`)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          if (e.status === 401) {
            setAuthenticated(false);
            setData(null);
          }
          setError(e.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authenticated, days]);
  async function signIn() {
    setBusy(true);
    setError('');
    try {
      if (!browserSupportsWebAuthn())
        throw new Error(
          'Open this page in a browser that supports passkeys, such as Safari or Chrome.'
        );
      const registering = Boolean(setupToken);
      const step = await request(
        registering ? '/register/options' : '/login/options',
        registering ? { setupToken } : {}
      );
      const response = registering
        ? await startRegistration({ optionsJSON: step.options })
        : await startAuthentication({ optionsJSON: step.options });
      await request(registering ? '/register/verify' : '/login/verify', {
        challengeId: step.challengeId,
        response,
        ...(registering ? { setupToken } : {}),
      });
      setSetupToken('');
      setAuthenticated(true);
    } catch (e) {
      setError(
        e.name === 'NotAllowedError' || e.name === 'AbortError'
          ? 'Passkey sign-in was cancelled. You can try again.'
          : e.message
      );
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    setError('');
    try {
      setData(await request(`/analytics?days=${days}`));
    } catch (e) {
      if (e.status === 401) {
        setAuthenticated(false);
        setData(null);
      }
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await request('/logout', {});
      setAuthenticated(false);
      setData(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const summary = data?.summary;
  const trend = data
    ? Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setUTCDate(date.getUTCDate() - days + 1 + i);
        const day = date.toISOString().slice(0, 10);
        return {
          day,
          rooms: data.daily.find((d) => d.day === day)?.rooms || 0,
        };
      })
    : [];
  const max = Math.max(1, ...trend.map((d) => d.rooms));
  return (
    <main className="owner-dashboard">
      <header className="dash-header">
        <a className="dash-brand" href="/">
          NoYouPick<span>OWNER</span>
        </a>
        <div className="dash-header-right">
          <span className="dash-private">
            <ShieldCheck size={15} /> Private access
          </span>
          {authenticated && (
            <button
              className="dash-button secondary"
              onClick={logout}
              disabled={busy}
            >
              <LogOut size={16} /> Sign out
            </button>
          )}
        </div>
      </header>
      {!authenticated ? (
        <section className="dash-login">
          <div className="dash-key">
            <Fingerprint size={38} />
          </div>
          <span className="dash-eyebrow">YOUR APP, AT A GLANCE</span>
          <h1>{setupToken ? 'Make this dashboard yours.' : 'Welcome back.'}</h1>
          <p>
            {setupToken
              ? 'Register your passkey to unlock your private app dashboard. Your device will ask you to confirm.'
              : 'Sign in with your passkey to see how people are using NoYouPick.'}
          </p>
          {error && (
            <div className="dash-error" role="alert">
              {error}
            </div>
          )}
          <button
            className="dash-button primary"
            disabled={checking || busy}
            onClick={signIn}
          >
            <Fingerprint size={19} />
            {checking
              ? 'Checking access…'
              : busy
                ? 'Waiting for your passkey…'
                : setupToken
                  ? 'Create my passkey'
                  : 'Sign in with passkey'}
          </button>
          <small>
            Face ID, Touch ID, your device PIN or a security key.
            <br />
            Only the registered owner can sign in.
          </small>
          <a className="dash-back" href="/">
            Back to the app <ArrowUpRight size={14} />
          </a>
        </section>
      ) : (
        <div className="dash-content">
          <section className="dash-title">
            <div>
              <span className="dash-eyebrow">OWNER DASHBOARD</span>
              <h1>How’s it picking?</h1>
              <p>A clear view of the choices people are making together.</p>
            </div>
            <div className="dash-actions">
              <label className="dash-period">
                <span>Period</span>
                <select
                  value={days}
                  onChange={(e) => {
                    setData(null);
                    setDays(Number(e.target.value));
                  }}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </label>
              <button
                className="dash-button secondary"
                disabled={busy}
                onClick={refresh}
              >
                <RefreshCw size={16} />
                {busy ? 'Updating…' : 'Refresh'}
              </button>
            </div>
          </section>
          {error && (
            <div className="dash-error" role="alert">
              {error}
            </div>
          )}
          {!summary ? (
            <div className="dash-loading" role="status">
              Loading your app data…
            </div>
          ) : (
            <>
              <section className="dash-metrics" aria-label="App metrics">
                <Metric
                  label="Rooms created"
                  value={number(summary.rooms)}
                  caption={`${number(summary.recentlyActive)} active in the last 30 minutes`}
                  Icon={Activity}
                />
                <Metric
                  label="Unique browsers"
                  value={number(summary.uniqueDevices)}
                  caption={`${number(summary.joins)} total room joins`}
                  Icon={Users}
                />
                <Metric
                  label="Picks completed"
                  value={number(summary.resolved)}
                  caption={`${summary.completionRate}% of rooms reached a result`}
                  Icon={CheckCircle2}
                />
                <Metric
                  label="People who voted"
                  value={number(summary.voters)}
                  caption={`${number(summary.ratings)} individual card ratings`}
                  Icon={Vote}
                />
              </section>
              <section className="dash-panel dash-trend">
                <div className="dash-panel-heading">
                  <div>
                    <h2>Room activity</h2>
                    <p>New rooms by day · UTC</p>
                  </div>
                  <span className="dash-pill">
                    {number(summary.rooms)} rooms
                  </span>
                </div>
                <div
                  className="dash-chart"
                  role="img"
                  aria-label={`Daily room creation over the last ${days} days`}
                >
                  {trend.map((d) => (
                    <div
                      key={d.day}
                      className="dash-bar-slot"
                      title={`${d.day}: ${d.rooms} rooms`}
                    >
                      <div
                        className="dash-bar"
                        style={{
                          height: `${Math.max(d.rooms ? 2 : 0, (d.rooms / max) * 100)}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="dash-chart-labels">
                  <span>{trend[0]?.day}</span>
                  <span>{trend.at(-1)?.day}</span>
                </div>
              </section>
              <div className="dash-columns">
                <section className="dash-panel">
                  <div className="dash-panel-heading">
                    <div>
                      <h2>What people are picking</h2>
                      <p>Most popular room categories</p>
                    </div>
                  </div>
                  {data.categories.length ? (
                    data.categories.map((c, i) => (
                      <div className="dash-row" key={c.category}>
                        <span className="dash-rank">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{c.category}</span>
                        <strong>{number(c.rooms)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="dash-empty">No rooms in this period yet.</p>
                  )}
                </section>
                <section className="dash-panel">
                  <div className="dash-panel-heading">
                    <div>
                      <h2>Group favourites</h2>
                      <p>Choices that won the most rooms</p>
                    </div>
                  </div>
                  {data.popular.length ? (
                    data.popular.map((p, i) => (
                      <div className="dash-row" key={p.name}>
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
                    <p className="dash-empty">
                      Completed picks will appear here.
                    </p>
                  )}
                </section>
              </div>
              <section className="dash-feedback">
                <div>
                  <h2>The feedback loop</h2>
                  <p>How people felt about their picks.</p>
                </div>
                <div>
                  <strong>{number(summary.feedback)}</strong>
                  <span>reviews submitted</span>
                </div>
                <div>
                  <strong>
                    {summary.satisfaction === null
                      ? '—'
                      : `${summary.satisfaction}/5`}
                  </strong>
                  <span>average satisfaction</span>
                </div>
                <div>
                  <strong>{number(summary.customRooms)}</strong>
                  <span>custom polls created</span>
                </div>
              </section>
              <footer className="dash-footer">
                <span>
                  Updated{' '}
                  {new Date(data.asOf).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · aggregated data
                </span>
                <p>
                  Based on retained app records. Expired rooms may have been
                  removed. Browsers are anonymous device identities, not
                  verified people.
                </p>
              </footer>
            </>
          )}
        </div>
      )}
    </main>
  );
}
