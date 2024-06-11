export function formatLeagueURL(league) {
  // Format the league URL to match the db name. Only top 5 leagues for now.
  switch (league) {
    case 'premierleague':
      league = 'Premier league'
      break;
    case 'laliga':
      league = 'LALIGA EA SPORTS'
      break;
    case 'bundesliga':
      league = 'Bundesliga';
      break;
    case 'seriea':
      league = 'Serie A';
      break;
    case 'ligue1':
      league = 'Ligue 1';
      break;
    default:
      return null;
  }
  return league;
}

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
