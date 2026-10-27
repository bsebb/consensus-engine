import React from 'react';
import {
  MessageSquare,
  Star,
  CheckCircle2,
} from 'lucide-react';
import {
  Panel,
  Metric,
} from './DashboardCommon';
import {
  number,
  date,
} from './DashboardFormatters';

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
            summary.satisfaction === null ? '-' : `${summary.satisfaction}/5`
          }
          caption="From submitted reviews"
          Icon={Star}
        />
        <Metric
          label="Average price accuracy"
          value={
            summary.priceAccuracy == null ? '-' : `${summary.priceAccuracy}/5`
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
