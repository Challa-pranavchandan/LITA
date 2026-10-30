import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261025154731 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "commission" ("id" text not null, "customer_id" text not null, "title" text not null, "idea" text not null, "requirements" text null, "medium" text null, "size" text null, "budget" integer null, "deadline" timestamptz null, "status" text check ("status" in ('new', 'in_discussion', 'quoted', 'accepted', 'converted', 'rejected', 'cancelled')) not null default 'new', "quoted_price" integer null, "currency_code" text not null default 'inr', "admin_notes" text null, "order_id" text null, "images" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "commission_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_commission_customer_id" ON "commission" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_commission_deleted_at" ON "commission" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "commission_message" ("id" text not null, "commission_id" text not null, "sender" text check ("sender" in ('client', 'admin')) not null, "body" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "commission_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_commission_message_commission_id" ON "commission_message" ("commission_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_commission_message_deleted_at" ON "commission_message" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "commission" cascade;`);

    this.addSql(`drop table if exists "commission_message" cascade;`);
  }

}
