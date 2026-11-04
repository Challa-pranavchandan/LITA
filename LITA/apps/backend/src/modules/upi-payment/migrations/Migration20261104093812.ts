import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261104093812 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "upi_payment" drop constraint if exists "upi_payment_utr_unique";`);
    this.addSql(`alter table if exists "upi_payment" drop constraint if exists "upi_payment_reference_code_unique";`);
    this.addSql(`create table if not exists "upi_payment" ("id" text not null, "reference_code" text not null, "order_id" text null, "cart_id" text null, "payment_session_id" text null, "customer_id" text null, "email" text not null, "amount" integer not null, "currency_code" text not null default 'inr', "status" text check ("status" in ('awaiting_proof', 'submitted', 'verified', 'rejected', 'expired')) not null default 'awaiting_proof', "utr" text null, "payer_vpa" text null, "screenshot_key" text null, "submitted_at" timestamptz null, "verified_at" timestamptz null, "rejected_at" timestamptz null, "verified_by" text null, "reject_reason" text null, "expires_at" timestamptz not null, "attempts" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "upi_payment_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_upi_payment_reference_code_unique" ON "upi_payment" ("reference_code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_upi_payment_order_id" ON "upi_payment" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_upi_payment_cart_id" ON "upi_payment" ("cart_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_upi_payment_customer_id" ON "upi_payment" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_upi_payment_utr_unique" ON "upi_payment" ("utr") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_upi_payment_deleted_at" ON "upi_payment" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "upi_payment" cascade;`);
  }

}
