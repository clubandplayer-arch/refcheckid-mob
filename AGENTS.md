# RefCheckID Mobile

- Lavora nel checkout e ramo mobile esistenti. Conserva cronologia, tag di baseline, identificativi nativi, asset e configurazione Expo/EAS.
- Il riferimento funzionale è `clubandplayer-arch/refcheckid`, ramo `codex/organization-platform-audit`, commit `3555792f9d3e109c6917548cbb917caeaad0cbb2`. Leggi codice e guide in un checkout esterno. L'avanzamento si registra in [WEB_MOBILE_ALIGNMENT.md](docs/HANDOVER/WEB_MOBILE_ALIGNMENT.md).
- Usa il backend condiviso. Lo staging di questo riferimento è `https://refcheckid-staging-git-codex-org-92c386-clubandplayers-projects.vercel.app/api/v1`. Verifica contratti, regole e autorizzazioni prima di cambiare i flussi. Documenta API mancanti e blocchi di accesso.
- Realizza schermate native per dirigenti e arbitri. Federazioni e organizzazioni arbitrali usano principalmente il web.
- Mantieni separati referto riservato, archivio eventi e pubblicazione. Distingui dati locali, in attesa e confermati dal server. I ritentativi di scrittura richiedono deduplicazione secondo il contratto backend.
- Dopo ogni sostituzione verifica riferimenti statici e dinamici e rimuovi il codice obsoleto. Evita copie del web, alternative parallele e dati personali o credenziali nel repository.
- Verifica `npm ci`, TypeScript, Jest ed export Android. Aggiungi test significativi per i flussi modificati e separa esiti automatici, staging e dispositivo fisico.
