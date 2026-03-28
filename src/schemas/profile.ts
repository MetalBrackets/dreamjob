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
