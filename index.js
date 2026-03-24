import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE
});

app.use(express.json());

app.get('/', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM athletes");
    res.json(result.rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post('/athletes', async (req, res) => {
  const { name, sport, age } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO athletes (name, sport, age) VALUES ($1, $2, $3) RETURNING *',
      [name,sport,age]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.put('/athletes/:id', async (req, res) => {
  const { id } = req.params; //get id to update
  const { name, sport, age } = req.body; //get new details from request body
  try {
    const result = await pool.query(
      'UPDATE athletes SET name = $1, sport = $2, age = $3 WHERE id = $4 RETURNING *',
      [name, sport, age, id] //replace placeholders with new values and id
    );
    if(result.rows.length === 0) {
      return res.status(404).send('Athlete not found');
    }
    res.json(result.rows[0]); //otherwise send back updated athlete details
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.delete('/athletes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM athletes WHERE id = $1 RETURNING *',
      [id]);
    if(result.rows.length === 0) {
      return res.status(404).send('Athlete not found');
    }
    res.send('Athlete deleted successfully');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});