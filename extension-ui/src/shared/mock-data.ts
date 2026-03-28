import type {
  ApplicationItem,
  CapturedJobOffer,
  InterviewPrepPack,
  MasterProfile,
} from './types'

export const mockProfile: MasterProfile = {
  fullName: 'Camille Martin',
  headline: 'Frontend Engineer focused on product UX and extension tooling',
  summary:
    'Product-minded frontend engineer with experience shipping internal platforms, browser-based workflows, and high-velocity prototypes.',
  location: 'Nantes, France',
  topSkills: ['React', 'TypeScript', 'Browser Extensions', 'Design Systems', 'Product Thinking'],
  coreWins: [
    'Built workflow tools used daily by recruiting and sales teams.',
    'Cut application review time by turning manual flows into guided interfaces.',
    'Delivered polished demos under hackathon constraints.',
  ],
}

export const mockCapturedJob: CapturedJobOffer = {
  sourceUrl: 'https://www.linkedin.com/jobs/view/123456789',
  title: 'Frontend Developer',
  company: 'Shift Labs',
  location: 'Nantes, France',
  description:
    'We are looking for a frontend developer comfortable with React, TypeScript, UX polish, and collaboration with AI-backed services.',
  capturedAt: '2026-03-28T10:00:00.000Z',
}

export const mockApplications: ApplicationItem[] = [
  {
    id: 'app-1',
    title: 'Frontend Developer',
    company: 'Shift Labs',
    status: 'applying',
    appliedAt: '2026-03-28',
    followUpAt: '2026-04-01',
    matchScore: 88,
  },
  {
    id: 'app-2',
    title: 'Product Engineer',
    company: 'Atlantic Product',
    status: 'interviewing',
    appliedAt: '2026-03-24',
    followUpAt: '2026-03-31',
    interviewAt: '2026-04-02T13:30:00.000Z',
    matchScore: 79,
  },
]

export const mockInterviewPrep: InterviewPrepPack = {
  companySnapshot:
    'Shift Labs is likely optimizing candidate operations. Expect emphasis on usability, speed of execution, and measurable workflow gains.',
  likelyQuestions: [
    'How would you tailor a browser extension UX for frequent job applicants?',
    'How do you balance fast delivery and maintainable frontend architecture?',
    'How would you validate that AI-generated resume content is accurate?',
  ],
  storiesToPrepare: [
    'A project where you simplified a multi-step workflow.',
    'A time you shipped under extreme time pressure.',
    'A case where you improved product trust with better UX safeguards.',
  ],
  followUpDraft:
    'Thank you for the interview. I appreciated the discussion around user trust, structured generation, and shipping an assistant that stays in the loop without over-automating.',
}
