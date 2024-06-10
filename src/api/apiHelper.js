import axios from "axios";



export default async function getAllClubs() {
  try {
    const response = await axios.get('http://localhost:3001/clubs');
    return response.data;
  } catch (error) {
    console.error('Error fetching clubs:', error);
    throw error;
  }
}


