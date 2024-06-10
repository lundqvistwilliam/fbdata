import puppeteer from 'puppeteer';
import express from 'express'
import cors from 'cors';
import connection from '../backend/db.js'
import fs from 'fs/promises';
import formatLeagueURL from './helper.js';

const app = express();
const port = 3001;

app.use(cors());

app.get('/scrape/team', async (req, res) => {
  try {
    // Read club URLs from the JSON file
    const clubUrls = JSON.parse(await fs.readFile('../src/teams.json', 'utf-8'));

    if (clubUrls.length === 0) {
      console.log("no teams to scrape.")
      res.status(500).send('Error scraping data. Error: No teams added');
      return null;
    }

    for (const url of clubUrls) {
      console.log(`Scraping URL: ${url}...`);

      // Fetch data from the URL
      const { clubNameText, clubLogo } = await fetchClubData(url);
      console.log({ clubNameText, clubLogo });

      // Insert fetched data into the database
      if (clubNameText && clubLogo) {
        console.log(`Inserting ${clubNameText} data..`);
        await insertClubData(clubNameText, clubLogo);
      }
    }

    // Respond with a success message after all clubs are scraped
    console.log('ALL CLUBS SCRAPED AND DATA INSERTED!')
    res.send('All clubs scraped and data inserted');
  } catch (error) {
    console.error('Error scraping data:', error);
    res.status(500).send('Error scraping data');
  }
});

async function fetchClubData(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const [el] = await page.$$('xpath/.//*[@id="mainContent"]/header/div[1]/div/h2');
  const text = await el?.getProperty("textContent");
  const clubNameText = await text?.jsonValue();

  const [el2] = await page.$$('xpath/.//*[@id="mainContent"]/header/div[1]/img');
  const logo = await el2?.getProperty("src");
  const clubLogo = await logo?.jsonValue();

  await browser.close();

  return { clubNameText, clubLogo };
}

async function insertClubData(clubNameText, clubLogo) {
  const insertQuery = `
    INSERT INTO club (club_name, league, nation, logo)
    VALUES (?, ?, ?, ?)
  `;

  await connection.promise().query(insertQuery, [clubNameText, "Premier League", "England", clubLogo]);
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


app.get('/scrape/player', async (req, res) => {

  const url = 'https://www.premierleague.com/clubs/1/Arsenal/squad?se=578'

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

    // Remove every second element from the kitNumbers array
    const filteredKitNumbers = kitNumbers.filter((_, index) => index % 2 === 0);

    // Ensure both arrays have the same length
    if (firstNames.length !== lastNames.length || firstNames.length !== filteredKitNumbers.length) {
      console.error('First and last name counts do not match!');
      return [];
      /*
      return {
        first: firstNames.length,
        last: lastNames.length,
        numbers: kitNumbers.length
      }
      */
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

  console.log("content: ", content);


  await browser.close();
  res.send(content)

});

async function insertPlayerData(fullName, firstName, lastName, nation, position, image, club_id, kitNumber) {
  const insertQuery = `
    INSERT INTO club (club_name, league, nation, logo)
    VALUES (?, ?, ?, ?)
  `;

  await connection.promise().query(insertQuery, [clubNameText, "Premier League", "England", clubLogo]);
  console.log('Scraped data inserted into the club table');
}



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

