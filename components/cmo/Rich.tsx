/** Renders any generated JSON document as readable headings, lists and tables. */
const label = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
export default function Rich({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value == null || value === '') return null;
  if (typeof value !== 'object') return <span>{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.every(v => typeof v !== 'object')) return <ul className="ticks small">{value.map((v, i) => <li key={i}>{String(v)}</li>)}</ul>;
    return <div className="rich-list">{value.map((v, i) => <div key={i} className="rich-item"><Rich value={v} depth={depth + 1} /></div>)}</div>;
  }
  return <div className="rich">{Object.entries(value as Record<string, unknown>).filter(([k]) => k !== 'at').map(([k, v]) => typeof v === 'object' && v !== null
    ? <div key={k}>{depth < 2 ? <h4>{label(k)}</h4> : <b className="small">{label(k)}</b>}<Rich value={v} depth={depth + 1} /></div>
    : <p key={k} className="small"><b>{label(k)}:</b> {String(v)}</p>)}</div>;
}
