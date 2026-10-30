import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261025042417 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "journal_post" drop constraint if exists "journal_post_slug_unique";`);
    this.addSql(`create table if not exists "journal_post" ("id" text not null, "title" text not null, "slug" text not null, "excerpt" text null, "content" text not null, "cover_image_url" text null, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "published_at" timestamptz null, "tags" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "journal_post_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_journal_post_slug_unique" ON "journal_post" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_journal_post_deleted_at" ON "journal_post" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "journal_post" cascade;`);
  }

}
