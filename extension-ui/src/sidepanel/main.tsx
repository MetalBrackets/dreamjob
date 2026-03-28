import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Briefcase, FileText, LayoutDashboard, Sparkles } from 'lucide-react'
import { apiClient } from '../lib/api/client'
import { chromeStorage } from '../lib/chrome/storage'
import { I18nProvider, useI18n } from '../i18n/I18nProvider'
import '../shared/styles/global.css'
import '../shared/styles/sidepanel.css'
import type { ApplicationItem } from '../shared/types'

function useAsyncValue<T>(loader: () => Promise<T>) {
  const [data, setData] = React.useState<T | null>(null)

  React.useEffect(() => {
    let active = true

    loader()
      .then((value) => {
        if (active) {
          setData(value)
        }
      })
      .catch(() => {
        if (active) {
          setData(null)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return data
}

function Shell({ children }: { children: React.ReactNode }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div>
          <div className="brand-mark">DJ</div>
          <div className="brand-copy">
            <strong>{t.shell.appName}</strong>
            <span>{t.shell.appTagline}</span>
          </div>
        </div>

        <nav className="nav-list">
          <NavLink to="/" end className="nav-link">
            <FileText size={16} />
            {t.nav.masterResume}
          </NavLink>
          <NavLink to="/offer" className="nav-link">
            <Briefcase size={16} />
            {t.nav.selectedOffer}
          </NavLink>
          <NavLink to="/dashboard" className="nav-link">
            <LayoutDashboard size={16} />
            {t.nav.dashboard}
          </NavLink>
          <NavLink to="/interview" className="nav-link">
            <Sparkles size={16} />
            {t.nav.interviewPrep}
          </NavLink>
        </nav>

        <div className="locale-switcher">
          <span>{t.common.localeLabel}</span>
          <div className="locale-actions">
            <button
              className={`locale-button${locale === 'fr' ? ' active' : ''}`}
              onClick={() => setLocale('fr')}
            >
              {t.common.french}
            </button>
            <button
              className={`locale-button${locale === 'en' ? ' active' : ''}`}
              onClick={() => setLocale('en')}
            >
              {t.common.english}
            </button>
          </div>
        </div>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  )
}

function MasterResumePage() {
  const { t } = useI18n()
  const profile = useAsyncValue(() => apiClient.getProfile())

  if (!profile) return <div className="panel">{t.common.loadingProfile}</div>

  return (
    <div className="page-stack">
      <section className="hero-card">
        <span className="eyebrow">{t.masterProfile.eyebrow}</span>
        <h1>{profile.fullName}</h1>
        <p>{profile.headline}</p>
      </section>

      <section className="panel">
        <h2>{t.masterProfile.summaryTitle}</h2>
        <p>{profile.summary}</p>
      </section>

      <section className="grid two-col">
        <article className="panel">
          <h2>{t.masterProfile.topSkillsTitle}</h2>
          <div className="tag-list">
            {profile.topSkills.map((skill) => (
              <span key={skill} className="tag">
                {skill}
              </span>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>{t.masterProfile.coreWinsTitle}</h2>
          <ul className="simple-list">
            {profile.coreWins.map((win) => (
              <li key={win}>{win}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}

function SelectedOfferPage() {
  const { t } = useI18n()
  const offer = useAsyncValue(() => chromeStorage.getCapturedJob())

  if (!offer) return <div className="panel">{t.common.loadingJob}</div>

  return (
    <div className="page-stack">
      <section className="hero-card compact">
        <span className="eyebrow">{t.selectedOffer.eyebrow}</span>
        <h1>{offer.title}</h1>
        <p>{`${offer.company} | ${offer.location}`}</p>
      </section>

      <section className="grid two-col">
        <article className="panel">
          <h2>{t.selectedOffer.descriptionTitle}</h2>
          <p>{offer.description}</p>
        </article>

        <article className="panel">
          <h2>{t.selectedOffer.actionsTitle}</h2>
          <div className="action-stack">
            <button className="primary-button">{t.selectedOffer.generateResume}</button>
            <button className="secondary-button">{t.selectedOffer.generateCoverLetter}</button>
            <button className="secondary-button">{t.selectedOffer.saveDashboard}</button>
          </div>
        </article>
      </section>
    </div>
  )
}

function DashboardPage() {
  const { t } = useI18n()
  const applications = useAsyncValue(() => apiClient.getApplications())

  if (!applications) return <div className="panel">{t.common.loadingApplications}</div>

  return (
    <div className="page-stack">
      <section className="hero-card compact">
        <span className="eyebrow">{t.dashboard.eyebrow}</span>
        <h1>{`${applications.length} ${t.dashboard.heroSuffix}`}</h1>
        <p>{t.dashboard.heroText}</p>
      </section>

      <section className="panel">
        <div className="table-head">
          <span>{t.dashboard.role}</span>
          <span>{t.dashboard.status}</span>
          <span>{t.dashboard.followUp}</span>
          <span>{t.dashboard.score}</span>
        </div>
        <div className="table-body">
          {applications.map((application: ApplicationItem) => (
            <div key={application.id} className="table-row">
              <div>
                <strong>{application.title}</strong>
                <span>{application.company}</span>
              </div>
              <span className="status-pill">{application.status}</span>
              <span>{application.followUpAt}</span>
              <span>{application.matchScore}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function InterviewPrepPage() {
  const { t } = useI18n()
  const prep = useAsyncValue(() => apiClient.getInterviewPrep())

  if (!prep) return <div className="panel">{t.common.loadingInterviewPrep}</div>

  return (
    <div className="page-stack">
      <section className="hero-card compact">
        <span className="eyebrow">{t.interviewPrep.eyebrow}</span>
        <h1>{t.interviewPrep.title}</h1>
        <p>{t.interviewPrep.intro}</p>
      </section>

      <section className="grid two-col">
        <article className="panel">
          <h2>{t.interviewPrep.snapshotTitle}</h2>
          <p>{prep.companySnapshot}</p>

          <h2>{t.interviewPrep.questionsTitle}</h2>
          <ul className="simple-list">
            {prep.likelyQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>{t.interviewPrep.storiesTitle}</h2>
          <ul className="simple-list">
            {prep.storiesToPrepare.map((story) => (
              <li key={story}>{story}</li>
            ))}
          </ul>

          <h2>{t.interviewPrep.followUpDraftTitle}</h2>
          <p>{prep.followUpDraft}</p>
        </article>
      </section>
    </div>
  )
}

function App() {
  return (
    <I18nProvider>
      <HashRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<MasterResumePage />} />
            <Route path="/offer" element={<SelectedOfferPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/interview" element={<InterviewPrepPage />} />
          </Routes>
        </Shell>
      </HashRouter>
    </I18nProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
