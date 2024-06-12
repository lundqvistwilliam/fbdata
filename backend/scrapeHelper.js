import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import connection from './db.js';

// Used in /scrape/club
export async function scrapeClubDataFromURL() {
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
}

export async function scrapePlayerDataFromJSONFile() {
  try {
    // Read club URLs from the JSON file
    const playersUrl = JSON.parse(await fs.readFile('./players.json', 'utf-8'));

    if (playersUrl.length === 0) {
      console.log("no players to scrape.")
      res.status(500).send('Error scraping data. Error: No players added');
      return null;
    }

    for (const url of playersUrl) {
      console.log(`Scraping URL for player: ${url}...`);

      // Fetch data from the URL
      const playerData = await scrapePlayerData(url);
      //console.log(playerData.full_name);


      // Insert fetched data into the database

      if (playerData && playerData?.full_name) {
        console.log(`Inserting ${playerData.full_name}..`);
        await insertPlayerData(playerData);
      }
    }

    // Respond with a success message after all clubs are scraped
    console.log('ALL CLUBS SCRAPED AND DATA INSERTED!')
    console.log("------------------ END ---------------------------------")
    //res.send('All clubs scraped and data inserted');
  } catch (error) {
    console.error('Error scraping data:', error);
    //res.status(500).send('Error scraping data');
  }
}

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

export async function scrapePlayerData(url) {
  // USED FOR LALIGA EA SPORTS (2024-06-12)
  const CURRENT_CLUB_ID = 24
  const SEASON = '2023/2024'
  // DONT FORGET UPDATE TEAM ID
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // full_name, first_name, last_name, nation, position, image_url, club_id, kit_number, season


  const [el] = await page.$$('xpath/.//*[@id="__next"]/div[8]/div[1]/div[1]/div/div[2]/div[2]/div[1]/h1');
  const text = await el?.getProperty("textContent");
  const playerNameText = await text?.jsonValue();

  const [nationEl] = await page.$$('xpath/.//*[@id="__next"]/div[8]/div[1]/div[1]/div/div[2]/div[2]/div[3]/p')
  const nation = await nationEl?.getProperty("textContent");
  const nationText = await nation?.jsonValue();

  const [positionEl] = await page.$$('xpath/.//*[@id="__next"]/div[8]/div[1]/div[3]/div/div[2]/p[2]')
  const position = await positionEl?.getProperty("textContent");
  const positionText = await position?.jsonValue();

  const [imageEl] = await page.$$('xpath/.//*[@id="__next"]/div[8]/div[1]/div[3]/div/div[1]/div/img');
  const playerImage = await imageEl?.getProperty("src");
  const playerImageUrl = await playerImage?.jsonValue();

  const [numberEl] = await page.$$('xpath/.//*[@id="__next"]/div[8]/div[1]/div[1]/div/div[2]/div[1]/div/p');
  const playerNumber = await numberEl?.getProperty("textContent");
  const playerNumberText = await playerNumber?.jsonValue();

  if (positionText === "Coach" || positionText === 'Assistant coach') {
    await browser.close();
    return null;
  }


  const [firstName, ...lastNameArray] = playerNameText.split(' ');
  const lastName = lastNameArray.join(' ');

  const playerData = {
    full_name: playerNameText || null,
    first_name: firstName || null,
    last_name: lastName || null,
    nation: nationText || null,
    position: positionText || null,
    image_url: playerImageUrl || null,
    kit_number: playerNumberText || null,
    // other player data like nation, position, image_url, club_id, kit_number
    club_id: CURRENT_CLUB_ID,
    season: SEASON
  };
  console.log("player: ", playerData)
  await browser.close();
  return playerData;
  res.send(content)


}



// ----------------------------------------------------------- //
export async function insertClubData(connection, clubNameText, clubLogo) {
  const insertQuery = `
    INSERT INTO club (club_name, league, nation, logo, season)
    VALUES (?, ?, ?, ?, ?)
  `;
  console.log("Inserting: ", clubNameText)
  await connection.promise().query(insertQuery, [clubNameText, "LALIGA EA SPORTS", "Spain", clubLogo, "2023/2024"]);
  console.log('Scraped data inserted into the club table');
}


async function insertPlayerData(playerData) {

  const { full_name, first_name, last_name, nation, position, image_url, club_id, kit_number, season } = playerData

  const insertQuery = `
    INSERT INTO player (full_name, first_name, last_name, nation, position, image, club_id, kit_number, season)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await connection.promise().query(insertQuery, [full_name, first_name, last_name, nation, position, image_url, club_id, kit_number, season]);
  console.log(`Player ${full_name} inserted into the player table`);
}
