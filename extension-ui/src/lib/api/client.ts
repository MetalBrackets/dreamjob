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
import {
  serverOrchestratorToExtension,
  type ServerOrchestratorResult,
  type CvGenerationResult,
} from './cvs-adapter'

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

type ResumeApiRecord = Record<string, unknown>

const createEmptyResumeMaster = (): ResumeMaster => ({
  fullName: '',
  title: '',
  location: '',
  summary: '',
  profiles: [],
  experience: [],
  education: [],
  projects: [],
  skills: [],
  languages: [],
  interests: [],
  awards: [],
  certifications: [],
  publications: [],
  volunteering: [],
  references: [],
})

const asRecord = (value: unknown): ResumeApiRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ResumeApiRecord)
    : null

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : ''

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : []

const createCollectionId = (prefix: string, index: number): string =>
  `${prefix}-${index + 1}`

const normalizeExtractedResumeData = (
  data: ResumeApiRecord,
): ResumeMaster | null => {
  const identity = asRecord(data.identity)
  const experiences = Array.isArray(data.experiences) ? data.experiences : null

  if (!identity || !experiences) {
    return null
  }

  const links = asRecord(identity.links)

  return {
    ...createEmptyResumeMaster(),
    fullName: asString(identity.name),
    title: asString(identity.headline),
    location: asString(identity.location),
    summary: asString(data.professionalSummaryMaster),
    profiles: [
      asString(identity.email)
        ? {
            id: createCollectionId('profile', 0),
            label: 'Email',
            value: asString(identity.email),
          }
        : null,
      asString(identity.phone)
        ? {
            id: createCollectionId('profile', 1),
            label: 'Phone',
            value: asString(identity.phone),
          }
        : null,
      asString(links?.linkedin)
        ? {
            id: createCollectionId('profile', 2),
            label: 'LinkedIn',
            value: asString(links?.linkedin),
          }
        : null,
      asString(links?.portfolio)
        ? {
            id: createCollectionId('profile', 3),
            label: 'Portfolio',
            value: asString(links?.portfolio),
          }
        : null,
      asString(links?.github)
        ? {
            id: createCollectionId('profile', 4),
            label: 'GitHub',
            value: asString(links?.github),
          }
        : null,
    ].filter(Boolean) as ResumeMaster['profiles'],
    experience: experiences.map((item, index) => {
      const experience = asRecord(item) ?? {}
      const achievements = Array.isArray(experience.achievements)
        ? experience.achievements
        : []

      return {
        id: createCollectionId('exp', index),
        role: asString(experience.title),
        company: asString(experience.company),
        location: asString(experience.location),
        startDate: asString(experience.startDate),
        endDate: asString(experience.endDate),
        current: !asString(experience.endDate),
        description: asString(experience.description),
        highlights: achievements
          .map((achievement) => asString(asRecord(achievement)?.text))
          .filter(Boolean),
      }
    }),
    education: (Array.isArray(data.education) ? data.education : []).map((item, index) => {
      const education = asRecord(item) ?? {}

      return {
        id: createCollectionId('edu', index),
        institution: asString(education.school),
        degree: asString(education.degree),
        fieldOfStudy: asString(education.field),
        startDate: '',
        endDate:
          typeof education.year === 'number'
            ? String(education.year)
            : asString(education.year),
        description: '',
      }
    }),
    projects: (Array.isArray(data.projects) ? data.projects : []).map((item, index) => {
      const project = asRecord(item) ?? {}

      return {
        id: createCollectionId('proj', index),
        name: asString(project.name),
        role: '',
        startDate: '',
        endDate: '',
        current: false,
        description: asString(project.description),
        highlights: asStringArray(project.technologies),
        link: asString(project.url),
      }
    }),
    skills: (Array.isArray(data.skills) ? data.skills : []).map((item, index) => {
      const skill = asRecord(item) ?? {}

      return {
        id: createCollectionId('skill', index),
        name: asString(skill.name),
        level: asString(skill.level),
        details: asString(skill.category),
      }
    }),
    languages: (Array.isArray(data.languages) ? data.languages : []).map((item, index) => {
      const language = asRecord(item) ?? {}

      return {
        id: createCollectionId('lang', index),
        name: asString(language.name),
        proficiency: asString(language.level),
        certification: '',
      }
    }),
    certifications: (Array.isArray(data.certifications) ? data.certifications : []).map((item, index) => {
      const certification = asRecord(item) ?? {}

      return {
        id: createCollectionId('cert', index),
        name: asString(certification.name),
        issuer: asString(certification.issuer),
        date: asString(certification.date),
        expiresAt: '',
        credentialId: '',
      }
    }),
    references: (Array.isArray(data.references) ? data.references : []).map((item, index) => {
      const reference = asRecord(item) ?? {}

      return {
        id: createCollectionId('ref', index),
        name: asString(reference.name),
        relationship: asString(reference.relationship),
        company: asString(reference.company),
        email: asString(reference.email),
        phone: asString(reference.phone),
        notes: '',
      }
    }),
  }
}

const normalizeResumeMasterPayload = (payload: unknown): ResumeMaster => {
  const source = asRecord(payload)
  if (!source) {
    return createEmptyResumeMaster()
  }

  const wrappedPayload =
    asRecord(source.resumeMaster) ??
    asRecord(source.profile) ??
    asRecord(source.data) ??
    asRecord(source.extractedData)

  if (wrappedPayload && wrappedPayload !== source) {
    const normalizedWrappedPayload =
      normalizeExtractedResumeData(wrappedPayload) ??
      normalizeResumeMasterPayload(wrappedPayload)

    if (
      normalizedWrappedPayload.fullName ||
      normalizedWrappedPayload.title ||
      normalizedWrappedPayload.summary ||
      normalizedWrappedPayload.experience.length > 0
    ) {
      return normalizedWrappedPayload
    }
  }

  const normalizedExtractedResume = normalizeExtractedResumeData(source)
  if (normalizedExtractedResume) {
    return normalizedExtractedResume
  }

  return {
    ...createEmptyResumeMaster(),
    fullName: asString(source.fullName || source.name),
    title: asString(source.title || source.headline),
    location: asString(source.location),
    summary: asString(source.summary || source.professionalSummaryMaster),
    profiles: Array.isArray(source.profiles)
      ? (source.profiles as ResumeMaster['profiles'])
      : [],
    experience: Array.isArray(source.experience)
      ? (source.experience as ResumeMaster['experience'])
      : [],
    education: Array.isArray(source.education)
      ? (source.education as ResumeMaster['education'])
      : [],
    projects: Array.isArray(source.projects)
      ? (source.projects as ResumeMaster['projects'])
      : [],
    skills: Array.isArray(source.skills)
      ? (source.skills as ResumeMaster['skills'])
      : [],
    languages: Array.isArray(source.languages)
      ? (source.languages as ResumeMaster['languages'])
      : [],
    interests: asStringArray(source.interests),
    awards: Array.isArray(source.awards)
      ? (source.awards as ResumeMaster['awards'])
      : [],
    certifications: Array.isArray(source.certifications)
      ? (source.certifications as ResumeMaster['certifications'])
      : [],
    publications: Array.isArray(source.publications)
      ? (source.publications as ResumeMaster['publications'])
      : [],
    volunteering: Array.isArray(source.volunteering)
      ? (source.volunteering as ResumeMaster['volunteering'])
      : [],
    references: Array.isArray(source.references)
      ? (source.references as ResumeMaster['references'])
      : [],
    sourceDocument: asRecord(source.sourceDocument)
      ? (source.sourceDocument as ResumeMaster['sourceDocument'])
      : undefined,
  }
}

export const apiClient = {
  async getResumeMaster(): Promise<ResumeMaster> {
    if (appConfig.useMockData) return mockResumeMaster
    const payload = await getJson<unknown>('/profile')
    return normalizeResumeMasterPayload(payload)
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

  async postJobRaw(offer: CapturedJobOffer): Promise<{ jobPostId: string }> {
    const body = {
      source: offer.source,
      sourceUrl: offer.source_url,
      rawText: offer.raw_text,
      htmlSnapshotRef: offer.html_snapshot_ref,
      rawFields: offer.raw_fields,
    }
    const result = await postJson<{ raw: unknown; normalized: { id: string } }>('/jobs/raw', body)
    return { jobPostId: result.normalized.id }
  },

  async generateCv(jobPostId: string, language: string): Promise<CvGenerationResult> {
    const result = await postJson<ServerOrchestratorResult>('/cvs/generate', { jobPostId, language })
    return serverOrchestratorToExtension(result)
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
