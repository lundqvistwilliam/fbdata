import puppeteer from 'puppeteer';
import express from 'express'
import cors from 'cors';
import connection from '../backend/db.js'
import fs from 'fs/promises';
import { formatLeagueURL } from './helper.js';
import axios from 'axios';

const app = express();
const port = 3001;

app.use(cors());

app.get('/scrape/team', async (req, res) => {
  try {
    const url = 'https://www.laliga.com/en-GB/laliga-easports/clubs'
    console.log(`Scraping URL: ${url}...`);

    // Fetch data from the URL
    const clubs = await fetchClubDataForLaLiga(url);
    console.log("clubs2", clubs);
    for (const club of clubs) {
      console.log("Sending ", club + "...")
      await insertClubData(club.club_name, club.image_url);
    }
    //await insertClubData(clubNameText, clubLogo);

    // Insert fetched data into the database
    /*
     if (clubNameText && clubLogo) {
       console.log(`Inserting ${clubNameText} data..`);
       await insertClubData(clubNameText, clubLogo);
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

async function fetchClubDataForLaLiga(url) {
  // LEAGUE NAME : LALIGA EA SPORTS
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  /*

  const [el] = await page.$$('xpath/.//*[@id="mainContent"]/header/div[1]/div/h2');
  const text = await el?.getProperty("textContent");
  const clubNameText = await text?.jsonValue();

  const [el2] = await page.$$('xpath/.//*[@id="mainContent"]/header/div[1]/img');
  const logo = await el2?.getProperty("src");
  const clubLogo = await logo?.jsonValue();
  */
  let clubs = await page.evaluate(() => {
    let clubNameElements1 = [...document.querySelectorAll('.styled__TextStyled-sc-1mby3k1-0.eaZimx')];
    let clubNameElements2 = [...document.querySelectorAll('.styled__TextStyled-sc-1mby3k1-0.kYCCIm')]
    let clubLogoElements = [...document.querySelectorAll('.styled__ImageStyled-sc-17v9b6o-0.coeclD')];

    let clubNameElements = [...clubNameElements1, ...clubNameElements2];

    return clubNameElements.map((clubNameElement, index) => {
      let club_name = clubNameElement.textContent.trim();
      let image_url = clubLogoElements[index]?.getAttribute('src') || null;
      if (!image_url) {
        console.log(`No logo found for club: ${club_name}`);
      }
      return { club_name, image_url };
    });
  });

  await browser.close();
  return clubs;
}

async function insertClubData(clubNameText, clubLogo) {
  const insertQuery = `
    INSERT INTO club (club_name, league, nation, logo, season)
    VALUES (?, ?, ?, ?, ?)
  `;
  console.log("Inserting: ", clubNameText)
  await connection.promise().query(insertQuery, [clubNameText, "LALIGA EA SPORTS", "Spain", clubLogo, "2023/2024"]);
  console.log('Scraped data inserted into the club table');
}

app.get('/clubs', (req, res) => {
  connection.query('SELECT * FROM club', (error, results) => {
    if (error) {
      res.status(500).send('Error fetching clubs');
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

app.get('/clubs/:league', (req, res) => {
  const league = req.params.league
  const validLeagues = ['premierleague', 'laliga', 'bundesliga', 'seriea', 'ligue1'];

  if (!validLeagues.includes(league)) {
    return res.status(400).send('Invalid league');
  }

  console.log(league)
  let formattedLeague = formatLeagueURL(league)

  connection.query('SELECT * FROM club WHERE league = ?', [formattedLeague], (error, results) => {
    if (error) {
      res.status(500).send('Error fetching clubs');
      return;
    }
    console.log("res", results)
    res.json(results);
  });
});

async function checkIfPlayerExists(fullName, club_id) {
  const query = `
    SELECT COUNT(*) AS count
    FROM player
    WHERE full_name = ? AND club_id = ?
  `;
  const [rows] = await connection.promise().query(query, [fullName, club_id]);
  return rows[0].count > 0;
}


app.get('/scrape/player', async (req, res) => {

  // Player data taken from https://www.premierleague.com/clubs?se=578 - "Squad" section in each club
  // DONT FORGET UPDATE TEAM ID
  const url = 'https://www.premierleague.com/clubs/38/Wolverhampton-Wanderers/squad?se=578'

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  let content = await page.evaluate(() => {
    let firstNames = [...document.querySelectorAll('.stats-card__player-first')];
    let lastNames = [...document.querySelectorAll('.stats-card__player-last')];
    let kitNumbers = [...document.querySelectorAll('.stats-card__squad-number')];
    let playerNation = [...document.querySelectorAll('.stats-card__player-country')];
    let playerImages = [...document.querySelectorAll('.stats-card__player-image img')];
    let playerPosition = [...document.querySelectorAll('.stats-card__player-position')];

    // Remove every second element from the kitNumbers array due to duplicates
    const filteredKitNumbers = kitNumbers.filter((_, index) => index % 2 === 0);

    // Ensure both arrays have the same length
    if (firstNames.length !== lastNames.length || firstNames.length !== filteredKitNumbers.length) {
      console.error('First and last name counts do not match!');
      return [];
    }

    // Combine first and last names
    return firstNames.map((firstName, index) => {
      let first = firstName.textContent.trim();
      let last = lastNames[index].textContent.trim();
      let kitNumber = filteredKitNumbers[index].textContent;
      let nation = playerNation[index].textContent;
      let imageUrl = playerImages[index]?.getAttribute('src');
      let position = playerPosition[index].textContent;

      return {
        full_name: `${first} ${last}`,
        first_name: first || null,
        last_name: last,
        kit_number: kitNumber,
        nation: nation,
        position: position,
        image_url: imageUrl || null,
      };
    });
  });

  const CURRENT_CLUB_ID = 20
  const SEASON = '2023/2024'


  for (const player of content) {
    if (player.full_name && player.last_name && player.kit_number) {
      const { full_name, first_name, last_name, nation, position, image_url, club_id, kit_number } = player
      console.log(`Inserting ${full_name} data..`);
      // Check if player already exists
      const playerExists = await checkIfPlayerExists(full_name, CURRENT_CLUB_ID); // Change club_id if needed
      if (!playerExists) {
        // Player doesn't exist, insert them
        await insertPlayerData(full_name, first_name, last_name, nation, position, image_url, CURRENT_CLUB_ID, kit_number, SEASON); // Change club_id if needed
      } else {
        console.log(`Player ${full_name} already exists in the database. Not adding.`);
      }
    }
  }
  console.log('All player data has been processed and inserted.');


  await browser.close();
  res.send(content)

});

async function insertPlayerData(fullName, firstName, lastName, nation, position, image, club_id, kitNumber, season) {
  const insertQuery = `
    INSERT INTO player (full_name, first_name, last_name, nation, position, image, club_id, kit_number, season)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  console.log(fullName, firstName, lastName, nation, position, image, club_id, kitNumber, season)


  await connection.promise().query(insertQuery, [fullName, firstName, lastName, nation, position, image, club_id, kitNumber, season]);
  console.log(`Player ${fullName} inserted into the club table`);
}

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

