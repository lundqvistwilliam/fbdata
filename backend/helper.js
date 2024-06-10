export default function formatLeagueURL(league) {
  // Format the league URL to match the db name. Only top 5 leagues for now.
  switch (league) {
    case 'premierleague':
      league = 'Premier league'
      break;
    case 'laliga':
      league = 'La Liga'
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
