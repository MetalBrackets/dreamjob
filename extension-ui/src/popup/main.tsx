import React from 'react'
import ReactDOM from 'react-dom/client'
import '../shared/styles/global.css'
import '../shared/styles/popup.css'

const captureCurrentJob = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (!tab?.id) {
    return
  }

  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'dreamjob:capture-current-job',
  })

  if (response?.job) {
    await chrome.runtime.sendMessage({
      type: 'dreamjob:cache-captured-job',
      payload: response.job,
    })
  }

  await chrome.runtime.sendMessage({
    type: 'dreamjob:open-side-panel',
    tabId: tab.id,
  })
}

function App() {
  return (
    <div className="popup-root">
      <div className="popup-card">
        <span className="eyebrow">DreamJob</span>
        <h1>LinkedIn assistant</h1>
        <p>Capture the current offer and open the side panel flow.</p>
        <button className="primary-button" onClick={() => void captureCurrentJob()}>
          Capture current offer
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
