import { mockCapturedJob } from '../../shared/mock-data'
import type { CapturedJobOffer } from '../../shared/types'

export const chromeStorage = {
  async getCapturedJob(): Promise<CapturedJobOffer> {
    const result = await chrome.storage.local.get('capturedJob')
    return (result.capturedJob as CapturedJobOffer | undefined) ?? mockCapturedJob
  },
}
