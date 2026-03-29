import { mockCapturedJob, mockResumeMaster } from '../../shared/mock-data'
import type { CapturedJobOffer, ResumeMaster } from '../../shared/types'

const RESUME_MASTER_KEY = 'resumeMaster'

export const chromeStorage = {
  async getCapturedJob(): Promise<CapturedJobOffer> {
    const result = await chrome.storage.local.get('capturedJob')
    const capturedJob = result.capturedJob as
      | (Partial<CapturedJobOffer> & {
          sourceUrl?: string
          capturedAt?: string
          title?: string
          company?: string
          location?: string
          description?: string
          missingFields?: string[]
        })
      | undefined

    if (!capturedJob) {
      return mockCapturedJob
    }

    if ('raw_fields' in capturedJob && 'raw_text' in capturedJob && 'source_url' in capturedJob) {
      return capturedJob as CapturedJobOffer
    }

    return {
      source: 'linkedin',
      source_url: capturedJob.sourceUrl ?? '',
      captured_at: capturedJob.capturedAt ?? new Date().toISOString(),
      raw_text: capturedJob.description ?? '',
      raw_fields: {
        title: capturedJob.title ?? '',
        company: capturedJob.company ?? '',
        location: capturedJob.location ?? '',
        employment_type: '',
      },
      missing_fields: (capturedJob.missingFields as CapturedJobOffer['missing_fields']) ?? [],
    }
  },

  async getResumeMaster(options?: {
    fallbackToMock?: boolean
  }): Promise<ResumeMaster | null> {
    const result = await chrome.storage.local.get(RESUME_MASTER_KEY)
    const resumeMaster = result[RESUME_MASTER_KEY] as ResumeMaster | undefined

    if (resumeMaster) {
      return resumeMaster
    }

    return options?.fallbackToMock === false ? null : mockResumeMaster
  },

  async saveResumeMaster(resumeMaster: ResumeMaster): Promise<void> {
    await chrome.storage.local.set({
      [RESUME_MASTER_KEY]: resumeMaster,
    })
  },
}
