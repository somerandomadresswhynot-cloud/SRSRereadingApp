import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { formatDate, toDateOnly } from '../lib/date';
import { useAppState } from '../lib/store';
import type { Rating, Source, UnitNode } from '../lib/types';

const ratings: Rating[] = ['Easy', 'With Effort', 'Hard', 'Again'];

type ReviewSection = 'viewer' | 'notes' | 'timer';

export function ReviewPanel({ unit, source, onSubmit }: { unit: UnitNode; source: Source; onSubmit: (rating: Rating, recall: string, reviewedAt?: string, durationMinutes?: number) => void }) {
  const { recordTimerEvent } = useAppState();
  const [recall, setRecall] = useState('');
  const [viewerScale, setViewerScale] = useState(1);
  const [sectionScale, setSectionScale] = useState<Record<ReviewSection, number>>({ viewer: 1, notes: 1, timer: 1 });
  const [sectionOrder, setSectionOrder] = useState<ReviewSection[]>(['viewer', 'notes', 'timer']);
  const [timerStart, setTimerStart] = useState<string | null>(null);
  const [pausedMinutes, setPausedMinutes] = useState(0);
  const [hideNumbers, setHideNumbers] = useState(false);
  const [manualWhen, setManualWhen] = useState(toDateOnly(new Date()));
  const [manualMinutes, setManualMinutes] = useState(0);

  const elapsedMinutes = useMemo(() => {
    if (!timerStart) return pausedMinutes;
    return pausedMinutes + Math.max(0, Math.round((Date.now() - new Date(timerStart).getTime()) / 60000));
  }, [pausedMinutes, timerStart]);

  const reorder = (section: ReviewSection, direction: -1 | 1) => {
    const index = sectionOrder.indexOf(section);
    const next = index + direction;
    if (next < 0 || next >= sectionOrder.length) return;
    const cloned = [...sectionOrder];
    [cloned[index], cloned[next]] = [cloned[next], cloned[index]];
    setSectionOrder(cloned);
  };

  const stopTimer = async () => {
    if (!timerStart) return;
    const end = toDateOnly(new Date());
    const minutes = elapsedMinutes;
    await recordTimerEvent({ unitId: unit.id, startedAt: timerStart.slice(0, 10), endedAt: end, minutesSpent: minutes, note: 'review-session' });
    setTimerStart(null);
    setPausedMinutes(minutes);
    setManualMinutes(minutes);
  };

  const sectionTitle = (name: ReviewSection) => name === 'viewer' ? 'Reader' : name === 'notes' ? 'Recall' : 'Timer';

  const renderSection = (name: ReviewSection) => {
    if (name === 'viewer') {
      return <section key={name} className="card viewer panel-section" style={{ transform: `scale(${sectionScale[name]})`, transformOrigin: 'top left' }}>
        <div className="row spread"><h3>{unit.title}</h3><label>Scale<input type="range" min="0.8" max="1.5" step="0.1" value={viewerScale} onChange={(e) => setViewerScale(Number(e.target.value))} /></label></div>
        <p className="muted">{source.title} · {unit.path} · {unit.locationLabel}</p>
        {source.type === 'pdf' ? (
          <iframe title={unit.title} src={`${source.originPath}#page=${unit.locationPayload.page ?? 1}&zoom=${Math.round(viewerScale * 100)}`} className="embedded" style={{ height: `${Math.round(380 * viewerScale)}px` }} />
        ) : (
          <div className="embedded text-view" style={{ fontSize: `${viewerScale}rem` }}><ReactMarkdown>{unit.content ?? 'No content snippet available.'}</ReactMarkdown></div>
        )}
      </section>;
    }

    if (name === 'notes') {
      return <section key={name} className="card metadata panel-section" style={{ transform: `scale(${sectionScale[name]})`, transformOrigin: 'top left' }}>
        <h4>Recall</h4>
        <p className="muted">All review dates are stored as date-only values.</p>
        <textarea value={recall} onChange={(e) => setRecall(e.target.value)} placeholder="Write what you remember before rating..." rows={8} />
        <div className="rating-grid">{ratings.map((rating) => <button key={rating} className="btn" onClick={() => onSubmit(rating, recall, undefined, elapsedMinutes || undefined)}>{rating}</button>)}</div>
      </section>;
    }

    return <section key={name} className="card metadata panel-section" style={{ transform: `scale(${sectionScale[name]})`, transformOrigin: 'top left' }}>
      <h4>Timer</h4>
      <div className="row">
        <button className="btn" onClick={() => setTimerStart(new Date().toISOString())} disabled={!!timerStart}>Start</button>
        <button className="ghost" onClick={stopTimer} disabled={!timerStart}>Stop</button>
        <button className="ghost" onClick={() => { setTimerStart(null); setPausedMinutes(0); setManualMinutes(0); }}>Reset</button>
      </div>
      <label><input type="checkbox" checked={hideNumbers} onChange={(e) => setHideNumbers(e.target.checked)} /> Hide timer numbers</label>
      <p>{hideNumbers ? '••••' : `${elapsedMinutes} minutes`}</p>
      <label>Manual recall date<input type="date" value={manualWhen} onChange={(e) => setManualWhen(e.target.value)} /></label>
      <label>Manual time spent (minutes)<input type="number" min={0} value={manualMinutes} onChange={(e) => setManualMinutes(Number(e.target.value))} /></label>
      <p className="muted">Date-only log: {formatDate(manualWhen)}</p>
      <div className="rating-grid">{ratings.map((rating) => <button key={`manual-${rating}`} className="ghost" onClick={() => onSubmit(rating, recall, manualWhen, manualMinutes || undefined)}>Manual {rating}</button>)}</div>
    </section>;
  };

  return (
    <div className="review-layout">
      {sectionOrder.map((section) => <div key={`wrap-${section}`} className="stack section-wrap">
        <div className="row section-head"><strong>{sectionTitle(section)}</strong><button className="ghost" onClick={() => reorder(section, -1)}>↑</button><button className="ghost" onClick={() => reorder(section, 1)}>↓</button><label>Section scale<input type="range" min="0.8" max="1.3" step="0.1" value={sectionScale[section]} onChange={(e) => setSectionScale((s) => ({ ...s, [section]: Number(e.target.value) }))} /></label></div>
        {renderSection(section)}
      </div>)}
    </div>
  );
}
