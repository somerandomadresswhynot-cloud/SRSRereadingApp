import { useState } from 'react';
import { useAppState } from '../lib/store';

export function SettingsPage() {
  const { settings, updateSettings } = useAppState();
  const [form, setForm] = useState(settings);

  return (
    <div className="stack">
      <section className="card">
        <h2>Scheduling</h2>
        {[
          ['targetReviewMinutesPerDay', 'Target review minutes/day'],
          ['targetLearningMinutesPerDay', 'Target new-learning minutes/day'],
          ['maxTotalMinutesPerDay', 'Max total minutes/day'],
          ['targetRetention', 'Target retention']
        ].map(([key, label]) => <label key={key}>{label}<input type="number" value={form[key as keyof typeof form] as number} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} /></label>)}
      </section>

      <section className="card">
        <h2>Review behavior</h2>
        <label>Default minutes per page<input type="number" step="0.1" value={form.defaultMinutesPerPage} onChange={(e) => setForm({ ...form, defaultMinutesPerPage: Number(e.target.value) })} /></label>
        <label><input type="checkbox" checked={form.manualReviewsAffectScheduling} onChange={(e) => setForm({ ...form, manualReviewsAffectScheduling: e.target.checked })} /> Manual reviews affect scheduling</label>
        <label><input type="checkbox" checked={form.allowNewItemsWhenLoadHigh} onChange={(e) => setForm({ ...form, allowNewItemsWhenLoadHigh: e.target.checked })} /> Allow new items when due load is high</label>
      </section>

      <section className="card">
        <h2>Display</h2>
        <label>Density<select value={form.density} onChange={(e) => setForm({ ...form, density: e.target.value as 'compact' | 'comfortable' })}><option value="comfortable">comfortable</option><option value="compact">compact</option></select></label>
        <button className="btn" onClick={() => updateSettings(form)}>Save settings</button>
      </section>
    </div>
  );
}
