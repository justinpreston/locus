# Locus 🏛️

**Your Memory Palace** — A self-hosted project tracking and external memory system.

## Philosophy

Locus uses the ancient "method of loci" (memory palace) metaphor to organize your thoughts, projects, and follow-ups. Instead of cold task lists, you walk through rooms of a palace, each holding artifacts of your memory.

## Rooms

| Room | Purpose | Icon |
|------|---------|------|
| **The Vault** | Trading, finance, investments | 🏦 |
| **The Hearth** | Family, home, personal | 🏠 |
| **The Workshop** | Tech projects and tools | 🔧 |
| **The Garden** | Ideas and someday/maybe | 🌱 |
| **The Archive** | Completed and reference | 📜 |

## Quick Start

```bash
# Serve locally
cd locus
python3 -m http.server 8080

# Or with Node
npx serve .
```

Then open http://localhost:8080/src/

## Structure

```
locus/
├── data/
│   └── projects.json    # All items and room definitions
├── src/
│   ├── index.html       # Main dashboard
│   ├── styles.css       # Memory palace aesthetic
│   └── app.js           # Client-side logic
├── api/
│   └── scan.js          # (future) Auto-scan memory files
└── README.md
```

## Data Schema

Items follow this structure:

```json
{
  "id": "unique-id",
  "title": "Task or project name",
  "room": "vault|hearth|workshop|garden|archive",
  "status": "backlog|in_progress|blocked|done",
  "priority": "low|medium|high|urgent",
  "due": "2026-02-11",
  "source": "memory/2025-01-27.md",
  "notes": "Additional context",
  "tags": ["tag1", "tag2"],
  "created": "2026-01-27"
}
```

## Roadmap

- [x] Kanban board UI
- [x] Room filtering
- [x] Drag-and-drop status changes
- [ ] Server-side persistence
- [ ] Auto-scan memory files for TODO/PROJECT markers
- [ ] Calendar integration
- [ ] Mobile PWA

## Integration with Clawdbot

Locus lives alongside your Clawdbot workspace. Future enhancements will auto-populate items by scanning `memory/*.md` files for markers like:

- `TODO:` → Creates backlog item
- `FOLLOW-UP:` → Creates item with due date
- `PROJECT:` → Creates project item

---

*"The art of memory is the art of attention."* — Samuel Johnson
