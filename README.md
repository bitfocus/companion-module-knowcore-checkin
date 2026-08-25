# companion-module-knowcore-checkin

Bitfocus Companion module for [KnowCore](https://knowcore.app) — church check-in platform.

Drives KnowCore's live NFC tag redirect: a button press in Companion sends every tag tap to a pre-approved destination (giving page, connect card, …) and reverts to normal check-in on demand or on a timeout.

See [companion/HELP.md](companion/HELP.md) for user-facing setup instructions.

## Development

```bash
yarn install
# point a local Companion dev instance at this directory, or:
yarn package
```

The module talks to the KnowCore backend's control API:

- `GET /live/{slug}/control` — status + destination list (token auth)
- `POST /live/{slug}/control` — set/clear the live redirect target (token auth)

## License

MIT
