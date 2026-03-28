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

### CV (upload & extraction)

| Methode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/resume/upload` | Uploader un PDF (multipart, max 10 Mo) |
| `GET` | `/api/resume/status` | Statut de l'upload |
| `GET` | `/api/resume/extraction` | Donnees extraites + scores de confiance |
| `POST` | `/api/resume/extraction/confirm` | Confirmer l'extraction vers le profil |
| `PUT` | `/api/resume/extraction/review` | Marquer une section comme relue |
| `GET` | `/api/resume/completeness` | Progression, score, checklist |

### Offres d'emploi (brutes)

| Methode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/jobs/raw` | Capturer une offre depuis l'extension |
| `GET` | `/api/jobs/raw` | Lister toutes les captures brutes |
| `GET` | `/api/jobs/raw/:id` | Recuperer une capture par ID |

### Offres d'emploi (normalisees)

| Methode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/jobs` | Lister toutes les offres normalisees |
| `GET` | `/api/jobs/:id` | Recuperer une offre par ID |
| `PUT` | `/api/jobs/:id` | Modifier une offre |
| `DELETE` | `/api/jobs/:id` | Supprimer une offre |

### CV generes & reviews

| Methode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/cvs/generate` | Lancer la generation (body: `{ jobPostId, language }`) |
| `GET` | `/api/cvs` | Lister tous les CV generes |
| `GET` | `/api/cvs/:id` | Recuperer un CV |
| `DELETE` | `/api/cvs/:id` | Supprimer un CV |
| `GET` | `/api/cvs/:id/ats-review` | Review ATS du CV |
| `GET` | `/api/cvs/:id/recruiter-review` | Review recruteur du CV |

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
