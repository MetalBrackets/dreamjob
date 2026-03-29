chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    // Ignore unsupported states during local loading.
  })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'dreamjob:open-side-panel') {
    const tabId = sender.tab?.id ?? message.tabId

    if (!tabId) {
      sendResponse({ ok: false })
      return
    }

    chrome.sidePanel.open({ tabId }).then(() => {
      sendResponse({ ok: true })
    }).catch(() => {
      sendResponse({ ok: false })
    })

    return true
  }

  if (message?.type === 'dreamjob:cache-captured-job') {
    chrome.storage.local.set({ capturedJob: message.payload }).then(() => {
      sendResponse({ ok: true })
    }).catch(() => {
      sendResponse({ ok: false })
    })

    return true
  }

  if (message?.type === 'dreamjob:people-search') {
    const { company, role } = message as { company: string; role: string }
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(role)}&company=${encodeURIComponent(company)}`

    let responded = false
    let searchTabId: number | null = null

    function respond(result: { ok: boolean; people: Array<{ name: string; headline: string; profile_url: string; location?: string }> }) {
      if (responded) return
      responded = true
      sendResponse(result)
    }

    // Timeout: fail gracefully if anything hangs
    setTimeout(() => {
      if (searchTabId !== null) chrome.tabs.remove(searchTabId).catch(() => {})
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      respond({ ok: false, people: [] })
    }, 20_000)

    // Attach listener BEFORE creating tab to avoid missing fast loads
    function onTabUpdated(updatedTabId: number, info: chrome.tabs.TabChangeInfo, _tab?: chrome.tabs.Tab) {
      if (searchTabId === null || updatedTabId !== searchTabId || info.status !== 'complete') return
      chrome.tabs.onUpdated.removeListener(onTabUpdated)

      // Wait for LinkedIn's React to hydrate search results
      setTimeout(() => {
        chrome.tabs.sendMessage(searchTabId!, { type: 'dreamjob:scrape-people' }).then((response: { people?: Array<{ name: string; headline: string; profile_url: string; location?: string }> } | undefined) => {
          const people = response?.people ?? []

          chrome.tabs.remove(searchTabId!).catch(() => {})

          const top3 = people.slice(0, 3)
          for (const person of top3) {
            chrome.tabs.create({ url: person.profile_url, active: false })
          }

          respond({ ok: true, people })
        }).catch(() => {
          chrome.tabs.remove(searchTabId!).catch(() => {})
          respond({ ok: false, people: [] })
        })
      }, 1500)
    }

    chrome.tabs.onUpdated.addListener(onTabUpdated)

    chrome.tabs.create({ url: searchUrl, active: false }).then((tab) => {
      searchTabId = tab.id!
      // Catch-up: if tab already completed before searchTabId was set, trigger manually
      chrome.tabs.get(searchTabId).then((tabInfo) => {
        if (tabInfo.status === 'complete') {
          onTabUpdated(searchTabId!, { status: 'complete' } as chrome.tabs.TabChangeInfo, tabInfo)
        }
      }).catch(() => {})
    }).catch(() => {
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      respond({ ok: false, people: [] })
    })

    return true
  }
})
