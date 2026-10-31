import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261031035234 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "newsletter_subscriber" drop constraint if exists "newsletter_subscriber_email_unique";`);
    this.addSql(`create table if not exists "inquiry" ("id" text not null, "kind" text check ("kind" in ('contact', 'artwork', 'commission_general', 'trade_general')) not null, "name" text not null, "email" text not null, "phone" text null, "artwork_handle" text null, "budget" text null, "message" text not null, "status" text check ("status" in ('new', 'replied', 'archived')) not null default 'new', "source_url" text null, "ip_hash" text null, "user_agent" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "inquiry_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_inquiry_deleted_at" ON "inquiry" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "newsletter_subscriber" ("id" text not null, "email" text not null, "status" text check ("status" in ('pending', 'confirmed', 'unsubscribed')) not null default 'pending', "confirm_token_hash" text null, "confirmed_at" timestamptz null, "unsubscribed_at" timestamptz null, "source" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "newsletter_subscriber_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_email_unique" ON "newsletter_subscriber" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_deleted_at" ON "newsletter_subscriber" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "inquiry" cascade;`);

    this.addSql(`drop table if exists "newsletter_subscriber" cascade;`);
  }

}
