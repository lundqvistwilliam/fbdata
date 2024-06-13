import puppeteer from 'puppeteer';
import express from 'express'
import cors from 'cors';
import connection from '../backend/db.js'
import { formatLeagueURL, getClubsByLeagueName } from './helper.js';
import { insertClubData, scrapePlayerDataFromJSONFile, fetchClubData, scrapePlayerDataForBundesliga } from './scrapeHelper.js';
import axios from 'axios';

const app = express();
const port = 3001;

app.use(cors());

app.get('/scrape/team', async (req, res) => {
  try {
    const url = 'https://www.legaseriea.it/en'
    console.log(`Scraping URL: ${url}...`);

    // Fetch data from the URL
    const clubs = await fetchClubData(url);
    console.log("get", clubs)

    /*
    for (const club of clubs) {
      console.log("Sending ", club + "...")
      await insertClubData(connection, club.club_name, club.image_url);
    }
    */

    // Respond with a success message after all clubs are scraped
    console.log('ALL CLUBS SCRAPED AND DATA INSERTED!')
    res.send('All clubs scraped and data inserted');
  } catch (error) {
    console.error('Error scraping data:', error);
    res.status(500).send('Error scraping data');
  }

});




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
  let formattedLeague = formatLeagueURL(leagueName)

  connection.query('SELECT p.* FROM player p INNER JOIN club c ON p.club_id = c.id WHERE c.league = ?', [formattedLeague], (error, results) => {
    if (error) {
      res.status(500).send('Error fetching players');
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
  const league = req.params.leagueName
  const validLeagues = ['premierleague', 'laliga', 'bundesliga', 'seriea', 'ligue1'];

  if (!validLeagues.includes(league)) {
    return res.status(400).send('Invalid league');
  }
  let formattedLeague = formatLeagueURL(league)
  getClubsByLeagueName(connection, formattedLeague, res)
})



app.get('/scrape/player', async (req, res) => {
  const url = 'https://www.bundesliga.com/en/bundesliga/clubs/fc-bayern-muenchen'
  //await scrapePlayerDataForBundesliga(url);
  await scrapePlayerDataFromJSONFile();
});


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
  console.log("end")
}





app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

