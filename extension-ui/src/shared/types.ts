export type JobStatus =
  | 'saved'
  | 'applying'
  | 'applied'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn'

export interface MasterProfile {
  fullName: string
  headline: string
  summary: string
  location: string
  topSkills: string[]
  coreWins: string[]
}

export interface CapturedJobOffer {
  sourceUrl: string
  title: string
  company: string
  location: string
  description: string
  capturedAt: string
}

export interface ApplicationItem {
  id: string
  title: string
  company: string
  status: JobStatus
  appliedAt: string
  followUpAt: string
  interviewAt?: string
  matchScore: number
}

export interface InterviewPrepPack {
  companySnapshot: string
  likelyQuestions: string[]
  storiesToPrepare: string[]
  followUpDraft: string
}
