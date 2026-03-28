import { mockCapturedJob, mockResumeMaster } from '../../shared/mock-data'
import type { CapturedJobOffer, ResumeMaster } from '../../shared/types'

const RESUME_MASTER_KEY = 'resumeMaster'

export const chromeStorage = {
  async getCapturedJob(): Promise<CapturedJobOffer> {
    const result = await chrome.storage.local.get('capturedJob')
    return (result.capturedJob as CapturedJobOffer | undefined) ?? mockCapturedJob
  },

  async getResumeMaster(): Promise<ResumeMaster> {
    const result = await chrome.storage.local.get(RESUME_MASTER_KEY)
    return (result[RESUME_MASTER_KEY] as ResumeMaster | undefined) ?? mockResumeMaster
  },

  async saveResumeMaster(resumeMaster: ResumeMaster): Promise<void> {
    await chrome.storage.local.set({
      [RESUME_MASTER_KEY]: resumeMaster,
    })
  },
}
