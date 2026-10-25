import { loadEnv } from "@medusajs/framework/utils"
import { Client } from "pg"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const posts = [
  {
    id: "jp_01JNV01DANCOVERT",
    title: "Inside the Studio: Dan Covert on Sculptural Form and Tactile Materials",
    slug: "inside-the-studio-dan-covert",
    excerpt: "A look into the process, patience, and carved silhouettes that define Dan Covert's abstract sculptures.",
    cover_image_url: "/about/artist-dan-covert.jpg",
    status: "published",
    published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tags: JSON.stringify(["Studio Visit", "Sculpture", "Artist Profile"]),
    content: `# Inside the Studio with Dan Covert

In his sunlit studio, artist Dan Covert moves deliberately among rows of carved walnut, blackened oak, and tactile ceramic forms. Every contour is intentional—an exploration of weight, balance, and quiet emotion.

> "Sculpture forces you to slow down. Unlike two-dimensional work, it exists in real space, catching shadow and light from every angle."

## The Evolution of Form

Over the past five years, Covert has transitioned from geometric graphic abstractions into fluid, organic three-dimensional forms. Working primarily with natural hardwoods and stonewares, his pieces celebrate the subtle imperfections of the grain and the marks left by the carver's gouge.

### Materials and Method

- **Hand-carved Hardwoods:** Walnut, white oak, and ebonized ash sourced sustainably from regional mills.
- **Textural Contrast:** Combining matte chiselled planes with satin-smooth sanded curves.
- **Architectural Dialogue:** Works scaled specifically for living environments—from mantelpiece objects to monumental pedestal statements.

Visitors to the gallery can view select sculptures from this series on view through next month.`,
  },
  {
    id: "jp_02JNV02ADVISORY",
    title: "The Art of Curating: How Advisors Transform Living Spaces",
    slug: "the-art-of-curating-living-spaces",
    excerpt: "Tips from our art advisory team on building a personal collection that harmonizes with your home's architecture.",
    cover_image_url: "/about/advisor-white-gloves.jpg",
    status: "published",
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: JSON.stringify(["Advisory", "Collecting", "Interior Design"]),
    content: `# The Art of Curating Living Spaces

Selecting artwork for your home is rarely just about matching a color palette. True curation is about atmosphere, scale, and emotional resonance.

> "A great artwork doesn't blend into the background—it sparks conversation and anchors the room."

## Three Guiding Principles

1. **Scale Before Subject:** Always evaluate the sightlines and wall dimensions first. An oversized piece in an intimate nook can feel transformative rather than overwhelming.
2. **Mix Mediums:** Pair tactile oil canvases with clean limited-edition prints and sculptural objects to create visual depth.
3. **Trust Your Intuition:** Trends come and go. The works you live with daily should bring a quiet sense of delight every time you pass them.

Learn more about our complimentary Art Advisory service or book a private consultation with our team.`,
  },
]

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  for (const p of posts) {
    await client.query(
      `INSERT INTO journal_post (id, title, slug, excerpt, content, cover_image_url, status, published_at, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (slug) WHERE deleted_at IS NULL DO UPDATE
       SET title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
           cover_image_url = EXCLUDED.cover_image_url, status = EXCLUDED.status,
           published_at = EXCLUDED.published_at, tags = EXCLUDED.tags, updated_at = NOW()`,
      [p.id, p.title, p.slug, p.excerpt, p.content, p.cover_image_url, p.status, p.published_at, p.tags]
    )
    console.log(`Seeded post: ${p.title} (/${p.slug})`)
  }

  await client.end()
  console.log("Journal seeding completed successfully!")
}

run().catch(console.error)
