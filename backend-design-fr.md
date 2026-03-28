# Conception Backend — DreamJob

## Vue d'ensemble

DreamJob aide les utilisateurs à adapter leur CV aux offres d'emploi LinkedIn. Ce document décrit l'architecture backend pour la démo open-source mono-utilisateur.

**Objectifs :** friction minimale à l'installation (`git clone && npm install && npm run dev`), pas d'authentification, local-first.

---

## Stack technique

| Couche     | Choix                   | Pourquoi                                    |
| ---------- | ----------------------- | ------------------------------------------- |
| Runtime    | Node.js + TypeScript    | Largement connu, excellent outillage        |
| Framework  | Fastify                 | Rapide, basé sur les plugins, support TS natif |
| Base de données | SQLite via Prisma  | Zéro configuration — un seul fichier, pas de serveur nécessaire |
| IA         | OpenAI API              | Alimente toutes les opérations des agents IA |

---

## Modèles de données

Tous les modèles utilisent des IDs entiers auto-incrémentés et des horodatages `createdAt`/`updatedAt`.

### Profile

Document unique représentant l'identité professionnelle complète de l'utilisateur (CandidateMasterProfile). Stocké en une seule ligne avec une colonne JSON unique. Récupéré et mis à jour en bloc via `GET` / `PUT /api/profile`.

| Champ | Type | Notes                                    |
| ----- | ---- | ---------------------------------------- |
| id    | Int  | Toujours 1 (utilisateur unique)          |
| data  | Json | CandidateMasterProfile complet — voir ci-dessous |

#### Structure JSON du profil

```json
{
  "identity": {
    "name": "Jane Doe",
    "headline": "Product Designer",
    "email": "jane@example.com",
    "phone": "+33...",
    "location": "Paris",
    "links": {
      "linkedin": "https://linkedin.com/in/janedoe",
      "portfolio": "https://janedoe.com",
      "github": "https://github.com/janedoe"
    }
  },
  "targetRoles": ["Senior Product Designer", "Lead Product Designer"],
  "professionalSummaryMaster": "Master summary text",
  "experiences": [
    {
      "experienceId": "exp_01",
      "title": "Product Designer",
      "company": "Company A",
      "location": "Paris",
      "startDate": "2021-01",
      "endDate": "2024-02",
      "description": "Owned core journeys",
      "achievements": [
        { "text": "Improved activation by 18%", "metric": "18%", "proofLevel": "strong" }
      ],
      "skillsUsed": ["Figma", "Design System", "UX Research"]
    }
  ],
  "education": [
    {
      "school": "School X",
      "degree": "Master in Design",
      "field": "Design",
      "year": "2020"
    }
  ],
  "skills": [
    {
      "name": "Figma",
      "category": "tool",
      "level": "advanced",
      "years": 6,
      "evidenceRefs": ["exp_01", "proj_03"]
    }
  ],
  "certifications": [
    {
      "name": "AWS Solutions Architect",
      "issuer": "Amazon",
      "date": "2023-06"
    }
  ],
  "languages": [
    { "name": "French", "level": "native" },
    { "name": "English", "level": "professional" }
  ],
  "projects": [
    {
      "name": "Portfolio Site",
      "description": "Personal portfolio",
      "url": "https://janedoe.com",
      "technologies": ["React", "Next.js"]
    }
  ],
  "references": [
    {
      "name": "John Smith",
      "title": "Engineering Manager",
      "company": "Company A",
      "email": "john@example.com",
      "phone": "+33...",
      "relationship": "Former Manager"
    }
  ],
  "constraints": {
    "preferredCvLanguage": "fr",
    "maxCvPages": 1,
    "mustNotClaim": ["Team management if not proven"]
  }
}
```

### JobOfferRaw

Données brutes capturées par l'extension navigateur avant la normalisation IA.

| Champ            | Type     | Notes                                      |
| ---------------- | -------- | ------------------------------------------ |
| id               | Int      |                                            |
| source           | String   | ex. "linkedin"                             |
| sourceUrl        | String   | URL originale de l'offre d'emploi          |
| capturedAt       | DateTime | Date de capture par l'extension            |
| htmlSnapshotRef  | String   | Optionnel — réf. vers le snapshot HTML stocké |
| rawText          | String   | Texte complet extrait de la page           |
| rawFields        | Json     | `{title, company, location, employment_type, ...}` |

### JobPost

Offre d'emploi normalisée créée à partir des données brutes. Utilisée par les agents IA.

| Champ                | Type     | Notes                                      |
| -------------------- | -------- | ------------------------------------------ |
| id                   | Int      |                                            |
| jobOfferRawId        | Int      | FK → JobOfferRaw                           |
| title                | String   | Intitulé du poste                          |
| company              | String   |                                            |
| description          | String   | Texte complet de la description du poste   |
| url                  | String   | URL de l'offre LinkedIn                    |
| salary               | String   | Optionnel, tel que publié                  |
| location             | String   |                                            |
| remoteMode           | String   | `onsite` / `hybrid` / `remote`             |
| employmentType       | String   | `full_time` / `part_time` / `contract` / `internship` |
| seniority            | String   | `entry` / `mid` / `senior` / `lead` / `executive` |
| jobSummary           | String   | Résumé normalisé court                     |
| responsibilities     | String[] | Responsabilités clés (colonne JSON)        |
| requirementsMustHave | String[] | Exigences obligatoires (colonne JSON)      |
| requirementsNiceToHave | String[] | Exigences souhaitées (colonne JSON)      |
| keywords             | String[] | Mots-clés extraits (colonne JSON)          |
| tools                | String[] | Outils mentionnés (colonne JSON)           |
| languages            | String[] | Langues requises (colonne JSON)            |
| yearsExperienceMin   | Int      | Optionnel                                  |
| postedDate           | DateTime | Optionnel                                  |

### GeneratedCV

CV structuré et ciblé pour un poste, généré par l'Agent Candidat.

| Champ                  | Type     | Notes                                              |
| ---------------------- | -------- | -------------------------------------------------- |
| id                     | Int      |                                                    |
| profileId              | Int      | FK → Profile                                       |
| jobPostId              | Int      | FK → JobPost                                       |
| version                | Int      | Compteur d'itérations                              |
| language               | String   | Langue du CV (ex. "fr", "en")                      |
| title                  | String   | ex. "CV ciblé - Senior Product Designer"           |
| header                 | Json     | `{fullName, headline, contact, links}`             |
| summary                | String   | Résumé professionnel adapté                        |
| skillsHighlighted      | String[] | Compétences sélectionnées pour ce poste (colonne JSON) |
| experiencesSelected    | Json     | `[{experienceId, rewrittenBullets[]}]`             |
| educationSelected      | Json     | Entrées de formation sélectionnées                 |
| certificationsSelected | Json     | Certifications sélectionnées                       |
| keywordsCovered        | String[] | Mots-clés du poste couverts (colonne JSON)         |
| omittedItems           | String[] | Éléments délibérément exclus (colonne JSON)        |
| generationNotes        | String[] | Notes de raisonnement de l'agent (colonne JSON)    |

### ATSReview

Sortie de l'Agent ATS — vérification de la conformité des mots-clés et du format.

| Champ             | Type     | Notes                                      |
| ----------------- | -------- | ------------------------------------------ |
| id                | Int      |                                            |
| cvId              | Int      | FK → GeneratedCV                           |
| jobPostId         | Int      | FK → JobPost                               |
| score             | Int      | 0–100                                      |
| passed            | Boolean  |                                            |
| hardFiltersStatus | Json     | `[{filter, status, evidence}]`             |
| matchedKeywords   | String[] | Mots-clés trouvés dans le CV (colonne JSON) |
| missingKeywords   | String[] | Mots-clés absents du CV (colonne JSON)     |
| formatFlags       | String[] | Problèmes de mise en forme (colonne JSON)  |
| recommendations   | String[] | Améliorations suggérées (colonne JSON)     |

### RecruiterReview

Sortie de l'Agent Recruteur — vérification de la lisibilité et de la crédibilité.

| Champ            | Type     | Notes                              |
| ---------------- | -------- | ---------------------------------- |
| id               | Int      |                                    |
| cvId             | Int      | FK → GeneratedCV                   |
| jobPostId        | Int      | FK → JobPost                       |
| score            | Int      | Score global 0–100                 |
| passed           | Boolean  |                                    |
| readabilityScore | Int      | 0–100                              |
| credibilityScore | Int      | 0–100                              |
| coherenceScore   | Int      | 0–100                              |
| evidenceScore    | Int      | 0–100                              |
| strengths        | String[] | Points forts (colonne JSON)        |
| concerns         | String[] | Problèmes identifiés (colonne JSON) |
| recommendations  | String[] | Améliorations suggérées (colonne JSON) |

### ReviewAgreement

Objet de décision finale de l'orchestrateur.

| Champ              | Type     | Notes                                                |
| ------------------ | -------- | ---------------------------------------------------- |
| id                 | Int      |                                                      |
| jobPostId          | Int      | FK → JobPost                                         |
| cvId               | Int      | FK → GeneratedCV                                     |
| cvGenerationOk     | Boolean  |                                                      |
| atsOk              | Boolean  |                                                      |
| recruiterOk        | Boolean  |                                                      |
| reviewAgreementOk  | Boolean  |                                                      |
| finalStatus        | String   | `FINAL_APPROVED` / `REJECTED` / `NEEDS_REVISION`    |
| rejectionReasons   | String[] | Raisons du rejet (colonne JSON)                      |
| iterationCount     | Int      |                                                      |

---

## Routes API

Chemin de base : `/api`

### Profile

| Méthode | Route            | Description                              |
| ------- | ---------------- | ---------------------------------------- |
| GET     | `/api/profile`   | Récupérer le document profil complet     |
| PUT     | `/api/profile`   | Remplacer le document profil complet     |

### Offres d'emploi — Brutes

| Méthode | Route               | Description                                              |
| ------- | ------------------- | -------------------------------------------------------- |
| POST    | `/api/jobs/raw`     | L'extension envoie les données brutes scrapées ; normalisation automatique en JobPost |
| GET     | `/api/jobs/raw`     | Lister les captures brutes                               |
| GET     | `/api/jobs/raw/:id` | Récupérer une capture brute                              |

### Offres d'emploi — Normalisées

| Méthode | Route             | Description                      |
| ------- | ----------------- | -------------------------------- |
| GET     | `/api/jobs`       | Lister les offres normalisées    |
| GET     | `/api/jobs/:id`   | Récupérer une offre normalisée   |
| PUT     | `/api/jobs/:id`   | Mettre à jour une offre          |
| DELETE  | `/api/jobs/:id`   | Supprimer une offre              |

### CVs

| Méthode | Route                                        | Description                            |
| ------- | -------------------------------------------- | -------------------------------------- |
| POST    | `/api/cvs/generate`                          | Générer un CV ciblé (lance le pipeline multi-agents complet) |
| GET     | `/api/cvs`                                   | Lister tous les CVs générés            |
| GET     | `/api/cvs/:id`                               | Récupérer un CV généré spécifique      |
| DELETE  | `/api/cvs/:id`                               | Supprimer un CV généré                 |

### Revues

| Méthode | Route                                        | Description                            |
| ------- | -------------------------------------------- | -------------------------------------- |
| GET     | `/api/cvs/:id/ats-review`                    | Récupérer la revue ATS d'un CV        |
| GET     | `/api/cvs/:id/recruiter-review`              | Récupérer la revue recruteur d'un CV   |

**Corps de la requête POST `/api/cvs/generate` :**

```json
{
  "jobPostId": 1,
  "language": "fr"
}
```

L'endpoint récupère le profil complet + l'offre d'emploi, exécute le pipeline multi-agents (Agent Candidat → Agent ATS → Agent Recruteur → Orchestrateur), et stocke le GeneratedCV, l'ATSReview, la RecruiterReview et le ReviewAgreement.

---

## Validation

Fastify intègre nativement la validation des requêtes via JSON Schema. Chaque route définit un schéma pour le corps de la requête et ses paramètres, et Fastify rejette les requêtes invalides avec un `400` avant l'exécution du handler.

### Approche

- Définir les schémas avec `@sinclair/typebox` (inclus avec Fastify) pour obtenir schéma + type TypeScript à partir d'une seule définition.
- Les schémas sont co-localisés avec leurs routes (dans chaque fichier de route).
- Valider uniquement à la frontière API — pas de vérifications redondantes dans les services.

### Éléments validés

| Domaine         | Règles                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| Champs requis   | Rejeter les champs requis manquants (ex. `identity.name`, `identity.email`) |
| Types           | Les strings sont des strings, les nombres sont des nombres, les dates sont des chaînes ISO-8601 |
| Enums           | `employmentType`, `seniority`, `remoteMode`, `level`, `finalStatus` doivent être parmi les valeurs autorisées |
| Limites de chaînes | Longueurs maximales raisonnables (ex. `name` ≤ 200, `description` ≤ 10000) |
| Paramètres ID   | Les paramètres de route `:id` doivent être des entiers positifs        |

### Format des erreurs

Réponse d'erreur de validation par défaut de Fastify :

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body/email must match format \"email\""
}
```

Pas besoin de handler d'erreur personnalisé — le format par défaut est suffisamment clair pour une démo.

---

## Couche IA

```
services/ai/
  openai.ts   — Implémentation OpenAI (SDK OpenAI)
```

Toutes les opérations des agents IA (normalisation, génération de CV, revue ATS, revue recruteur) utilisent l'API OpenAI via le SDK officiel. Nécessite la variable d'environnement `OPENAI_API_KEY`.

---

## Structure du projet

```
src/
  server.ts              — Configuration de l'app Fastify, enregistrement des plugins
  routes/
    profile.ts           — CRUD du profil
    jobs.ts              — Endpoints offres d'emploi + captures brutes
    cvs.ts               — Endpoints génération de CV + revues
  services/
    ai/
      openai.ts          — Appels API OpenAI
    cv-generator.ts      — Orchestre le pipeline multi-agents
    normalize.ts         — Normalise les données brutes en JobPost
prisma/
  schema.prisma          — Tous les modèles de données
  seed.ts                — Données de démo du profil
.env.example             — Template avec les variables d'env requises
package.json
tsconfig.json
```

---

## Installation et configuration

### Variables d'environnement

```env
# Requis
OPENAI_API_KEY=sk-...

# Optionnel
PORT=3000                   # Port du serveur (par défaut : 3000)
DATABASE_URL=file:./dev.db  # Chemin SQLite (par défaut : file:./dev.db)
```

### Démarrage rapide

```bash
git clone <repo-url>
cd dreamjob
cp .env.example .env       # Ajoutez votre clé API
npm install
npx prisma db push          # Créer la base SQLite + les tables
npx prisma db seed           # Charger les données de démo
npm run dev                  # Démarrer Fastify sur :3000
```

### Scripts

| Script          | Commande                | Objectif                       |
| --------------- | ----------------------- | ------------------------------ |
| `dev`           | `tsx watch src/server.ts` | Serveur de dev avec rechargement automatique |
| `build`         | `tsc`                  | Compiler le TypeScript         |
| `start`         | `node dist/server.js`  | Démarrage en production        |
| `db:push`       | `prisma db push`       | Synchroniser le schéma avec la BDD |
| `db:seed`       | `prisma db seed`       | Insérer les données de démo    |
| `db:studio`     | `prisma studio`        | Navigateur visuel de la BDD    |

---

## Données de démo

Le script de seed crée une seule ligne Profile avec un document JSON complet contenant :
- Identité (nom, titre, contact, liens)
- Rôles cibles et contraintes
- 2-3 expériences professionnelles avec réalisations (texte, métrique, niveau de preuve) et compétences utilisées
- 1-2 entrées de formation
- 8-10 compétences réparties par catégories avec années d'expérience et références de preuves
- 1-2 certifications
- 2-3 langues avec niveaux de maîtrise
- 2-3 projets de portfolio
- 1-2 références

Cela permet aux utilisateurs de tester immédiatement la fonctionnalité d'adaptation sans saisie manuelle de données.
