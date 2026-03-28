import { Type, type Static } from "@sinclair/typebox";

// --- Sub-schemas for Profile core identity ---

export const LinksSchema = Type.Object({
  linkedin: Type.Optional(Type.String()),
  portfolio: Type.Optional(Type.String()),
  github: Type.Optional(Type.String()),
});
export type Links = Static<typeof LinksSchema>;

export const IdentitySchema = Type.Object({
  name: Type.String(),
  headline: Type.String(),
  email: Type.String(),
  phone: Type.Optional(Type.String()),
  location: Type.Optional(Type.String()),
  links: Type.Optional(LinksSchema),
});
export type Identity = Static<typeof IdentitySchema>;

export const ConstraintsSchema = Type.Object({
  preferredCvLanguage: Type.Optional(Type.String()),
  maxCvPages: Type.Optional(Type.Number()),
  mustNotClaim: Type.Optional(Type.Array(Type.String())),
});
export type Constraints = Static<typeof ConstraintsSchema>;

export const TargetRolesSchema = Type.Array(Type.String());
export type TargetRoles = Static<typeof TargetRolesSchema>;

export const ProfessionalSummaryMasterSchema = Type.String();
export type ProfessionalSummaryMaster = Static<typeof ProfessionalSummaryMasterSchema>;

// --- Experience with achievements and skillsUsed ---

export const AchievementSchema = Type.Object({
  text: Type.String(),
  metric: Type.Optional(Type.String()),
  proofLevel: Type.Optional(Type.String()),
});
export type Achievement = Static<typeof AchievementSchema>;

export const ExperienceSchema = Type.Object({
  experienceId: Type.String(),
  title: Type.String(),
  company: Type.String(),
  location: Type.Optional(Type.String()),
  startDate: Type.String(),
  endDate: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  achievements: Type.Array(AchievementSchema),
  skillsUsed: Type.Array(Type.String()),
});
export type Experience = Static<typeof ExperienceSchema>;
