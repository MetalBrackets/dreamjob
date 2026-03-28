import { appConfig } from '../config'
import { mockApplications, mockCapturedJob, mockInterviewPrep, mockResumeMaster } from '../../shared/mock-data'
import type { ApplicationItem, CapturedJobOffer, InterviewPrepPack, ResumeMaster } from '../../shared/types'
import {
  serverProfileToResumeMaster,
  resumeMasterToServerProfile,
  extractionToResumeMaster,
  type ServerProfile,
  type ServerProfileData,
} from './profile-adapter'
import {
  serverApplicationsToApplicationItems,
  serverCapturedJobToCapturedJobOffer,
  type ServerApplicationItem,
  type ServerCapturedJobOffer,
} from './jobs-adapter'

export { extractionToResumeMaster }

export interface ResumeUploadResponse {
  id: string
  status: string
  extractedData: {
    data: ServerProfileData
  }
  error?: string
}

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Request failed for ${path}`)
  }

  return response.json() as Promise<T>
}

const putJson = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Request failed for ${path}`)
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  async getResumeMaster(): Promise<ResumeMaster> {
    if (appConfig.useMockData) return mockResumeMaster
    const serverProfile = await getJson<ServerProfile>('/profile')
    return serverProfileToResumeMaster(serverProfile)
  },

  async saveProfile(master: ResumeMaster): Promise<void> {
    const body = resumeMasterToServerProfile(master)
    await putJson('/profile', body)
  },

  async getCapturedJob(): Promise<CapturedJobOffer> {
    if (appConfig.useMockData) return mockCapturedJob
    const serverJob = await getJson<ServerCapturedJobOffer>('/jobs/current')
    return serverCapturedJobToCapturedJobOffer(serverJob)
  },

  async getApplications(): Promise<ApplicationItem[]> {
    if (appConfig.useMockData) return mockApplications
    const serverItems = await getJson<ServerApplicationItem[]>('/jobs')
    return serverApplicationsToApplicationItems(serverItems)
  },

  async getInterviewPrep(): Promise<InterviewPrepPack> {
    // TODO: replace with real endpoint in next version
    return mockInterviewPrep
  },

  async uploadResume(file: File): Promise<ResumeUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${appConfig.apiBaseUrl}/resume/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new Error((errorBody as { error?: string }).error || `Upload failed (${response.status})`)
    }

    return response.json() as Promise<ResumeUploadResponse>
  },
}
