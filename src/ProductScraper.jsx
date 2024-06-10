import React, { useState, useEffect } from 'react';
import getAllClubs from './api/apiHelper';

// Test to see it working

const ProductScraper = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClubs = async () => {
    try {
      const response = await getAllClubs();
      console.log("response?", response)
      setClubs(response);
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  if (loading) {
    return <h1>Loading...</h1>;
  }

  if (error) {
    return <h1>Error: {error}</h1>;
  }

  const renderClubs = () => {
    if (!clubs || clubs.length === 0) {
      return null;
    }

    return clubs.map((club) => {
      return (
        <div key={club.id}>
          <img src={club.logo} alt={`${club.club_name} logo`} />
          <h2>Club name: {club.club_name}</h2>
          <h2>League: {club.league}</h2>
        </div>
      )
    })
  }

  return (
    <div>
      <h1>Club Information</h1>
      {renderClubs()}
    </div>
  );
};

export default ProductScraper;

