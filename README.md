# Deep Space Exploration

Static frontend for `agentopen.asia`.

## Project structure

```text
.
├── index.html          # Production entry page, copied from local index.optimized.html
├── style.css           # Supporting stylesheet from local workspace
├── script.js           # Supporting JavaScript from local workspace
├── grid-wave.html      # Additional visual experiment/page
├── archive/            # Local source backups for reference only
└── README.md
```

## Deploy

This repository is ready for static hosting providers such as Cloudflare Pages, Vercel, Netlify, or GitHub Pages.

For Cloudflare Pages:

- Framework preset: `None`
- Build command: leave empty
- Build output directory: `/` or `.`
- Production branch: `main`

Then bind the custom domain:

```text
agentopen.asia
www.agentopen.asia
```

## Local preview

Use any static server, for example:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```
