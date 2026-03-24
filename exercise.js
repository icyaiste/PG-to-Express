import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import { z } from 'zod';

const PORT = 3000;
dotenv.config();
const app = express();
const { Pool } = pg;

const envSchema = z.object({
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_DATABASE: z.string()
});

const validatedEnv = envSchema.safeParse(process.env);
if(!validatedEnv.success) {
  console.error("Invalid environment variables:",
    z.treeifyError(validatedEnv.error));
  process.exit(1);
}

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE } = validatedEnv.data;

const pool = new Pool({
  user: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: DB_PORT,
  database: DB_DATABASE
});

app.use(express.json());

const playerSchema = z.object({
  name: z.string(),
  join_date: z.string().transform((str) => new Date(str))
});

app.post('/players', async (req, res) => {
  const validatedPlayer = playerSchema.safeParse(req.body);
  if(!validatedPlayer.success) {
    return res.status(400).json({ errors: validatedPlayer.error });
  }
  console.log(validatedPlayer.data);
    
  const { name, join_date } = validatedPlayer.data;
  try {
    const result = await pool.query(`
            INSERT INTO players (name, join_date)
            VALUES ($1, $2)
            RETURNING *
        `, [name, join_date]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/players-scores', async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT
                players.name AS player_name,
                games.title AS game_title,
                scores.score
            FROM scores
            JOIN players ON scores.player_id = players.id
            JOIN games ON scores.game_id = games.id
        `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/top-players', async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT
                players.name AS player_name,
                SUM(scores.score) AS total_score
            FROM scores
            JOIN players ON scores.player_id = players.id
            GROUP BY players.name
            ORDER BY total_score DESC
            LIMIT 3
        `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/inactive-players', async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT
                players.name AS player_name
            FROM players
            LEFT JOIN scores ON players.id = scores.player_id
            WHERE scores.player_id IS NULL
        `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/popular-games', async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT games.title AS game_title,
            COUNT(scores.id) AS play_count
            FROM games
            JOIN scores ON games.id = scores.game_id
            GROUP BY games.title
            ORDER BY play_count DESC
            `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/recent-players', async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT name AS player_name, join_date
            FROM players
            ORDER BY join_date DESC
        `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/favorite-games', async (req, res) => {
  try {
    const result = await pool.query(`
            WITH game_counts AS (
                SELECT
                    players.id AS player_id,
                    players.name AS player_name,
                    games.id AS game_id,
                    games.title AS game_title,
                    COUNT(scores.id) AS play_count
                FROM scores
                JOIN players ON scores.player_id = players.id
                JOIN games ON scores.game_id = games.id
                GROUP BY players.id, players.name, games.id, games.title
            ),
            ranked_games AS (
                SELECT
                    player_name,
                    game_title,
                    play_count,
                    ROW_NUMBER() OVER (
                        PARTITION BY player_id
                        ORDER BY play_count DESC, game_id ASC
                    ) AS rank
                FROM game_counts
            )
            SELECT
                player_name,
                game_title,
                play_count
            FROM ranked_games
            WHERE rank = 1
            ORDER BY player_name
        `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});