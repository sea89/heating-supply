require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: { directory: './migrations' },
    seeds: { directory: './seeds' }
  }
};
