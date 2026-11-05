import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261105180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "commission" drop constraint if exists "commission_status_check";`
    )
    this.addSql(
      `alter table if exists "commission"
        add column if not exists "deposit_paid_at" timestamptz null,
        add column if not exists "deposit_payment_reference" text null,
        add column if not exists "final_payment_requested_at" timestamptz null,
        add column if not exists "final_paid_at" timestamptz null,
        add column if not exists "final_payment_reference" text null;`
    )
    this.addSql(
      `alter table if exists "commission" add constraint "commission_status_check"
        check ("status" in ('new', 'in_discussion', 'quoted', 'accepted', 'awaiting_payment', 'in_production', 'awaiting_final_payment', 'paid', 'converted', 'rejected', 'cancelled'));`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "commission" drop constraint if exists "commission_status_check";`
    )
    this.addSql(
      `update "commission" set "status" = 'awaiting_payment'
        where "status" in ('in_production', 'awaiting_final_payment');`
    )
    this.addSql(
      `alter table if exists "commission"
        drop column if exists "deposit_paid_at",
        drop column if exists "deposit_payment_reference",
        drop column if exists "final_payment_requested_at",
        drop column if exists "final_paid_at",
        drop column if exists "final_payment_reference";`
    )
    this.addSql(
      `alter table if exists "commission" add constraint "commission_status_check"
        check ("status" in ('new', 'in_discussion', 'quoted', 'accepted', 'awaiting_payment', 'paid', 'converted', 'rejected', 'cancelled'));`
    )
  }
}
