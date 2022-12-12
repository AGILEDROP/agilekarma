import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.hasTable('channel').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('channel', (table) => {
        table.string('channel_id');
        table.string('channel_name');
        table.primary(['channel_id']);
      });
    }
    return knex.schema;
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('channel');
}
