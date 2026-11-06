import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261106055603 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "broadcast" ("id" text not null, "title" text not null, "channels" jsonb not null default '["email"]', "status" text check ("status" in ('draft', 'scheduled', 'active', 'completed', 'archived')) not null default 'draft', "target_audience" text check ("target_audience" in ('all_subscribers', 'opted_in_customers', 'all_users')) not null default 'all_subscribers', "email_subject" text null, "email_preheader" text null, "email_content_html" text null, "popup_title" text null, "popup_body" text null, "popup_image_url" text null, "popup_coupon_code" text null, "popup_cta_text" text null, "popup_cta_link" text null, "popup_type" text check ("popup_type" in ('modal', 'banner', 'both')) not null default 'modal', "popup_frequency" text check ("popup_frequency" in ('once_per_visitor', 'once_per_session', 'always')) not null default 'once_per_visitor', "is_popup_active" boolean not null default false, "starts_at" timestamptz null, "ends_at" timestamptz null, "sent_at" timestamptz null, "recipients_count" integer not null default 0, "sent_count" integer not null default 0, "failed_count" integer not null default 0, "impressions_count" integer not null default 0, "clicks_count" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "broadcast_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_broadcast_deleted_at" ON "broadcast" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "broadcast" cascade;`);
  }

}
