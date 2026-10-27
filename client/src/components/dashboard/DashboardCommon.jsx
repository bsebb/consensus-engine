import React from 'react';
import {
  number,
  percent,
  actions,
} from './DashboardFormatters';

export function Panel({ title, subtitle, Icon, children, className = '' }) {
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

export function Metric({ label, value, caption, Icon }) {
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
