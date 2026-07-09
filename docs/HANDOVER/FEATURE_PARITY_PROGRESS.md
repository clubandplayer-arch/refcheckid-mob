# RefCheckID — Feature Parity Progress

> La Feature Parity funzionale rispetto alla Source of Truth Web è stata raggiunta.
>
> Resta in corso una fase separata di **Mobile UX Hardening** finalizzata a trasformare il porting funzionale in una vera applicazione mobile.
>
> Le attività di questa fase non modificano API, validazioni o workflow funzionali, ma esclusivamente esperienza d'uso, layout, accessibilità e adattamento Mobile-first.

## Stato generale del progetto

- Binario: **B — Mobile Feature Parity**
- Source of Truth: `source-of-truth/refcheckid`
- Wave completate/approvate: **13/13**
- Wave implementate e in review: **0/13**
- Percentuale di completamento approvato: **100%**
- Percentuale di implementazione consegnata: **100%**
- Stato corrente: **Wave 12 – Completed / Reviewed / Approved**
- Wave corrente: **Wave 12 – Hardening finale, test end-to-end e certificazione 100% Feature Parity**

## Legenda stati

- ⚪ Not Started
- 🟡 In Progress
- 🟢 Implemented
- 🔵 Under Review
- ✅ Approved
- 🚀 Merged

## Stato Wave 0-12

| Wave | Nome | Status | Review | Merge | Completamento |
|---|---|---:|---:|---:|---:|
| Wave 0 | Governance, Source of Truth e matrice di copertura | ✅ Approved | 100% | — | 100% |
| Wave 1 | Fondazioni applicative, configurazione e design system minimo | ✅ Approved | 100% | 🚀 Merged | 100% |
| Wave 2 | Sessione, autenticazione, autorizzazione e routing protetto | ✅ Completed / Reviewed / Approved | 100% | — | 100% |
| Wave 3 | API client, cache, error/loading/empty framework e contratti dati | ✅ Completed / Reviewed / Approved | 100% | — | 100% |
| Wave 4 | Dashboard Manager e contesto squadra | ✅ Completed / Reviewed / Approved | 100% | — | 100% |
| Wave 5 | Distinta Manager: roster, selezione, ruoli e validazioni core | ✅ Completed / Reviewed / Approved | 100% | — | 100% |
| Wave 6 | Distinta Manager: upload foto, richieste approvazione e submit lifecycle | ✅ Completed | Approved | — | 100% |
| Wave 7 | Dashboard Arbitro e verifica distinte | ✅ Completed | Approved | — | 100% |
| Wave 8 | Riconoscimento arbitrale completo | Completed | Approved | — | 100% |
| Wave 9 | Referto arbitrale completo | Completed | Approved | — | 100% |
| Wave 10 | Federazione: cruscotto e calendario | Completed | Approved | — | 100% |
| Wave 11 | Federazione: referti, foto, storico e audit | Completed | Approved | — | 100% |
| Wave 12 | Hardening finale, test end-to-end e certificazione 100% Feature Parity | ✅ Completed / Reviewed / Approved | Approved | — | 100% |


## Stato finale

- Feature Parity Mobile = **100%**
- Roadmap Feature Parity Mobile completata.
- Binario B certificato come completato con **13/13 Wave approvate**.

## Chiusura hardening Mobile P0/P1

- **P0 Hardening Mobile completata e verificata**: shell comune, Safe Area, scroll, keyboard handling e navigazione workflow sono stati validati manualmente senza regressioni su login, dashboard, Distinta e workflow Arbitro.
- **P1 Foto Distinta completata e verificata rispetto alla Source of Truth Web attuale**: la UI tecnica temporanea è stata sostituita con UX Mobile nativa per scatto foto, selezione da galleria, anteprima, sostituzione, conferma e annulla, mantenendo le stesse regole funzionali oggi presenti nel Web.
- **Source of Truth foto attuale**: la gestione foto tramite `manager-photo-store` locale resta la Source of Truth funzionale corrente del Web e quindi del Mobile.
- **Evoluzione futura esclusa dalla P1 Mobile**: le foto ufficiali backend/storage-first non fanno parte della P1 Mobile; saranno affrontate in una successiva evoluzione Web/Backend della Source of Truth e solo dopo replicate dal Mobile.

## Follow-up hardening Federazione

- Durante i test reali della sezione Federazione è stata confermata una criticità UX ancora desktop-oriented: le schermate lunghe richiedono hardening dello scrolling e il confronto foto deve essere ottimizzato per Mobile.
- Questa criticità è tracciata come follow-up dedicato della sezione Federazione e non modifica la chiusura P0/P1 Manager/Arbitro/Fotografia Distinta.
