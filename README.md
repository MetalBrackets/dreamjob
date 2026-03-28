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