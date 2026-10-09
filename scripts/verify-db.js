import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL || 'postgresql://app:app@localhost:5432/appdb')

async function main() {
    try {
        const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'attempts'
      ORDER BY ordinal_position;
    `
        console.log('Columns in attempts table:')
        columns.forEach(c => console.log(`- ${c.column_name} (${c.data_type})`))

        const indexes = await sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'attempts';
    `
        console.log('\nIndexes:')
        indexes.forEach(i => console.log(`- ${i.indexname}`))

    } catch (e) {
        console.error(e)
    } finally {
        await sql.end()
    }
}

main()
