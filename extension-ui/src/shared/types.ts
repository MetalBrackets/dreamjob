export type JobStatus =
  | 'saved'
  | 'applying'
  | 'applied'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn'

export interface ResumeProfileLink {
  id: string
  label: string
  value: string
}

export interface ResumeExperienceItem {
  id: string
  role: string
  company: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  description: string
  highlights: string[]
}

export interface ResumeEducationItem {
  id: string
  institution: string
  degree: string
  fieldOfStudy: string
  startDate: string
  endDate: string
  description: string
}

export interface ResumeProjectItem {
  id: string
  name: string
  role: string
  startDate: string
  endDate: string
  current: boolean
  description: string
  highlights: string[]
  link: string
}

export interface ResumeSkillItem {
  id: string
  name: string
  level: string
  details: string
}

export interface ResumeLanguageItem {
  id: string
  name: string
  proficiency: string
  certification: string
}

export interface ResumeAwardItem {
  id: string
  title: string
  issuer: string
  date: string
  description: string
}

export interface ResumeCertificationItem {
  id: string
  name: string
  issuer: string
  date: string
  expiresAt: string
  credentialId: string
}

export interface ResumePublicationItem {
  id: string
  title: string
  publisher: string
  date: string
  link: string
  description: string
}

export interface ResumeVolunteeringItem {
  id: string
  organization: string
  role: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

export interface ResumeReferenceItem {
  id: string
  name: string
  relationship: string
  company: string
  email: string
  phone: string
  notes: string
}

export interface ResumeSourceDocument {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  dataUrl: string
}

export interface ResumeMaster {
  fullName: string
  title: string
  location: string
  summary: string
  profiles: ResumeProfileLink[]
  experience: ResumeExperienceItem[]
  education: ResumeEducationItem[]
  projects: ResumeProjectItem[]
  skills: ResumeSkillItem[]
  languages: ResumeLanguageItem[]
  interests: string[]
  awards: ResumeAwardItem[]
  certifications: ResumeCertificationItem[]
  publications: ResumePublicationItem[]
  volunteering: ResumeVolunteeringItem[]
  references: ResumeReferenceItem[]
  sourceDocument?: ResumeSourceDocument
}

export interface CapturedJobOfferRawFields {
  title: string
  company: string
  location: string
  employment_type: string
}

export interface CapturedJobOffer {
  source: 'linkedin'
  source_url: string
  captured_at: string
  html_snapshot_ref?: string
  raw_text: string
  raw_fields: CapturedJobOfferRawFields
  missing_fields?: Array<keyof CapturedJobOfferRawFields>
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
