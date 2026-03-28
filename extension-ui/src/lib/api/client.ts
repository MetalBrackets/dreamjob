import { appConfig } from '../config'
import { mockApplications, mockCapturedJob, mockInterviewPrep, mockProfile } from '../../shared/mock-data'
import type { ApplicationItem, CapturedJobOffer, InterviewPrepPack, MasterProfile } from '../../shared/types'

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Request failed for ${path}`)
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  async getProfile(): Promise<MasterProfile> {
    if (appConfig.useMockData) return mockProfile
    return getJson<MasterProfile>('/profile')
  },

  async getCapturedJob(): Promise<CapturedJobOffer> {
    if (appConfig.useMockData) return mockCapturedJob
    return getJson<CapturedJobOffer>('/jobs/current')
  },

  async getApplications(): Promise<ApplicationItem[]> {
    if (appConfig.useMockData) return mockApplications
    return getJson<ApplicationItem[]>('/jobs')
  },

  async getInterviewPrep(): Promise<InterviewPrepPack> {
    if (appConfig.useMockData) return mockInterviewPrep
    return getJson<InterviewPrepPack>('/interviews/prep')
  },
}
