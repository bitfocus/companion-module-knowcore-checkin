# KnowCore Check-In

Control your [KnowCore](https://knowcore.app) NFC tag redirect live from Companion. During a service moment (offering, connect card, announcements) a button press sends every tag tap to a pre-approved destination — your giving page, a connect form, anything you've whitelisted — and another press (or an automatic timeout) reverts taps to normal check-in.

Because destinations are whitelisted by name inside KnowCore, Companion can only ever switch between the destinations your church admin has approved — never an arbitrary URL.

## Setup

1. In the KnowCore admin console, go to **Settings → Integrations** and enable **Bitfocus Companion**, then open the **Bitfocus** tab and click **Generate token**. Copy the token — it is shown only once.
2. Go to **Check-Ins → Tag Redirect**, set the mode to **Bitfocus / Companion**, and add your **destinations** (each has a short name like `giving` and a URL).
3. In Companion, add this connection and enter:
   - **Church slug** — the first part of your church's KnowCore address (for `mychurch.knowcore.app`, the slug is `mychurch`).
   - **Control token** — the token from step 1.
4. The connection turns green when the token is verified. Your destinations appear automatically in the action dropdowns and as ready-made **presets** (one button per destination, plus a "Tags → Check-In" revert button).

## Actions

- **Toggle tag destination** — press to redirect all tag taps to a destination, press again to revert to check-in (what the destination presets use).
- **Set tag destination** — always switches *to* the destination (never toggles off) — useful for triggers/automation, e.g. a ProPresenter slide cue.
- **Revert to check-in** — taps behave normally again.

Every redirect carries an auto-revert timeout (default 3 hours, max 12) as a safety net in case nobody presses revert after the service.

## Feedbacks

- **Check-in is active** — button lights up green while taps behave normally (used on the "Tags → Check-In" preset).
- **Destination is active** — button lights up while taps are being redirected to that destination.
- **Any redirect is active** — lights up whenever taps go anywhere other than normal check-in.

## Variables

- `$(knowcore:target)` — the currently active destination name (`checkin` when normal).
- `$(knowcore:church)` — church name.
- `$(knowcore:mode)` — the NFC redirect mode configured in KnowCore.
- `$(knowcore:expires_at)` — when the current push auto-reverts.

## Tips

- Fire the actions from **triggers** (e.g. a ProPresenter slide cue via the ProPresenter module, or a timeline) to flip tags automatically at the right service moment.
- If the connection shows a warning, your NFC redirect mode isn't set to **Bitfocus** yet — pushes are accepted but won't take effect until you switch the mode in **Check-Ins → Tag Redirect**.
- Regenerating the token in KnowCore invalidates the old one; paste the new token into the connection config.
