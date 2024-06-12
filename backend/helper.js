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


export async function checkIfPlayerExists(connection, fullName, club_id) {
  const query = `
    SELECT COUNT(*) AS count
    FROM player
    WHERE full_name = ? AND club_id = ?
  `;
  const [rows] = await connection.promise().query(query, [fullName, club_id]);
  return rows[0].count > 0;
}



export function getClubsByLeagueName(connection, formattedLeague, res) {
  connection.query('SELECT * FROM club WHERE league = ?', [formattedLeague], (error, results) => {
    if (error) {
      res.status(500).send('Error fetching clubs');
      return;
    }
    res.json(results);
  });
}

