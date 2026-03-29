interface ExtractedPerson {
  name: string
  headline: string
  profile_url: string
  location: string
}

const cleanText = (value: string | null | undefined) => value?.trim() ?? ''

function extractPeople(): ExtractedPerson[] {
  const people: ExtractedPerson[] = []

  const cards = document.querySelectorAll(
    '.reusable-search__result-container, [data-view-name="search-entity-result-universal-template"], .entity-result',
  )

  for (const card of cards) {
    const linkEl = card.querySelector<HTMLAnchorElement>(
      'a[href*="/in/"], .entity-result__title-text a, .app-aware-link[href*="/in/"]',
    )
    if (!linkEl) continue

    const profileUrl = linkEl.href.split('?')[0]

    const nameEl =
      card.querySelector('.entity-result__title-text a span[aria-hidden="true"]') ??
      card.querySelector('.entity-result__title-text span[dir="ltr"] span[aria-hidden="true"]') ??
      linkEl.querySelector('span[aria-hidden="true"]')
    const name = cleanText(nameEl?.textContent)
    if (!name) continue

    const headlineEl = card.querySelector(
      '.entity-result__primary-subtitle, .entity-result__summary',
    )
    const headline = cleanText(headlineEl?.textContent)

    const locationEl = card.querySelector('.entity-result__secondary-subtitle')
    const location = cleanText(locationEl?.textContent)

    people.push({ name, headline, profile_url: profileUrl, location })
  }

  return people
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'dreamjob:scrape-people') {
    setTimeout(() => {
      sendResponse({ people: extractPeople() })
    }, 2000)
    return true
  }
})
