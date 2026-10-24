# HVADPRISEN?

Et dagligt prisgæt: gæt prisen på dagens danske dagligvare på 6 forsøg.

- Hvert gæt skal være en gyldig pris i kroner.
- Forkerte gæt viser dig vejen mod den rigtige pris (↑ / ↓, gul = inden for 25 %).
- Rammer du inden for 50 øre af prisen, har du vundet!

Der er en ny vare hver dag.

## Kør lokalt

Spillet er en statisk side (HTML, CSS og JavaScript) uden build-trin. Start en lokal webserver i projektmappen:

```bash
python -m http.server 8000
```

Åbn derefter http://localhost:8000 i din browser.

## Varer

Varerne ligger i `games.json`. Hver vare har et navn, en pris (fx `"24.95 kr."`) og et billede (lokale billeder ligger i `assets/products/`). Spillet går i ring gennem listen, én vare om dagen.

## Licens

MIT. Se `LICENSE`.
