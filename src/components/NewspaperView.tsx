import type { Edition, NewspaperSection } from '@/types/edition';

/**
 * On-screen newspaper, rendering the canonical Edition document model — the same
 * one the PDF renderer uses. Styled by `.np-*` classes in globals.css.
 */
export function NewspaperView({ edition }: { edition: Edition }) {
  return (
    <div className="np" id="editionPaper">
      <div className="np-mast">
        <div className="np-flags">
          <span>Personal Edition</span>
          <span>Vol. {String(edition.editionNo).padStart(3, '0')}</span>
        </div>
        <h1>{edition.masthead}</h1>
        <div className="np-tag">{edition.tagline}</div>
        <div className="np-sub">
          <span>{edition.dateDisplay}</span>
          <span>{edition.sourceEventIds.length} events</span>
        </div>
      </div>

      {edition.quote && (
        <div className="np-quote">
          <span className="ql">“</span>
          {edition.quote.text}
          <span className="qa">— {edition.quote.author}</span>
        </div>
      )}

      <div className="np-lead">
        <div className="np-leadcat">Your Say</div>
        <h2>{edition.leadHeadline}</h2>
        {edition.leadBody && <p className="np-leadbody">{edition.leadBody}</p>}
      </div>

      <div className="np-cols">
        {edition.sections.map((s, i) => (
          <SectionBlock key={i} section={s} />
        ))}
        {edition.missingEventIds.length > 0 && (
          <section className="np-sec np-missing">
            <h3>Also on your schedule</h3>
            <p>These events could not be placed in a section and are listed so nothing is lost:</p>
            <ul>
              {edition.missingEventIds.map((id) => (
                <li key={id}>Event {id}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="np-foot">
        {edition.masthead} · {edition.dateDisplay}
      </div>
    </div>
  );
}

function SectionBlock({ section: s }: { section: NewspaperSection }) {
  if (s.type === 'agenda') {
    const anytime = s.items?.[0];
    return (
      <section className="np-sec">
        <h3>{s.title}</h3>
        <table className="np-agenda">
          <tbody>
            {(s.rows ?? []).map((r, i) => (
              <tr key={i}>
                <td className="t">{r.time}</td>
                <td className="e">
                  <b>{r.title}</b>
                  <span>{r.details}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {anytime && anytime.lines.length > 0 && (
          <div className="np-anytime">
            <div className="ah">{anytime.heading ?? 'Anytime Today'}</div>
            {anytime.lines.map((l, i) => (
              <div className="al" key={i}>
                • {l}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (s.type === 'glance') {
    return (
      <section className="np-sec np-glance">
        <h3>{s.title}</h3>
        <ul>
          {(s.items?.[0]?.lines ?? []).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>
    );
  }

  if (s.type === 'editorsNote') {
    return (
      <section className="np-sec np-note">
        <h3>{s.title}</h3>
        <p>{s.items?.[0]?.lines[0]}</p>
      </section>
    );
  }

  return (
    <section className="np-sec">
      <h3>{s.title}</h3>
      {(s.items ?? []).map((it, i) => (
        <div className="np-item" key={i}>
          {it.heading && <h4>{it.heading}</h4>}
          {it.lines.map((l, j) => (
            <p key={j}>{l}</p>
          ))}
          {it.checklist && it.checklist.length > 0 && (
            <ul className="np-check">
              {it.checklist.map((c, k) => (
                <li key={k}>
                  {c.completed ? '☑' : '☐'} {c.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
