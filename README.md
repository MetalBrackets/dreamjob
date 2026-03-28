curl -X POST http://localhost:3000/api/cvs/generate -H "Content-Type: application/json" -d '{"jobPostId": "job_01", "language": "fr"}'

# dreamjob

LinkedIn-style hackathon prototype for AI-assisted job applications.

## Repo layout

- `backend-design.md`: backend schema and route design.
- `extension-ui/`: Chrome MV3 UI scaffold for the demo.
- `SPRINT-1-PLAN.md`: 1.5-day sprint plan for the frontend flow.

## UI focus

The extension UI is built around a side panel flow:

- master resume
- selected offer
- application dashboard
- interview preparation

The current scaffold is mock-first and shaped to connect later to the backend routes defined in `backend-design.md`.

## Protocole installation 

Need :
- chrome
- the repo github

go into the folder ```extension-ui```
Inside the folder you have to make the installations of the dependencies ```npm i```
Once you have done all the installations build the extension ```npm run build```

Load Chrome
In Chrome go to ```chrome://extensions```
active the ```dev-mode``` (en haut à droite)
Click on ```Load unpack```
find the correct folder inside ```extension-ui\dists``` Load it.
once you have it you have to re-load chrome and it should work

## Lancer en local

**Backend** (depuis la racine du repo) :
```bash
npm i
npm run dev       # Fastify avec hot reload (tsx watch)
npm run seed      # Charger les donnees de test
```

**Extension UI** (depuis `extension-ui/`) :
```bash
cd extension-ui
npm i
npm run dev       # Serveur Vite
npm run build     # Build pour charger dans Chrome
```

Les deux serveurs tournent sur des ports differents et peuvent etre lances en parallele sans conflit.

## Endpoints API

> Pour les contrats complets, voir `backend-design.md` et `src/schemas/`.

### Profil

| Methode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/profile` | Recuperer le profil utilisateur |
| `PUT` | `/api/profile` | Remplacer le profil complet |

**`PUT /api/profile`** — Corps de la requete :
```jsonc
{
  "id": "string",                // identifiant du profil
  "data": ProfileData,           // voir Objets de donnees cles
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

### CV (upload & extraction)

| Methode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/resume/upload` | Uploader un PDF (multipart, max 10 Mo) |
| `GET` | `/api/resume/status` | Statut de l'upload |
| `GET` | `/api/resume/extraction` | Donnees extraites + scores de confiance |
| `POST` | `/api/resume/extraction/confirm` | Confirmer l'extraction vers le profil |
| `PUT` | `/api/resume/extraction/review` | Marquer une section comme relue |
| `GET` | `/api/resume/completeness` | Progression, score, checklist |

**`POST /api/resume/upload`** — Multipart form-data, un seul fichier PDF (`application/pdf`), max 10 Mo.

**`PUT /api/resume/extraction/review`** — Corps de la requete :
```jsonc
{
  "section": "string",   // "identity" | "targetRoles" | "professionalSummaryMaster" | "constraints" | "experiences" | "education" | "skills" | "certifications" | "languages" | "projects" | "references"
  "itemId": "string",    // (optionnel) requis pour les sections de type tableau
  "reviewed": true       // boolean
}
```

### Offres d'emploi (brutes)

| Methode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/jobs/raw` | Capturer une offre depuis l'extension |
| `GET` | `/api/jobs/raw` | Lister toutes les captures brutes |
| `GET` | `/api/jobs/raw/:id` | Recuperer une capture par ID |
| `GET` | `/api/jobs/current` | Recuperer la derniere offre capturee |

**`POST /api/jobs/raw`** — Corps de la requete :
```jsonc
{
  "source": "string",           // (requis) source de l'offre
  "sourceUrl": "string",        // (requis) URL de la source
  "rawText": "string",          // (requis) texte brut de l'offre
  "htmlSnapshotRef": "string",  // (optionnel) reference au snapshot HTML
  "rawFields": {                // (optionnel) champs structures
    "title": "string",
    "company": "string",
    "location": "string",
    "employment_type": "string",
    "salary": "string",
    "description": "string",
    "requirements": "string",
    "posted_date": "string"
  }
}
```

**`GET /api/jobs/raw/:id`** — Parametre de route : `id` (string).

### Offres d'emploi (normalisees)

| Methode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/jobs` | Lister toutes les offres normalisees |
| `GET` | `/api/jobs/:id` | Recuperer une offre par ID |
| `PUT` | `/api/jobs/:id` | Modifier une offre |
| `DELETE` | `/api/jobs/:id` | Supprimer une offre |

**`GET /api/jobs/:id`**, **`PUT /api/jobs/:id`**, **`DELETE /api/jobs/:id`** — Parametre de route : `id` (string).

**`PUT /api/jobs/:id`** — Corps de la requete (tous les champs sont optionnels) :
```jsonc
{
  "title": "string",                    // max 200 car.
  "company": "string",                  // max 200 car.
  "description": "string",              // max 10 000 car.
  "url": "string",
  "salary": "string",
  "location": "string",                 // max 200 car.
  "remoteMode": "onsite | hybrid | remote",
  "employmentType": "full_time | part_time | contract | internship",
  "seniority": "entry | mid | senior | lead | executive",
  "jobSummary": "string",               // max 10 000 car.
  "responsibilities": ["string"],
  "requirementsMustHave": ["string"],
  "requirementsNiceToHave": ["string"],
  "keywords": ["string"],
  "tools": ["string"],
  "languages": ["string"],
  "yearsExperienceMin": 0,              // nombre
  "postedDate": "string"
}
```

### CV generes & reviews

| Methode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/cvs/generate` | Lancer la generation d'un CV |
| `GET` | `/api/cvs` | Lister tous les CV generes |
| `GET` | `/api/cvs/:id` | Recuperer un CV |
| `DELETE` | `/api/cvs/:id` | Supprimer un CV |
| `GET` | `/api/cvs/:id/ats-review` | Review ATS du CV |
| `GET` | `/api/cvs/:id/recruiter-review` | Review recruteur du CV |

**`POST /api/cvs/generate`** — Corps de la requete :
```jsonc
{
  "jobPostId": "string",  // (requis) ID de l'offre ciblee
  "language": "string"     // (requis) langue du CV genere
}
```

**`GET /api/cvs/:id`**, **`DELETE /api/cvs/:id`**, **`GET /api/cvs/:id/ats-review`**, **`GET /api/cvs/:id/recruiter-review`** — Parametre de route : `id` (string).

## Objets de donnees cles

| Objet | Champs principaux | Role |
|-------|-------------------|------|
| **ProfileData** | `identity`, `experiences[]`, `education[]`, `skills[]`, `targetRoles[]`, `constraints` | Identite professionnelle de l'utilisateur |
| **JobOfferRaw** | `source`, `sourceUrl`, `rawText`, `rawFields` | Capture brute depuis l'extension navigateur |
| **JobPost** | `title`, `company`, `location`, `remoteMode`, `seniority`, `employmentType`, `requirements*`, `keywords[]`, `tools[]` | Offre normalisee par l'IA |
| **GeneratedCV** | `header`, `summary`, `skillsHighlighted[]`, `experiencesSelected[]`, `keywordsCovered[]`, `coverageMap` | CV cible genere pour une offre |
| **ATSReview** | `score`, `passed`, `matchedKeywords[]`, `missingKeywords[]`, `recommendations[]` | Evaluation ATS automatique |
| **RecruiterReview** | `score`, `passed`, `readabilityScore`, `credibilityScore`, `strengths[]`, `concerns[]` | Evaluation recruteur simulee |
| **AddonResult** | `status`, `overall_score`, `scores`, `strengths[]`, `weaknesses[]`, `recommendations[]` | Reponse finale renvoyee a l'extension |

## Enums

| Enum | Valeurs |
|------|---------|
| `remoteMode` | `onsite`, `hybrid`, `remote` |
| `employmentType` | `full_time`, `part_time`, `contract`, `internship` |
| `seniority` | `entry`, `mid`, `senior`, `lead`, `executive` |
| `finalStatus` | `FINAL_APPROVED`, `REJECTED`, `NEEDS_REVISION` |
