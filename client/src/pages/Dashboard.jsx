import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import {
  Fingerprint,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import BrandLogo from '../components/ui/BrandLogo';
import { dashboardRequest as request } from '../utils/dashboardApi';
import {
  Overview,
  SessionExplorer,
  FeedbackList,
} from '../components/dashboard/DashboardViews';
import './Dashboard.css';

export default function Dashboard() {
  const [setupToken, setSetupToken] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('setup') || ''
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [traffic, setTraffic] = useState('real');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const requestVersion = useRef(0);
  const expireSession = useCallback(() => {
    requestVersion.current++;
    setAuthenticated(false);
    setData(null);
    setError('Your session expired. Please sign in again.');
  }, []);
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
    const version = ++requestVersion.current;
    request(`/analytics?days=${days}&traffic=${traffic}`)
      .then((result) => {
        if (!cancelled && version === requestVersion.current) {
          setData(result);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled && version === requestVersion.current) {
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
  }, [authenticated, days, traffic]);
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
    const version = ++requestVersion.current;
    try {
      const result = await request(
        `/analytics?days=${days}&traffic=${traffic}`
      );
      if (version === requestVersion.current) setData(result);
    } catch (e) {
      if (version !== requestVersion.current) return;
      if (e.status === 401) {
        setAuthenticated(false);
        setData(null);
      }
      setError(e.message);
    } finally {
      if (version === requestVersion.current) setBusy(false);
    }
  }
  async function logout() {
    requestVersion.current++;
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
  return (
    <main className="owner-dashboard">
      <header className="dash-header">
        <a className="dash-brand" href="/">
          <span className="dash-logo">
            <BrandLogo size={24} />
          </span>
          <span>
            <strong>NoYouPick</strong>
            <small>Owner dashboard</small>
          </span>
        </a>
        <div className="dash-header-right">
          <span className="dash-private">
            <ShieldCheck size={13} /> Private
          </span>
          <ThemeToggle />
          {authenticated && (
            <button
              className="dash-button secondary dash-signout"
              aria-label="Sign out"
              onClick={logout}
              disabled={busy}
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </header>
      {!authenticated ? (
        <section className="dash-login">
          <div className="dash-key">
            <Fingerprint size={34} />
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
            <Fingerprint size={18} />
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
            <ArrowLeft size={14} /> Back to the app
          </a>
        </section>
      ) : (
        <div className="dash-content">
          <section className="dash-title">
            <div>
              <span className="dash-eyebrow">BEHIND THE PICKS</span>
              <h1>Your app. In detail.</h1>
              <p>
                See what brings people together, and where their picks end up.
              </p>
            </div>
            <div className="dash-actions">
              <label className="dash-period">
                <span>Activity</span>
                <select
                  aria-label="Activity type"
                  value={traffic}
                  onChange={(e) => {
                    requestVersion.current++;
                    setData(null);
                    setBusy(false);
                    setTraffic(e.target.value);
                  }}
                >
                  <option value="real">User activity</option>
                  <option value="test">Test sessions</option>
                  <option value="all">All activity</option>
                </select>
              </label>
              <label className="dash-period">
                <span>Period</span>
                <select
                  value={days}
                  onChange={(e) => {
                    requestVersion.current++;
                    setData(null);
                    setBusy(false);
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
                <RefreshCw size={15} />
                {busy ? 'Updating…' : 'Refresh'}
              </button>
            </div>
          </section>
          <nav className="dash-tabs" aria-label="Dashboard sections">
            {[
              ['overview', 'Overview'],
              ['sessions', 'Sessions'],
              ['feedback', 'Feedback'],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-current={tab === key ? 'page' : undefined}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
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
              {tab === 'overview' && (
                <Overview data={data} onSessions={() => setTab('sessions')} />
              )}
              {tab === 'sessions' && (
                <SessionExplorer
                  key={`${days}-${traffic}`}
                  days={days}
                  traffic={traffic}
                  onClassified={refresh}
                  revision={data.asOf}
                  onUnauthorized={expireSession}
                />
              )}{' '}
              {tab === 'feedback' && (
                <FeedbackList items={data.feedback} summary={summary} />
              )}
              <footer className="dash-footer">
                <span>
                  Updated{' '}
                  {new Date(data.asOf).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · chart dates in UTC
                </span>
                <p>
                  {traffic === 'real'
                    ? 'Confirmed test sessions are excluded. '
                    : traffic === 'test'
                      ? 'Showing test sessions only. '
                      : 'Showing user activity and test sessions. '}
                  Figures cover rooms created in this period and their recorded
                  activity. Older expired records may have been removed. Browser
                  identities are anonymous.
                </p>
              </footer>
            </>
          )}
        </div>
      )}
    </main>
  );
}
