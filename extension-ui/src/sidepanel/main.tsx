import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Briefcase, FileText, LayoutDashboard, Sparkles } from 'lucide-react'
import { apiClient } from '../lib/api/client'
import { chromeStorage } from '../lib/chrome/storage'
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
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div>
          <div className="brand-mark">DJ</div>
          <div className="brand-copy">
            <strong>DreamJob</strong>
            <span>Hackathon demo UI</span>
          </div>
        </div>

        <nav className="nav-list">
          <NavLink to="/" end className="nav-link">
            <FileText size={16} />
            Master Resume
          </NavLink>
          <NavLink to="/offer" className="nav-link">
            <Briefcase size={16} />
            Selected Offer
          </NavLink>
          <NavLink to="/dashboard" className="nav-link">
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink to="/interview" className="nav-link">
            <Sparkles size={16} />
            Interview Prep
          </NavLink>
        </nav>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  )
}

function MasterResumePage() {
  const profile = useAsyncValue(() => apiClient.getProfile())

  if (!profile) return <div className="panel">Loading profile...</div>

  return (
    <div className="page-stack">
      <section className="hero-card">
        <span className="eyebrow">Master profile</span>
        <h1>{profile.fullName}</h1>
        <p>{profile.headline}</p>
      </section>

      <section className="panel">
        <h2>Summary</h2>
        <p>{profile.summary}</p>
      </section>

      <section className="grid two-col">
        <article className="panel">
          <h2>Top skills</h2>
          <div className="tag-list">
            {profile.topSkills.map((skill) => (
              <span key={skill} className="tag">
                {skill}
              </span>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Core wins</h2>
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
  const offer = useAsyncValue(() => chromeStorage.getCapturedJob())

  if (!offer) return <div className="panel">Loading job offer...</div>

  return (
    <div className="page-stack">
      <section className="hero-card compact">
        <span className="eyebrow">Captured LinkedIn offer</span>
        <h1>{offer.title}</h1>
        <p>{`${offer.company} | ${offer.location}`}</p>
      </section>

      <section className="grid two-col">
        <article className="panel">
          <h2>Job description</h2>
          <p>{offer.description}</p>
        </article>

        <article className="panel">
          <h2>Generation actions</h2>
          <div className="action-stack">
            <button className="primary-button">Generate tailored resume</button>
            <button className="secondary-button">Generate cover letter</button>
            <button className="secondary-button">Save to dashboard</button>
          </div>
        </article>
      </section>
    </div>
  )
}

function DashboardPage() {
  const applications = useAsyncValue(() => apiClient.getApplications())

  if (!applications) return <div className="panel">Loading applications...</div>

  return (
    <div className="page-stack">
      <section className="hero-card compact">
        <span className="eyebrow">Application tracker</span>
        <h1>{applications.length} active records</h1>
        <p>Follow-up dates and interview milestones stay visible in one place.</p>
      </section>

      <section className="panel">
        <div className="table-head">
          <span>Role</span>
          <span>Status</span>
          <span>Follow up</span>
          <span>Score</span>
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
  const prep = useAsyncValue(() => apiClient.getInterviewPrep())

  if (!prep) return <div className="panel">Loading interview prep...</div>

  return (
    <div className="page-stack">
      <section className="hero-card compact">
        <span className="eyebrow">Interview prep</span>
        <h1>Structured preparation pack</h1>
        <p>Company context, likely questions, story prompts, and follow-up draft.</p>
      </section>

      <section className="grid two-col">
        <article className="panel">
          <h2>Company snapshot</h2>
          <p>{prep.companySnapshot}</p>

          <h2>Likely questions</h2>
          <ul className="simple-list">
            {prep.likelyQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Stories to prepare</h2>
          <ul className="simple-list">
            {prep.storiesToPrepare.map((story) => (
              <li key={story}>{story}</li>
            ))}
          </ul>

          <h2>Follow-up draft</h2>
          <p>{prep.followUpDraft}</p>
        </article>
      </section>
    </div>
  )
}

function App() {
  return (
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
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
