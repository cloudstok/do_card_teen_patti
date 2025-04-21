import { createPool } from "mysql2/promise";
import { createLogger } from "../utilities/logger";
const logger = createLogger("DB", "plain")

export const pool = createPool({
    port: parseInt(process.env.DB_PORT ?? "3306"),
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export const createTables = async () => {
    try {
        (await pool.getConnection())
            ? logger.info("DB connection successful")
            : logger.info("DB connection unsuccessful");
    } catch (error) {
        console.error("Error creating tables", error);
    }
};
