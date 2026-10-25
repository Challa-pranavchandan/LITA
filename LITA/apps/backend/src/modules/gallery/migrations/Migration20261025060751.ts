import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261025060751 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "gallery_item" ("id" text not null, "file_id" text null, "image_url" text not null, "alt" text null, "caption" text null, "width" integer null, "height" integer null, "position" integer not null default 0, "col_span" integer not null default 1, "row_span" integer not null default 1, "is_published" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "gallery_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gallery_item_deleted_at" ON "gallery_item" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "gallery_item" cascade;`);
  }

}
