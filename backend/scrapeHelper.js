
// Used in /scrape/club
export async function scrapePremierLeaueClubDataFromURL() {
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
