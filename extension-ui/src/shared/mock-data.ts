import type {
  ApplicationItem,
  CapturedJobOffer,
  InterviewPrepPack,
  ResumeMaster,
} from './types'

export const mockResumeMaster: ResumeMaster = {
  fullName: 'Camille Martin',
  title: 'Product-focused frontend engineer',
  location: 'Nantes, France',
  summary:
    'Product-minded builder with experience designing user-facing tools, structuring messy information, and shipping fast under delivery constraints.',
  profiles: [
    { id: 'profile-1', label: 'Email', value: 'camille.martin@example.com' },
    { id: 'profile-2', label: 'Phone', value: '+33 6 12 34 56 78' },
    { id: 'profile-3', label: 'LinkedIn', value: 'https://www.linkedin.com/in/camillemartin' },
  ],
  experience: [
    {
      id: 'exp-1',
      role: 'Frontend Engineer',
      company: 'Shift Labs',
      location: 'Nantes, France',
      startDate: '2023-02',
      endDate: '',
      current: true,
      description: 'Built internal tools and prototypes for recruiting and operations teams.',
      highlights: [
        'Created browser-based workflows that reduced repetitive manual work.',
        'Worked with design and product stakeholders to deliver trust-focused interfaces.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Université de Nantes',
      degree: 'Master',
      fieldOfStudy: 'Human-Computer Interaction',
      startDate: '2019-09',
      endDate: '2021-06',
      description: 'Focused on interface design, usability testing, and digital product methods.',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'DreamJob prototype',
      role: 'Frontend lead',
      startDate: '2026-03',
      endDate: '',
      current: true,
      description: 'Hackathon prototype for building a source-of-truth resume and job application workflow.',
      highlights: ['Structured the sidepanel UX and reusable section system.'],
      link: '',
    },
  ],
  skills: [
    { id: 'skill-1', name: 'React', level: 'Advanced', details: 'Production UI and state management' },
    { id: 'skill-2', name: 'TypeScript', level: 'Advanced', details: 'Typed frontend architecture' },
    { id: 'skill-3', name: 'UX design', level: 'Strong', details: 'Flows, wireframes, and product thinking' },
  ],
  languages: [
    { id: 'lang-1', name: 'French', proficiency: 'Native', certification: '' },
    { id: 'lang-2', name: 'English', proficiency: 'Professional working proficiency', certification: 'TOEIC 930' },
  ],
  interests: ['Digital products', 'Career tools', 'Accessibility', 'Visual storytelling'],
  awards: [
    {
      id: 'award-1',
      title: 'Hackathon finalist',
      issuer: 'Nantes Product Sprint',
      date: '2025-11',
      description: 'Recognized for a workflow automation concept.',
    },
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'Google UX Design Certificate',
      issuer: 'Google',
      date: '2022-05',
      expiresAt: '',
      credentialId: '',
    },
  ],
  publications: [
    {
      id: 'pub-1',
      title: 'Designing Trust In AI-assisted Workflows',
      publisher: 'Local Product Meetup',
      date: '2024-10',
      link: '',
      description: 'Short talk and written summary on trustworthy product patterns.',
    },
  ],
  volunteering: [
    {
      id: 'vol-1',
      organization: 'Code Club Nantes',
      role: 'Mentor',
      startDate: '2022-09',
      endDate: '',
      current: true,
      description: 'Mentored students on web basics and project presentation.',
    },
  ],
  references: [
    {
      id: 'ref-1',
      name: 'Elise Bernard',
      relationship: 'Former manager',
      company: 'Shift Labs',
      email: 'elise.bernard@example.com',
      phone: '',
      notes: 'Can speak about product delivery and collaboration.',
    },
  ],
}

export const mockCapturedJob: CapturedJobOffer = {
  sourceUrl: 'https://www.linkedin.com/jobs/view/123456789',
  title: 'Frontend Developer',
  pageTitle: 'Frontend Developer at Shift Labs | LinkedIn',
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
