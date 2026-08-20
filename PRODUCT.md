# Product

## Register

product

## Users

Spanish-speaking medical professionals: practicing physicians (all specialties), residents (MIR), and medical students. They use Hygia under time pressure — between patients, during rounds, before signing a prescription. Context: clinical environment, often mobile, always high stakes. They are domain experts who don't want to be taught; they want a fast, reliable peer.

Secondary surface: the landing page converts skeptical physicians who need to trust the product before handing over a clinical workflow. Trust is earned in seconds.

Note: both surfaces carry equal design weight. The landing must look like the app deserves to exist; the app must feel like the landing promised.

## Product Purpose

Hygia is a clinical AI assistant that helps doctors reason faster without replacing their judgment. It summarizes patient histories, generates ranked differential diagnoses with linked evidence, verifies drug interactions, and reasons over uploaded clinical documents (PDFs, DICOM). Success: a physician acts on better information in less time, and feels confident in the source. Failure: the physician second-guesses the AI or abandons the session.

## Brand Personality

Experto. Directo. Confiable.

Voice: a senior colleague, not a chatbot. Confident, brief, referenced. No hedging, no over-explaining. When uncertain, says so explicitly with a reason.

Emotional goal for brand surface: "this is serious software made by people who understand medicine." Emotional goal for product surface: "I can trust this answer."

## Anti-references

- **SaaS-generic startup aesthetic**: purple/violet brand colors, floating gradient cards, Notion/Linear/Loom visual language. Hygia is not a productivity tool for knowledge workers.
- **Sterile healthcare white**: hospital-blue + white, stethoscope iconography, stock-photo clinics. Doctors associate this aesthetic with outdated EMR software they hate.
- **AI hype aesthetics**: neon on dark, particle effects, ChatGPT/Midjourney vibes, gradient text, "powered by AI" badges. The AI is the infrastructure, not the identity.
- **Consumer wellness softness**: Calm/Headspace pastels, organic shapes, rounded everything. Too relaxed for a tool used in acute care.

## Design Principles

1. **Confianza sin ornamento.** Trust is built through precision and restraint, not visual decoration. Every element that doesn't carry information should be removed.
2. **Velocidad clínica.** The UI should feel as fast as the 8-second AI response implies. No loading theater, no transition bloat, no content that makes the user wait to read.
3. **Evidencia a la vista.** Information hierarchy mirrors clinical decision-making: most critical data first, supporting evidence secondary, disclaimers last. Never bury the answer.
4. **El médico decide.** The interface never competes with clinical judgment. It presents, then steps back. CTAs, badges, and confirmation prompts should earn their presence.
5. **Escrito para pares.** Copy speaks to experts, not patients or consumers. No explanations of basic medicine, no reassuring softeners. Directness is a sign of respect.

## Accessibility & Inclusion

WCAG AA minimum, AA+ where possible. Spanish-only interface (es-ES). Critical: keyboard navigation for tablet/desktop clinical workflows. Prefers-reduced-motion respected throughout (patients and physicians may be sensitive to motion in clinical environments). Sufficient contrast in both light and dark themes; the product uses `data-dark` for dark mode.
