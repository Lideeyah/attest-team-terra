# UI polish release

Shared route skeletons now cover every surface, including the public register, authentication, field workspaces and onboarding. Real API requests display a delayed, accessible activity indicator; short requests avoid flashing. Buttons, focus, links, hover and active states use existing green tokens. Busy actions have spinners and disabled controls. CSS transitions and animations respect reduced motion.

Live project setup has three gated stages, Back/Continue controls, retained mounted form values, checked inputs, upload/processing feedback and a confirmed acceptance state. Project creation cannot be repeated by navigating back. The existing server-backed developer/institution wizards remain intact.

Operations pages distinguish loading, empty and failed loads and offer refresh. Project selection distinguishes loading, unavailable and empty results. Shared service errors use plain language while diagnostic codes and request references remain available in error objects. Unknown payment outcomes never trigger automatic resubmission or a success claim.

Validation: 25 unit tests passed; local production build passed; type check and scoped lint passed. Hosted navigation, access and onboarding regression checks are run after publishing. The onboarding browser test intercepts writes and does not create production records.

Limits: this polish does not add unavailable business features or change demo providers. Document uploads retain the existing 4 MB deployment limit. Setup values persist when moving between steps in the current page; reloading the page does not restore an unfinished setup. Queued work is shown as pending until a confirmed result arrives.
