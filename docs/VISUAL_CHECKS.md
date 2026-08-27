# Visual verification

- Desktop `/`: cosmic hero, visible contrast, primary CTA, navigation, and orbit illustration render at 1280×720.
- Desktop `/recruitment`: public recruitment form renders with Supabase-backed empty-question state rather than demo prompts.
- Desktop `/verify`: public certificate verification form renders with minimal-result framing.
- Desktop `/dashboard`: unauthenticated boundary renders a clear sign-in return path.
- Mobile `/events` and `/committees` at 390×844: headings, empty states, navigation, spacing, and contrast remain readable without horizontal overflow.
- Mobile `/certificate-access`: guest ticket claim form stacks correctly and preserves primary action visibility.
- Mobile `/reset-password`: password reset form stacks correctly with readable labels and full-width action.
- Supabase schema is not yet applied to the target project, so public catalog views intentionally show an empty state; this is expected and not a local-data fallback.
