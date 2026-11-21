# Alvôco a Recordar

Source for the website of the Associação Alvôco a Recordar, a cultural association from Alvoco das Várzeas, in the Serra do Açor, Portugal.

The site is built in Webflow. This repository holds what Webflow cannot: the script and stylesheet that drive the motion, the three.js scene of the home page, the postal code table and the automation that registers new members.

## What is here

| Path | What it is |
| --- | --- |
| `src/build.py` | Generator of the static prototype the Webflow build follows. Run `python3 src/build.py` to write the pages next to it. |
| `src/assets/app.css` | Stylesheet of the prototype. |
| `src/assets/app.js` | Navigation, page transitions, scroll motion and forms. Needs GSAP 3.13 (ScrollTrigger, SplitText, CustomEase, DrawSVG, MotionPath, Flip) and Lenis 1.1. |
| `src/assets/hero3d.js` | The ridge and the line of lanterns on the home page. Needs three.js r149. |
| `src/assets/cp.json` | Portuguese postal codes (first four digits) to locality, built from `centraldedados/codigos_postais`. |
| `automation/alvoco-site-forms.gs` | Google Apps Script web app. Receives the membership and contact forms, writes them to Notion, assigns the member number and sends the emails. |
| `automation/socios-importar.csv` | Column headers for importing existing members into the Notion database. |

Photographs are not in this repository. They are uploaded to Webflow.

## Loading from Webflow

Files are served by jsDelivr from a tag, so a release never changes under a published site:

```html
<script src="https://cdn.jsdelivr.net/gh/emanuelbento/alvoco-a-recordar@0.1.0/src/assets/app.js" defer></script>
```

## Membership form

The site posts the form as `text/plain` JSON to the Apps Script web app, because Apps Script cannot answer a CORS preflight. The address goes in `window.ALV_ENDPOINT`. Secrets live only in the Script properties of the Apps Script project, never in this repository.

## Fonts

Exo is licensed under the SIL Open Font License.
