import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261026102431 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "feedback" ("id" text not null, "type" text check ("type" in ('feedback', 'bug')) not null, "message" text not null, "email" text null, "page_url" text null, "image_url" text null, "status" text check ("status" in ('new', 'reviewed', 'resolved')) not null default 'new', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "feedback_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feedback_deleted_at" ON "feedback" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "feedback" cascade;`);
  }

}
