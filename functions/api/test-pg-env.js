exports.main = async (event, context) => {
  console.log('=== PG Environment Variables ===');
  console.log('PG_HOST:', process.env.PG_HOST);
  console.log('PG_PORT:', process.env.PG_PORT);
  console.log('PG_DATABASE:', process.env.PG_DATABASE);
  console.log('PG_USER:', process.env.PG_USER);
  console.log('PG_PASSWORD:', process.env.PG_PASSWORD ? '***' : undefined);
  console.log('POSTGRESQL_HOST:', process.env.POSTGRESQL_HOST);
  console.log('POSTGRESQL_PORT:', process.env.POSTGRESQL_PORT);
  console.log('POSTGRESQL_DATABASE:', process.env.POSTGRESQL_DATABASE);
  console.log('POSTGRESQL_USERNAME:', process.env.POSTGRESQL_USERNAME);
  console.log('POSTGRESQL_PASSWORD:', process.env.POSTGRESQL_PASSWORD ? '***' : undefined);
  console.log('DB_ADAPTER:', process.env.DB_ADAPTER);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      PG_HOST: process.env.PG_HOST,
      PG_PORT: process.env.PG_PORT,
      PG_DATABASE: process.env.PG_DATABASE,
      PG_USER: process.env.PG_USER,
      POSTGRESQL_HOST: process.env.POSTGRESQL_HOST,
      POSTGRESQL_PORT: process.env.POSTGRESQL_PORT,
      POSTGRESQL_DATABASE: process.env.POSTGRESQL_DATABASE,
      POSTGRESQL_USERNAME: process.env.POSTGRESQL_USERNAME,
      DB_ADAPTER: process.env.DB_ADAPTER,
    }),
  };
};