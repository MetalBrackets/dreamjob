import { appConfig } from '../config'
import { mockApplications, mockCapturedJob, mockInterviewPrep, mockResumeMaster } from '../../shared/mock-data'
import type { ApplicationItem, CapturedJobOffer, InterviewPrepPack, ResumeMaster } from '../../shared/types'

export interface ResumeUploadResponse {
  id: string
  status: string
  extractedData: {
    data: {
      identity: {
        name: string
        headline: string
        email: string
        phone?: string
        location?: string
        links?: { linkedin?: string; portfolio?: string; github?: string }
      }
      professionalSummaryMaster?: string
      experiences: Array<{
        experienceId: string
        title: string
        company: string
        location?: string
        startDate: string
        endDate?: string
        description?: string
        achievements: Array<{ text: string }>
        skillsUsed: string[]
      }>
      education: Array<{ school: string; degree: string; field?: string; year?: number }>
      skills: Array<{ name: string; category?: string; level?: string }>
      certifications?: Array<{ name: string; issuer?: string; date?: string }>
      languages?: Array<{ name: string; level?: string }>
      projects?: Array<{ name: string; description?: string; url?: string; technologies?: string[] }>
      references?: Array<{ name: string; title?: string; company?: string; email?: string; phone?: string; relationship?: string }>
    }
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

export const apiClient = {
  async getResumeMaster(): Promise<ResumeMaster> {
    if (appConfig.useMockData) return mockResumeMaster
    return getJson<ResumeMaster>('/profile')
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
