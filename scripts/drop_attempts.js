
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL || 'postgresql://app:app@localhost:5432/appdb'
const sql = postgres(connectionString)

async function run() {
    console.log('Dropping attempts table...')
    await sql`DROP TABLE IF EXISTS attempts CASCADE`
    console.log('Done.')
    await sql.end()
    process.exit(0)
}

run().catch(err => {
    console.error(err)
    process.exit(1)
})
