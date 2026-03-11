import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Rating, Source, UnitNode } from '../lib/types';

const ratings: Rating[] = ['Easy', 'With Effort', 'Hard', 'Again'];

export function ReviewPanel({ unit, source, onSubmit }: { unit: UnitNode; source: Source; onSubmit: (rating: Rating, recall: string) => void }) {
  const [recall, setRecall] = useState('');
  return (
    <div className="review-layout">
      <section className="card viewer">
        <h3>{unit.title}</h3>
        <p className="muted">{source.title} · {unit.path} · {unit.locationLabel}</p>
        {source.type === 'pdf' ? (
          <iframe title={unit.title} src={`${source.originPath}#page=${unit.locationPayload.page ?? 1}`} className="embedded" />
        ) : (
          <div className="embedded text-view"><ReactMarkdown>{unit.content ?? 'No content snippet available.'}</ReactMarkdown></div>
        )}
      </section>
      <section className="card metadata">
        <h4>Recall</h4>
        <textarea value={recall} onChange={(e) => setRecall(e.target.value)} placeholder="Write what you remember before rating..." rows={8} />
        <div className="rating-grid">{ratings.map((rating) => <button key={rating} className="btn" onClick={() => onSubmit(rating, recall)}>{rating}</button>)}</div>
      </section>
    </div>
  );
}
