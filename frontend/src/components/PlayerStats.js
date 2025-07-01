import React, { useState, useEffect } from 'react';

const PlayerStats = () => {
  const [player, setPlayer] = useState('');
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [leadCombo, setLeadCombo] = useState('');
  const [comboStats, setComboStats] = useState(null); // Kann jetzt { win_rate, games_played } sein
  const [comboLoading, setComboLoading] = useState(false);
 
   const fetchStats = async () => {
    if (!player.trim()) return;
    setLoading(true);
    
    try {
      const endpoints = [
        `player/${player}/wr`,
        `player/${player}/bo3wr`,
        `player/${player}/bo3gameswr`,
        `player/${player}/leadwr`,
        `player/${player}/pokemonwr`,
        `player/${player}/tarawr`
      ].map(endpoint => `https://opulent-space-train-r4gvj76wqxjhxr77-3001.app.github.dev/api/${endpoint}`);
      
      const responses = await Promise.all(endpoints.map(url => 
        fetch(url).then(res => res.json())
      ));
      
      setStats({
        wr: responses[0].win_rate,
        games_played: responses[0].games_played, // Annahme: API gibt games_played zurück
        bo3wr: responses[1].bo3_win_rate,
        bo3_played: responses[1].games_played, // Annahme: API gibt games_played zurück
        bo3games: responses[2],
        leads: responses[3] || [], // Sicherstellen, dass es ein Array ist
        pokemon: responses[4] || [], // Sicherstellen, dass es ein Array ist
        tera: responses[5] || [] // Sicherstellen, dass es ein Array ist
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    if (!player.trim()) return;
    setLoading(true);
    
    try {
      const response = await fetch(`https://opulent-space-train-r4gvj76wqxjhxr77-3001.app.github.dev/api/player/${player}/matches`);
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadComboStats = async () => {
    if (!player || !leadCombo) return;
    setComboLoading(true);
    setComboStats(null);
    
    try {
      const leadsArray = leadCombo.split(';');
      if (leadsArray.length === 2 && leadsArray[0].trim() !== '' && leadsArray[1].trim() !== '') {
        const response = await fetch(
          `https://opulent-space-train-r4gvj76wqxjhxr77-3001.app.github.dev/api/player/${player}/lead-combination/${leadCombo}/winrate`
        );
        const data = await response.json();
        setComboStats(data);
      } else {
        // Handle single lead (e.g., "Terapagos", or "Terapagos;Amoonguss" as a single lead name)
        const response = await fetch(
          `https://opulent-space-train-r4gvj76wqxjhxr77-3001.app.github.dev/api/player/${player}/leadwr`
        );
        const data = await response.json();
        const singleLeadStats = data.find(item => item.pokemon === leadCombo);
        if (singleLeadStats) {
          setComboStats({
            win_rate: singleLeadStats.win_rate,
            games_played: singleLeadStats.games_played
          });
        } else {
          setComboStats(null); // No data found for single lead
        }
      }
    } catch (err) {
      console.error('Failed to fetch lead stats:', err.message, err);
    } finally {
      setComboLoading(false);
    }
  };

  useEffect(() => {
    if (player && activeTab === 'stats') {
      fetchStats();
    } else if (player && activeTab === 'matches') {
      fetchMatches();
    }
  }, [player, activeTab]);

  const renderStatCard = (title, value, games = null) => (
    <div className="stat-card">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}%</div>
      {games !== null && <div className="stat-desc">{games} games</div>}
    </div>
  );
 
   const renderSimpleStatCard = (title, value, description = null) => (
     <div className="stat-card">
       <div className="stat-title">{title}</div>
       <div className="stat-value">{value}</div>
       {description && <div className="stat-desc">{description}</div>}
     </div>
   );
 
   const getPokemonImageUrl = (pokemonName) => {
     let formattedName = pokemonName.toLowerCase().replace(/[^a-z0-9-]/g, '');
     
     const hyphenCount = (formattedName.match(/-/g) || []).length;

     if (hyphenCount > 1) {
       const firstHyphenIndex = formattedName.indexOf('-');
       formattedName = formattedName.substring(0, firstHyphenIndex + 1) + formattedName.substring(firstHyphenIndex + 1).replace(/-/g, '');
     }

     if (formattedName.includes('-')) {
       const nameWithoutHyphen = formattedName.replace(/-/g, '');
       if (nameWithoutHyphen.length <= 9) {
         formattedName = nameWithoutHyphen;
       }
     }
     
     return `https://play.pokemonshowdown.com/sprites/gen5/${formattedName}.png`;
   };

   const renderTeam = (teamString) => {
     if (!teamString) return null;
     const pokemon = teamString.split(';');
     return (
       <div className="team-display">
         {pokemon.map((poke, index) => (
           <div key={index} className="pokemon-team-item">
             <img
               src={getPokemonImageUrl(poke.trim())}
               alt={poke.trim()}
               className="pokemon-image-small"
             />
             <span className="pokemon-name-small">{poke.trim()}</span>
           </div>
         ))}
       </div>
     );
   };

   return (
     <div className="player-stats">
      <div className="header">
        <input
          type="text"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          placeholder="Enter player name"
        />
        <div className="tabs">
          <button 
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            Stats
          </button>
          <button 
            className={activeTab === 'matches' ? 'active' : ''}
            onClick={() => setActiveTab('matches')}
          >
            Match History
          </button>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {!loading && activeTab === 'stats' && (
        stats.wr !== undefined ? (
          <div className="stats-container">
            <div className="section">
              <h2>Overall Stats</h2>
              <div className="stats-row">
                {renderStatCard('Game Win Rate', stats.wr, stats?.games_played)}
                {renderStatCard('BO3 Win Rate', stats.bo3wr, stats?.bo3_played)}
              </div>
            </div>

            <div className="section">
              <h2>BO3 Game Positions</h2>
              <div className="stats-row">
                {stats.bo3games?.g1bo3wr && renderStatCard(
                  'Game 1 WR', 
                  stats.bo3games.g1bo3wr.win_rate, 
                  stats.bo3games.g1bo3wr.games_played
                )}
                {stats.bo3games?.g2bo3wr && renderStatCard(
                  'Game 2 WR', 
                  stats.bo3games.g2bo3wr.win_rate, 
                  stats.bo3games.g2bo3wr.games_played
                )}
                {stats.bo3games?.g3bo3wr && renderStatCard(
                  'Game 3 WR', 
                  stats.bo3games.g3bo3wr.win_rate, 
                  stats.bo3games.g3bo3wr.games_played
                )}
              </div>
            </div>

            <div className="section">
              <h2>Lead Performance</h2>
              <div className="lead-pair-section">
                <div className="lead-input">
                  <input
                    type="text"
                    value={leadCombo}
                    onChange={(e) => setLeadCombo(e.target.value)}
                    placeholder="Enter lead (Pokemon1;Pokemon2)"
                  />
                  <button
                    onClick={fetchLeadComboStats}
                  >
                    Analyze
                  </button>
                </div>
                
                {comboLoading && <div>Loading lead combination stats...</div>}
                {comboStats && !comboLoading && (
                  // Check if it's a single lead stat or a combination stat
                  comboStats.win_rate !== undefined ? ( // This is for single lead
                    <div className="combo-results">
                      <h3>Lead: {leadCombo}</h3>
                      <div className="stats-row">
                        {renderStatCard('Win Rate', comboStats.win_rate, comboStats.games_played)}
                      </div>
                    </div>
                  ) : ( // This is for lead combination (g1, g2, g3)
                    comboStats.g1 !== undefined ? (
                      <div className="combo-results">
                        <h3>Lead Combination: {leadCombo}</h3>
                        <div className="stats-row">
                          {renderStatCard('Game 1 WR', comboStats.g1.win_rate, comboStats.g1.total)}
                          {renderStatCard('Game 2 WR', comboStats.g2.win_rate, comboStats.g2.total)}
                          {renderStatCard('Game 3 WR', comboStats.g3.win_rate, comboStats.g3.total)}
                        </div>
                      </div>
                    ) : (
                      <div>No data found for this lead combination.</div>
                    )
                  )
                )}
              </div>
              
              <div className="pokemon-stats">
                {stats.leads && Array.isArray(stats.leads) && stats.leads.map((lead, idx) => (
                  <div key={idx} className="pokemon-stat">
                    <div className="pokemon-name">{lead.pokemon}</div>
                    <div className="stat-value">{lead.win_rate}%</div>
                    <div className="stat-count">({lead.games_played} games)</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <h2>Pokémon Performance</h2>
              <div className="pokemon-stats">
                {stats.pokemon && Array.isArray(stats.pokemon) && stats.pokemon.map((poke, idx) => (
                  <div key={idx} className="pokemon-stat">
                    <div className="pokemon-name">{poke.pokemon}</div>
                    <div className="stat-value">{poke.win_rate}%</div>
                    <div className="stat-count">({poke.games_played} games)</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <h2>Tera Performance</h2>
              <div className="pokemon-stats">
                {stats.tera && Array.isArray(stats.tera) && stats.tera.map((tera, idx) => (
                  <div key={idx} className="pokemon-stat">
                    <div className="pokemon-name">{tera.tera_type}</div>
                    <div className="stat-value">{tera.win_rate}%</div>
                    <div className="stat-count">({tera.games_played} games)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>Enter a player name to load stats</div>
        )
      )}

      {!loading && activeTab === 'matches' && (
        <div className="matches-container">
          {matches.length > 0 ? (
            matches.map((match) => (
              <div key={match.id} className="match-card">
                <div className="match-header">
                  <div className={`player ${match.winner_name === match.player1 ? 'winner' : ''}`}>
                    {match.player1}
                  </div>
                  <div className="vs">vs</div>
                  <div className={`player ${match.winner_name === match.player2 ? 'winner' : ''}`}>
                    {match.player2}
                  </div>
                </div>
                <div className="match-date">
                  {new Date(match.match_date).toLocaleDateString()}
                </div>
                <div className="results">
                  Winner: {match.winner_name}
                </div>
                
                <div className="games">
                  {match.games && match.games.map((game) => (
                    <div key={game.game_id} className="game">
                      <div className="game-header">Game {game.game_number}</div>
                      <div className="game-players">
                        <div className="player-info">
                          <div><strong>{game.player.name}</strong></div>
                          {renderTeam(game.player.team)}
                          <div>Lead: {game.player.lead}</div>
                          <div>Tera: {game.player.tera}</div>
                        </div>
                        <div className="vs">vs</div>
                        <div className="player-info">
                          <div><strong>{game.opponent.name}</strong></div>
                          {renderTeam(game.opponent.team)}
                          <div>Lead: {game.opponent.lead}</div>
                          <div>Tera: {game.opponent.tera}</div>
                        </div>
                      </div>
                      <div className="game-winner">
                        Winner: <span className="winner">{game.winner}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : player ? (
            <div>No match history found for {player}</div>
          ) : (
            <div>Enter a player name to see matches</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerStats;
