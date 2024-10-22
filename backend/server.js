import express from 'express';
import cors from 'cors';
import connection from '../backend/db.js';
import { formatLeagueURL, getClubsByLeagueName } from './helper.js';
import axios from 'axios';

const app = express();
const port = 3001;

app.use(cors());
// cd backend - node serverjs


app.get('/clubs', (req, res) => {
  connection.query('SELECT * FROM club', (error, results) => {
    if (error) {
      res.status(500).send('Error fetching clubs');
      return;
    }
    res.json(results);
  });
});

app.get('/leagues/:leagueName/players', (req, res) => {
  const leagueName = req.params.leagueName;
  const validLeagues = ['premierleague', 'laliga', 'bundesliga', 'seriea', 'ligue1'];

  if (!validLeagues.includes(leagueName)) {
    return res.status(400).send('Invalid league');
  }
  let formattedLeague = formatLeagueURL(leagueName);

  let query = 'SELECT p.*, c.club_name FROM player p INNER JOIN club c ON p.club_id = c.id WHERE c.league = ?';
  let params = [formattedLeague];

  if (leagueName === 'premierleague') {
    query += ' AND p.image != ?';
    params.push('https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png');
  }

  connection.query(query, params, (error, results) => {
    if (error) {
      res.status(500).send('Error fetching players');
      return;
    }
    res.json(results);
  });
});

app.get('/api/leagues/:leagueName/players', (req, res) => {
  let formattedLeague = formatLeagueURL(req.params.leagueName);
  const leagueName = formattedLeague;

  const sqlQuery = `
    SELECT 
      p.id, 
      p.full_name, 
      p.first_name, 
      p.last_name, 
      p.nationality, 
      p.position,
      h.team_name, 
      h.season, 
      h.competition
    FROM players_info p
    JOIN player_team_history h ON p.id = h.player_id
    WHERE EXISTS (
      SELECT 1 
      FROM player_team_history h2 
      WHERE h2.player_id = p.id 
      AND h2.competition = ? 
      AND h2.season = '2024-2025'
    )
    ORDER BY p.id, h.season DESC;
  `;

  connection.query(sqlQuery, [leagueName], (err, results) => {
    if (err) {
      // Handle errors
      console.error('Error executing query', err);
      res.status(500).send('Server error');
    } else {
      const players = {};

      results.forEach(row => {
        if (!players[row.id]) {
          players[row.id] = {
            id: row.id,
            full_name: row.full_name,
            first_name: row.first_name,
            last_name: row.last_name,
            nationality: row.nationality,
            position: row.position,
            team_history: []
          };
        }

        players[row.id].team_history.push({
          team: row.team_name,
          season: row.season,
          competition: row.competition
        });
      });

      const playersArray = Object.values(players);

      res.json(playersArray);
    }
  });
});

// TODO : With different leagues, now only PL
app.get('/api/random/players', (req, res) => {
  /*
  const query = `
  SELECT * 
  FROM players_info 
  ORDER BY RAND() 
  LIMIT 42;`;
  */

  const query = `SELECT 
    p.id, 
    p.full_name, 
    p.first_name, 
    p.last_name, 
    p.nationality, 
    p.position,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'team', h.team_name,
            'competition', h.competition,
            'season', h.season
        )
    ) AS team_history
FROM (
    SELECT 
        id, 
        full_name, 
        first_name, 
        last_name, 
        nationality, 
        position
    FROM players_info 
    ORDER BY RAND() 
    LIMIT 42
) AS p
JOIN player_team_history h ON p.id = h.player_id
WHERE EXISTS (
    SELECT 1 
    FROM player_team_history h2 
    WHERE h2.player_id = p.id 
    AND h2.competition = 'Premier League'
    AND h2.season = '2024-2025'
)
GROUP BY p.id
ORDER BY MAX(h.season) DESC;  -- Order by the latest season

`;
  connection.query(query, (error, results) => {
    if (error) {
      console.log("Error", error);
      res.status(500).send('Error fetching player');
      return;
    }
    res.json(results);
  });
});




app.get('/players', (req, res) => {
  connection.query('SELECT * FROM player', (error, results) => {
    if (error) {
      res.status(500).send('Error fetching player');
      return;
    }
    res.json(results);
  });
});


app.get('/leagues/:leagueName/clubs', (req, res) => {
  const league = req.params.leagueName;
  const validLeagues = ['premierleague', 'laliga', 'bundesliga', 'seriea', 'ligue1'];

  if (!validLeagues.includes(league)) {
    return res.status(400).send('Invalid league');
  }
  let formattedLeague = formatLeagueURL(league);
  getClubsByLeagueName(connection, formattedLeague, res);
});


/***********  REMOVE ////////////////////////
/*
app.get('/scrape/player', async (req, res) => {
  await scrapePlayerDataFromJSONFile();
});
*/

// Function to update the season for a player
async function updatePlayerSeason(playerId, season) {
  const updateQuery = `
    UPDATE player
    SET season = ?
    WHERE id = ?
  `;

  try {
    await connection.promise().query(updateQuery, [season, playerId]);
    console.log(`Player ID ${playerId} updated to season ${season}`);
  } catch (error) {
    console.error(`Error updating player ID ${playerId}:`, error);
  }
}

// Fetch players and update their season
async function fetchAndUpdatePlayers() {
  try {
    // Fetch all players
    const response = await axios.get('http://localhost:3001/players');
    const players = response.data;

    if (!players) return;

    // Loop through each player and update the season
    for (const player of players) {
      await updatePlayerSeason(player.id, '2023/2024');
    }

    console.log('All players updated successfully');
  } catch (error) {
    console.error('Error fetching or updating players:', error);
  }
  console.log("end");
}





app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

