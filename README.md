# KanbanGXP

KanbanGXP is a private, local-first Kanban goal planner for organizing work and personal goals. It runs entirely in the browser, requires no account, and keeps workspace data on the user's device.

The application combines a flexible Kanban board with projects, sprints, labels, measurable outcomes, and a focused daily view. Workflow stages are fully customizable, so a board can use a simple **To Do → In Progress → Done** process or stages such as **Backlog**, **Blocked**, **Under Review**, and **Testing**.

## Project goals

KanbanGXP is designed to:

- Provide a simple project and goal management tool without requiring a hosted backend.
- Keep user data private and under the user's control.
- Support different workflows through customizable Kanban columns.
- Make goals measurable with checklists, milestones, and numeric targets.
- Remain easy to self-host as a static website.
- Keep workspace data portable through JSON import and export.

## Features

- Multiple projects
- Custom workflow columns that can be created, renamed, reordered, and deleted
- Drag-and-drop goal management
- Goal priorities, due dates, labels, and lifecycle states
- Checklist, milestone, and numeric success metrics
- Sprint planning and progress tracking
- Focus Mode for today's and in-progress goals
- Real-time search by title, description, or label
- Archive support
- Multiple visual themes
- JSON backup, restore, and additive import
- Browser storage availability reporting and persistent-storage requests

## Local-first data storage

KanbanGXP does not require a database or application server. Projects, goals, sprints, labels, workflow columns, and theme preferences are stored in the browser's origin-scoped `localStorage`.

This means:

- Data is available only in the same browser profile and application origin.
- `http://localhost:3000` and a deployed domain have separate workspaces.
- Switching browsers or devices does not automatically transfer data.
- Clearing site data can remove the workspace.
- The **Protect local data** setting requests browser-supported persistent-storage protection.
- JSON exports should be kept as regular backups.

There is currently no cloud synchronization, user authentication, telemetry, or server-side persistence.

## Technology

- React 19
- TypeScript
- Vite
- Tailwind CSS
- dnd-kit
- Motion
- Lucide icons

## Run locally

### Requirements

- Node.js 20 or newer
- npm

### Setup

```bash
git clone https://github.com/cloudgxp/kanbangxp.git
cd kanbangxp
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The current application does not require environment variables. Do not place private API keys in client-side Vite environment variables because values included in a frontend build can be inspected by users.

## Available commands

```bash
npm run dev      # Start the development server on port 3000
npm run lint     # Run the TypeScript type check
npm run build    # Create a production build in dist/
npm run preview  # Preview the production build locally
```

## Self-hosting

KanbanGXP builds to static HTML, CSS, and JavaScript. It can be hosted by any service capable of serving static files over HTTP or HTTPS.

### 1. Build the application

```bash
npm ci
npm run lint
npm run build
```

The deployable website will be created in `dist/`.

### 2. Serve `dist/`

Upload the contents of `dist/` to a static host, web server, object-storage website, or CDN.

For example, an Nginx virtual host can serve the application with:

```nginx
server {
    listen 80;
    server_name kanban.example.com;

    root /var/www/kanbangxp/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Copy the production files to the configured directory:

```bash
sudo mkdir -p /var/www/kanbangxp
sudo cp -R dist /var/www/kanbangxp/
sudo nginx -t
sudo systemctl reload nginx
```

Configure HTTPS through your reverse proxy or hosting provider before using the application beyond a trusted local network.

### Hosting under a URL subpath

The default Vite build expects to be hosted at the root of a domain, such as `https://kanban.example.com/`. To host it under a path such as `https://example.com/kanban/`, set Vite's `base` option to `/kanban/` in `vite.config.ts`, rebuild, and deploy the new `dist/` output.

### Updates

To deploy a newer version:

```bash
git pull
npm ci
npm run lint
npm run build
```

Replace the previously deployed `dist/` directory with the newly generated output. Application updates do not normally remove browser workspace data because it remains associated with the same origin. Changing the domain, protocol, or port creates a different browser storage origin.

## Backup and migration

Use **Settings → Export Data** to download the complete workspace as JSON. The export includes:

- Projects
- Goals
- Sprints
- Labels
- Workflow columns

Use **Import Data** to replace the current workspace or add missing items from a backup. Export the current workspace before replacing data.

## Privacy and security considerations

- KanbanGXP data is not encrypted by the application before being placed in browser storage.
- Anyone with access to the browser profile may be able to inspect its site data.
- Browser privacy tools, storage policies, or manual clearing can remove local data.
- Self-hosting does not create cross-device synchronization or multi-user isolation.
- Use HTTPS for deployed installations and maintain JSON backups for important workspaces.

## Project structure

```text
src/
  components/       UI components and guides
  context/          Theme context
  lib/              Shared utilities and browser storage helpers
  App.tsx           Main application and workspace behavior
  types.ts          Project data models
  main.tsx          React entry point
```

## Credits

KanbanGXP is designed by [CloudGXP](https://github.com/cloudgxp).
