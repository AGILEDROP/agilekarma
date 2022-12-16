import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.hasTable('user').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('user', (table) => {
        table.string('user_id').notNullable();
        table.string('user_name');
        table.string('user_username');
        table.datetime('banned_until');
        table.primary(['user_id']);
      });
    }
    return knex.schema;
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('user');
}
