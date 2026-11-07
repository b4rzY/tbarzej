# Tomas Barzelatto

A personal portfolio covering independent reverse engineering, programming, interactive interfaces and AI-assisted product development.

## Interactive scene

The hero uses actual beveled 3D geometry. WebGL is the preferred renderer; an interactive Canvas2D projection renderer is available when WebGL cannot initialize. A static render remains available if neither rendering path works. The scene is a conceptual portfolio study, not a physical product claim.

- Drag to orbit, or focus the scene and use the arrow keys.
- Use the zoom controls or +/−. Home resets the view.
- Select Systems, Interfaces or Products to explore the related work.
- Assemble/separate the layers, or pause the motion.
- On small/touch screens, enable 3D controls before dragging. Escape or Exit restores ordinary page gestures.

Reduced-motion preferences pause automatic movement. Explicit playback remains optional. Rendering pauses when the scene is offscreen or the page is hidden; the software path is capped at 30 frames per second.

The EN/ES switch updates content and accessible labels. Project tabs and disclosures have native keyboard controls. No analytics, visitor accounts, forms, tracking or persistent visitor data are used. The application makes no external runtime requests.

## Development

Node.js 22 or newer. No application dependencies are required.

- `npm run build`: generates the static `dist/` directory and a self-contained offline HTML copy.
- `npm test`: runs consistency, privacy, localization, engine lifecycle and renderer-state tests.
- `npm run check`: checks JavaScript syntax, builds and runs all tests.

Edit `src/`, not the generated output. The build replaces `dist/`.

## Hosting

The included Vercel configuration uses `npm run build`, output directory `dist`, and no framework preset. No API keys, environment variables or backend are needed. Security headers restrict network connections, framing, camera, microphone and location access.

## Attribution and scope

The portfolio distinguishes product ideas, requirements, design direction and iteration from AI-assisted implementation. The technology list describes tools used across projects, not proficiency scores or a claim that every line was written independently. Prototype limitations are explicitly documented in the interface.

The workspace visual is an original concept diagram. The cat-finding capture contains simulated data. Private source, client business information and personal contact details are not included.

See `LICENSE-NOTES.md` for asset notices.
