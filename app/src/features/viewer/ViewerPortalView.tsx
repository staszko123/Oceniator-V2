import { AlertTriangle, CheckCircle2, ClipboardList, LineChart, Mail, MonitorCog, PhoneCall, ShieldCheck, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { TYPE_LABELS } from '../../domain/defs'
import type { AdminConfig, Assessment, AssessmentType, UserProfile } from '../../domain/types'
import { scoreClass } from '../../lib/display'
import { dashboardTrend, sectionBreakdown, weakestCriteria } from '../dashboard/utils'
import { statusLabels } from '../registry/registryExports'

function typeIcon(type: AssessmentType) {
  if (type === 'r') return <PhoneCall size={15} />
  if (type === 'm') return <Mail size={15} />
  return <MonitorCog size={15} />
}

function formatScore(value: number | null): string {
  return value === null ? '-' : `${value}%`
}

function lastAssessments(rows: Assessment[]): Assessment[] {
  return [...rows]
    .sort((left, right) => (
      right.data.localeCompare(left.data)
      || right.createdAt.localeCompare(left.createdAt)
      || right.avgFinal - left.avgFinal
    ))
    .slice(0, 6)
}

function average(rows: Assessment[]): number | null {
  if (!rows.length) return null
  return Math.round(rows.reduce((acc, item) => acc + item.avgFinal, 0) / rows.length)
}

function trendDelta(rows: Assessment[]): number | null {
  const trend = dashboardTrend(rows).filter((item) => item.count > 0)
  if (trend.length < 2) return null
  return trend[trend.length - 1].avg - trend[trend.length - 2].avg
}

function goalMessage(avg: number | null, minAvg: number): string {
  if (avg === null) return 'Brak ocen w aktualnym zakresie.'
  if (avg >= minAvg) return `Wynik jest ${avg - minAvg} pp ponad celem jakości.`
  return `Do celu jakości brakuje ${minAvg - avg} pp.`
}

export default function ViewerPortalView({
  user,
  assessments,
  goals,
}: {
  user: UserProfile
  assessments: Assessment[]
  goals: AdminConfig['goals']
}) {
  const active = assessments.filter((item) => item.status !== 'archived')
  const recent = lastAssessments(active)
  const latest = recent[0]
  const avg = average(active)
  const delta = trendDelta(active)
  const below = active.filter((item) => item.rating === 'below' || item.avgFinal < goals.minAvg).length
  const great = active.filter((item) => item.rating === 'great' || item.avgFinal >= 92).length
  const trend = dashboardTrend(active).slice(-5)
  const weak = weakestCriteria(active).slice(0, 5)
  const strengths = sectionBreakdown(active).sort((left, right) => right.avg - left.avg).slice(0, 4)
  const typeStats = (Object.keys(TYPE_LABELS) as AssessmentType[]).map((type) => {
    const rows = active.filter((item) => item.type === type)
    return { type, rows, avg: average(rows) }
  })
  const priority = weak[0]
  const strongest = strengths[0]

  return (
    <main className="screen viewer-portal-screen">
      <section className="viewer-hero">
        <div className="viewer-hero-main">
          <div className="section-title">
            <span>Moje centrum jakości</span>
            <small>{active.length} ocen w profilu</small>
          </div>
          <h1>{user.fullName}</h1>
          <p>{goalMessage(avg, goals.minAvg)}</p>
          <div className="viewer-hero-strip">
            <span><ShieldCheck size={15} /> Tylko Twoje wyniki</span>
            <span><Target size={15} /> Cel {goals.minAvg}%</span>
            <span>
              {delta === null ? <LineChart size={15} /> : delta >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {delta === null ? 'Trend po kolejnej ocenie' : `${delta >= 0 ? '+' : ''}${delta} pp vs poprzedni okres`}
            </span>
          </div>
        </div>
        <div className="viewer-score-tower">
          <span>Aktualna średnia</span>
          <strong>{formatScore(avg)}</strong>
          <small>{active.length ? `${great} ocen bardzo dobrych • ${below} poniżej celu` : 'Czekamy na pierwszą ocenę'}</small>
        </div>
      </section>

      <section className="viewer-kpi-grid">
        <div className="metric-panel premium"><span>Ostatni wynik</span><strong>{latest ? `${latest.avgFinal}%` : '-'}</strong><small>{latest ? `${TYPE_LABELS[latest.type]} • ${latest.period}` : 'brak ocen'}</small></div>
        <div className="metric-panel premium"><span>Średnia jakości</span><strong>{formatScore(avg)}</strong><small>cel {goals.minAvg}%</small></div>
        <div className="metric-panel premium"><span>Do poprawy</span><strong>{weak.length}</strong><small>najniższe kryteria</small></div>
        <div className="metric-panel premium"><span>Mocne strony</span><strong>{strengths.length}</strong><small>najlepsze sekcje ocen</small></div>
      </section>

      <section className="viewer-focus-grid">
        <article className="data-panel viewer-plan-panel">
          <div className="section-title"><span>Priorytet na teraz</span><small>najważniejszy sygnał z ocen</small></div>
          {priority ? (
            <div className="viewer-priority">
              <div className="viewer-priority-icon"><AlertTriangle size={24} /></div>
              <div>
                <strong>{priority.label}</strong>
                <p>Najniższy obszar w Twoim profilu jakości. Warto go potraktować jako pierwszy temat do pracy.</p>
                <span className={scoreClass(priority.avg)}>{priority.avg}%</span>
              </div>
            </div>
          ) : (
            <div className="empty-state compact-empty">Po pierwszych ocenach pojawi się tutaj główny priorytet rozwojowy.</div>
          )}
          <div className="viewer-coaching-row">
            <div>
              <span>Najmocniejszy obszar</span>
              <strong>{strongest ? strongest.label : '-'}</strong>
              <small>{strongest ? `${strongest.avg}% średnio` : 'brak danych'}</small>
            </div>
            <div>
              <span>Stabilność</span>
              <strong>{delta === null ? '-' : `${delta >= 0 ? '+' : ''}${delta} pp`}</strong>
              <small>zmiana względem poprzedniego okresu</small>
            </div>
          </div>
        </article>

        <article className="data-panel">
          <div className="section-title"><span>Trend wyników</span><small>ostatnie okresy</small></div>
          {trend.length ? (
            <div className="viewer-trend">
              {trend.map((item) => (
                <div className="viewer-trend-point" key={item.period}>
                  <div className="viewer-trend-bar" style={{ ['--bar-height' as string]: `${Math.max(14, item.avg)}%` }}>
                    <i />
                  </div>
                  <strong>{item.avg}%</strong>
                  <span>{item.period}</span>
                  <small>{item.count} ocen</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">Trend pojawi się po zapisaniu ocen w co najmniej jednym okresie.</div>
          )}
        </article>
      </section>

      <section className="viewer-detail-grid">
        <article className="data-panel">
          <div className="section-title"><span>Obszary do poprawy</span><small>od najniższych kryteriów</small></div>
          {weak.length ? (
            <div className="viewer-quality-list">
              {weak.map((item) => (
                <div className="viewer-quality-row" key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.count} ocen cząstkowych</span>
                  </div>
                  <div className="viewer-quality-meter"><i style={{ width: `${item.avg}%` }} /></div>
                  <span className={scoreClass(item.avg)}>{item.avg}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">Brak słabych kryteriów do pokazania.</div>
          )}
        </article>

        <article className="data-panel">
          <div className="section-title"><span>Mocne strony</span><small>najwyższe sekcje jakości</small></div>
          {strengths.length ? (
            <div className="viewer-strength-grid">
              {strengths.map((item) => (
                <div className="viewer-strength-card" key={item.label}>
                  <CheckCircle2 size={17} />
                  <strong>{item.label}</strong>
                  <span>{item.avg}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">Mocne strony pojawią się po pierwszej ocenie.</div>
          )}
        </article>
      </section>

      <section className="viewer-bottom-grid">
        <article className="data-panel">
          <div className="section-title"><span>Typy ocen</span><small>rozmowy, maile i systemy</small></div>
          <div className="viewer-type-grid">
            {typeStats.map((item) => (
              <div className="viewer-type-card" key={item.type}>
                <div>{typeIcon(item.type)}<span>{TYPE_LABELS[item.type]}</span></div>
                <strong>{formatScore(item.avg)}</strong>
                <small>{item.rows.length} ocen</small>
              </div>
            ))}
          </div>
        </article>

        <article className="data-panel">
          <div className="section-title"><span>Ostatnie oceny</span><small>historia Twojego profilu</small></div>
          {recent.length ? (
            <div className="viewer-history-list">
              {recent.map((item) => (
                <div className="viewer-history-row" key={item.id}>
                  <div className="viewer-history-icon">{typeIcon(item.type)}</div>
                  <div>
                    <strong>{TYPE_LABELS[item.type]} • {item.period}</strong>
                    <span>{item.data} • {item.oce}</span>
                  </div>
                  <span className={`status ${item.status}`}>{statusLabels[item.status]}</span>
                  <span className={scoreClass(item.avgFinal)}>{item.avgFinal}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <ClipboardList size={28} />
              <span>Nie ma jeszcze ocen przypisanych do Twojego profilu.</span>
            </div>
          )}
        </article>
      </section>
    </main>
  )
}
