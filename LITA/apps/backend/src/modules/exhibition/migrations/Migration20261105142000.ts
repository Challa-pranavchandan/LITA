import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261105142000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "exhibition" ("id" text not null, "title" text not null, "description" text not null, "details" text null, "location" text null, "start_date" text not null, "end_date" text not null, "image_url" text null, "image_alt" text null, "is_published" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "exhibition_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_exhibition_deleted_at" ON "exhibition" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "exhibition" cascade;`)
  }
}
