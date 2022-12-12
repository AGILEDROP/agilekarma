import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.hasTable('score').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('score', (table) => {
        table.string('score_id').notNullable();
        table.datetime('timestamp').notNullable();
        table.string('to_user_id').notNullable();
        table.string('from_user_id').notNullable();
        table.string('channel_id').notNullable();
        table.text('description');
        table.primary(['score_id']);
      })
        .raw('CREATE INDEX fk_score_user_idx ON score (to_user_id ASC)')
        .raw('CREATE INDEX fk_score_user1_idx ON score (`from_user_id` ASC)')
        .raw('CREATE INDEX fk_score_channel1_idx ON score (channel_id ASC)')
        .alterTable('score', (table) => {
          table
            .foreign('to_user_id', 'fk_score_user')
            .references('user_id')
            .inTable('user')
            .onDelete('NO ACTION')
            .onUpdate('NO ACTION');
        })
        .alterTable('score', (table) => {
          table
            .foreign('from_user_id', 'fk_score_user1')
            .references('user_id')
            .inTable('user')
            .onDelete('NO ACTION')
            .onUpdate('NO ACTION');
        })
        .alterTable('score', (table) => {
          table
            .foreign('channel_id', 'fk_score_channel1')
            .references('channel_id')
            .inTable('channel')
            .onDelete('NO ACTION')
            .onUpdate('NO ACTION');
        });
    }
    return knex.schema;
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('score');
}
