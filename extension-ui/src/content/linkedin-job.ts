import type { CapturedJobOffer } from '../shared/types'

type SelectorProbe = {
  selector: string
  text: string
}

type CaptureDebugPayload = {
  url: string
  documentTitle: string
  fields: {
    title: SelectorProbe[]
    company: SelectorProbe[]
    location: SelectorProbe[]
    description: SelectorProbe[]
  }
}

const probeSelectors = (selectors: string[]): SelectorProbe[] =>
  selectors.map((selector) => ({
    selector,
    text: document.querySelector(selector)?.textContent?.trim() ?? '',
  }))

const cleanText = (value: string | null | undefined) => value?.trim() ?? ''

const readText = (selectors: string[]) => {
  for (const selector of selectors) {
    const text = cleanText(document.querySelector(selector)?.textContent)

    if (text) {
      return text
    }
  }

  return ''
}

const titleSelectors = [
  '.job-details-jobs-unified-top-card__job-title h1',
  '.jobs-unified-top-card__job-title h1',
  'h1',
]

const companySelectors = [
  'div[aria-label^="Entreprise"] a[href*="/company/"]',
  'a[href*="/company/"][href*="/life/"]',
  '.job-details-jobs-unified-top-card__company-name a',
  '.jobs-unified-top-card__company-name a',
]

const locationSelectors = [
  'div[aria-label^="Entreprise"] ~ p span:first-child',
  '.job-details-jobs-unified-top-card__primary-description-container',
  '.jobs-unified-top-card__primary-description-container',
]

const descriptionSelectors = [
  '.jobs-description-content__text',
  '.jobs-box__html-content',
]

const locationPattern =
  /^(?<location>.+?),\s*(?<region>.+?),\s*(?<country>.+)$/

const extractLocationFromMetadata = () => {
  for (const paragraph of document.querySelectorAll('p')) {
    const spans = Array.from(paragraph.querySelectorAll('span'))
      .map((node) => cleanText(node.textContent))
      .filter(Boolean)

    for (const text of spans) {
      if (locationPattern.test(text)) {
        return text
      }
    }
  }

  return ''
}

const getCaptureDebugPayload = (): CaptureDebugPayload => ({
  url: window.location.href,
  documentTitle: document.title.trim(),
  fields: {
    title: probeSelectors(titleSelectors),
    company: probeSelectors(companySelectors),
    location: probeSelectors(locationSelectors),
    description: probeSelectors(descriptionSelectors),
  },
})

const extractJobOffer = (): CapturedJobOffer | null => {
  const title = readText(titleSelectors)
  const company = readText(companySelectors)
  const location = readText(locationSelectors) || extractLocationFromMetadata()
  const description = readText(descriptionSelectors)
  const pageTitle = document.title.trim()
  const missingFields = [
    !title ? 'title' : null,
    !company ? 'company' : null,
    !location ? 'location' : null,
    !description ? 'description' : null,
  ].filter((field): field is NonNullable<CapturedJobOffer['missingFields']>[number] => Boolean(field))

  if (!title && !company && !location && !description && !pageTitle) {
    return null
  }

  return {
    sourceUrl: window.location.href,
    title,
    pageTitle,
    company,
    location,
    description,
    missingFields,
    capturedAt: new Date().toISOString(),
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'dreamjob:capture-current-job') {
    sendResponse({
      job: extractJobOffer(),
      debug: getCaptureDebugPayload(),
    })
  }
})
