import type { CapturedJobOffer } from '../shared/types'

const readText = (selectors: string[]) => {
  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.trim()

    if (text) {
      return text
    }
  }

  return ''
}

const extractJobOffer = (): CapturedJobOffer | null => {
  const title = readText([
    '.job-details-jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title h1',
    'h1',
  ])

  const company = readText([
    '.job-details-jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name a',
  ])

  const location = readText([
    '.job-details-jobs-unified-top-card__primary-description-container',
    '.jobs-unified-top-card__primary-description-container',
  ])

  const description = readText([
    '.jobs-description-content__text',
    '.jobs-box__html-content',
  ])

  if (!title || !description) {
    return null
  }

  return {
    sourceUrl: window.location.href,
    title,
    company,
    location,
    description,
    capturedAt: new Date().toISOString(),
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'dreamjob:capture-current-job') {
    sendResponse({
      job: extractJobOffer(),
    })
  }
})
