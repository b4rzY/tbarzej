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

The workspace visual is an original concept diagram. The cat-finding capture contains simulated data. Private source and client business information are not included. The contact section publishes only the owner-approved email address. Email links open the visitor’s email application; the site does not submit messages or guarantee delivery.

See `LICENSE-NOTES.md` for asset notices.

## Workflow city and selected work

The workflow city preserves the geometry, traffic and camera projection of the owner's existing city renderer. Nine public example roles replace the original workspace data. Cars, dots and light pulses are simulated animation, not live agent telemetry. The exhibit includes camera controls, role selection, EN/ES text, keyboard operation and reduced-motion support. Select Explore city before drag or pinch interaction; Finish exploring restores normal page gestures.

The Ñami case links to the public meal-planning web app and shows a signed-out homepage capture. Its native iPhone app is still described as coming soon. The professional background includes the owner's current GOZO AI role and dates.

## Galaxy and soundtrack

The procedural galaxy runs on desktop and mobile. Mouse movement and passive touch gestures reveal the mesh without blocking ordinary page scrolling. Reduced-motion preferences disable animation until explicitly enabled.

The owner-supplied soundtrack is local, attempts audible looping autoplay once, and can be paused or adjusted. If browser policy blocks autoplay, an accessible Play control remains. No external audio request is used.

The soundtrack cue starts at 1:38 in the supplied extended arrangement and repeats from that phrase when the track ends. This entrance was selected from tonal and loudness analysis of this file, not a claimed movie-scene timestamp.

## Interactive optical studies

The gravity cursor now applies a bounded SVG displacement field to actual page text, images and canvas surfaces, rather than drawing only on the galaxy. It is decorative: links retain their normal DOM hit areas. Escape, keyboard focus, touch release and reduced-motion preferences remove the lens. No webcam, capture, cloning or third-party service is used.

Three original concept scenes explore an architectural corridor, a sculptural product and a live venue. These are procedural illustrative website directions, not photorealistic filmed environments or client commissions. They offer pointer/touch perspective, scroll travel, keyboard depth control, bilingual copy, pause and offscreen suspension. The two supplied reference videos informed spatial depth and editorial composition; their footage is not redistributed.
