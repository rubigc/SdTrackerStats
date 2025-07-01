const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3001;

// Database setup
const db = new sqlite3.Database('./pokemon_stats.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Player Stats Endpoints

// 1. Player overall game win rate
app.get('/api/player/:name/wr', (req, res) => {
  const player = req.params.name;
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM games
       JOIN game_players ON games.id = game_players.game_id
       WHERE game_players.player_name = ? AND games.winner = game_players.player_name) AS wins,
      (SELECT COUNT(*) FROM game_players WHERE player_name = ?) AS total
  `;

  db.get(sql, [player, player], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const wr = row.total > 0 ? (row.wins / row.total * 100).toFixed(2) : 0;
    res.json({ win_rate: Number(wr), games_played: row.total });
  });
});

// 2. BO3 win rate
app.get('/api/player/:name/bo3wr', (req, res) => {
  const player = req.params.name;
  const sql = `
    SELECT 
      SUM(CASE WHEN m.winner = p_index THEN 1 ELSE 0 END) AS wins,
      COUNT(*) AS total
    FROM (
      SELECT 
        m.id,
        m.winner,
        CASE WHEN m.player1 = ? THEN 1 ELSE 2 END AS p_index
      FROM matches m
      WHERE m.player1 = ? OR m.player2 = ?
    ) AS m
  `;

  db.get(sql, [player, player, player], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const wr = row.total > 0 ? (row.wins / row.total * 100).toFixed(2) : 0;
    res.json({ bo3_win_rate: Number(wr), bo3_played: row.total });
  });
});

// 3. Win rate per game in a BO3
app.get('/api/player/:name/bo3gameswr', (req, res) => {
  const player = req.params.name;
  const sql = `
    SELECT 
      game_number,
      COUNT(*) AS total,
      SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) AS wins
    FROM games
    WHERE match_id IN (
      SELECT id FROM matches 
      WHERE player1 = ? OR player2 = ?
    )
    GROUP BY game_number
    ORDER BY game_number
  `;

  db.all(sql, [player, player, player], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const result = {};
    rows.forEach(row => {
      const wr = row.total > 0 ? (row.wins / row.total * 100).toFixed(2) : 0;
      result[`g${row.game_number}bo3wr`] = {
        win_rate: Number(wr),
        games_played: row.total
      };
    });
    
    for (let i = 1; i <= 3; i++) {
      const key = `g${i}bo3wr`;
      if (!result[key]) {
        result[key] = { win_rate: 0, games_played: 0 };
      }
    }
    
    res.json(result);
  });
});

// 4. Lead win rate
app.get('/api/player/:name/leadwr', (req, res) => {
  const player = req.params.name;
  const sql = `
    SELECT 
      lead_pokemon AS pokemon,
      COUNT(*) AS total,
      SUM(CASE WHEN g.winner = gp.player_name THEN 1 ELSE 0 END) AS wins
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.player_name = ?
      AND lead_pokemon IS NOT NULL
      AND lead_pokemon != ''
    GROUP BY lead_pokemon
  `;

  db.all(sql, [player], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const result = rows.map(row => ({
      pokemon: row.pokemon,
      win_rate: row.total > 0 ? Number((row.wins / row.total * 100).toFixed(2)) : 0,
      games_played: row.total
    }));
    
    res.json(result);
  });
});

// 5. Pokémon win rate
app.get('/api/player/:name/pokemonwr', (req, res) => {
  const player = req.params.name;
  const sql = `
    SELECT
      gp.team_pokemon,
      g.winner,
      gp.player_name
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.player_name = ?
      AND gp.team_pokemon IS NOT NULL
      AND gp.team_pokemon != ''
  `;

  db.all(sql, [player], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const pokemonStats = {};

    rows.forEach(row => {
      const team = row.team_pokemon.split(';');
      const playerWon = row.winner === row.player_name;

      team.forEach(pokemon => {
        if (!pokemonStats[pokemon]) {
          pokemonStats[pokemon] = { wins: 0, total: 0 };
        }
        pokemonStats[pokemon].total++;
        if (playerWon) {
          pokemonStats[pokemon].wins++;
        }
      });
    });

    const result = Object.keys(pokemonStats).map(pokemon => ({
      pokemon: pokemon,
      win_rate: pokemonStats[pokemon].total > 0 ? Number((pokemonStats[pokemon].wins / pokemonStats[pokemon].total * 100).toFixed(2)) : 0,
      games_played: pokemonStats[pokemon].total
    }));

    res.json(result);
  });
});

// 6. Tera win rate
app.get('/api/player/:name/tarawr', (req, res) => {
  const player = req.params.name;
  const sql = `
    SELECT 
      tera_used AS tera_type,
      COUNT(*) AS total,
      SUM(CASE WHEN g.winner = gp.player_name THEN 1 ELSE 0 END) AS wins
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.player_name = ?
      AND tera_used IS NOT NULL
      AND tera_used != ''
    GROUP BY tera_used
  `;

  db.all(sql, [player], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const result = rows.map(row => ({
      tera_type: row.tera_type,
      win_rate: row.total > 0 ? Number((row.wins / row.total * 100).toFixed(2)) : 0,
      games_played: row.total
    }));
    
    res.json(result);
  });
});

// 7. Win rate against specific Pokémon
app.get('/api/player/:name/versus/:pokemon', (req, res) => {
  const player = req.params.name;
  const pokemon = req.params.pokemon;
  
  const sql = `
    SELECT
      (SELECT COUNT(DISTINCT g.id)
        FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        JOIN game_players opp ON g.id = opp.game_id AND opp.player_name != gp.player_name
        WHERE gp.player_name = ?
          AND opp.team_pokemon LIKE '%' || ? || '%'
          AND g.winner = gp.player_name
      ) AS wins,
      (SELECT COUNT(DISTINCT g.id)
        FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        JOIN game_players opp ON g.id = opp.game_id AND opp.player_name != gp.player_name
        WHERE gp.player_name = ?
          AND opp.team_pokemon LIKE '%' || ? || '%'
      ) AS total
  `;

  db.get(sql, [player, pokemon, player, pokemon], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const wr = row.total > 0 ? (row.wins / row.total * 100).toFixed(2) : 0;
    res.json({ 
      opponent_pokemon: pokemon, 
      win_rate: Number(wr),
      games_played: row.total 
    });
  });
});

// 8. Lead combination wins by game number
app.get('/api/player/:name/lead-combination/:leads/winrate', (req, res) => {
  const player = req.params.name;
  const leads = req.params.leads; // "Koraidon;Amoonguss"

  const sql = `
    SELECT
      g.game_number,
      COUNT(*) AS total,
      SUM(CASE WHEN g.winner = gp.player_name THEN 1 ELSE 0 END) AS wins
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.player_name = ?
      AND gp.lead_pokemon = ?
    GROUP BY g.game_number
    ORDER BY g.game_number
  `;

  db.all(sql, [player, leads], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const result = {
      "g1": { "wins": null, "total": 0, "win_rate": 0 },
      "g2": { "wins": null, "total": 0, "win_rate": 0 },
      "g3": { "wins": null, "total": 0, "win_rate": 0 }
    };

    rows.forEach(row => {
      const winRate = row.total > 0 ? Number((row.wins / row.total * 100).toFixed(2)) : 0;
      result[`g${row.game_number}`] = {
        wins: row.wins,
        total: row.total,
        win_rate: winRate
      };
    });

    res.json(result);
  });
});

// Game and Match Endpoints

// 9. Get all games for a player
app.get('/api/player/:name/games', (req, res) => {
  const player = req.params.name;
  const sql = `
    SELECT 
      g.*,
      m.player1, 
      m.player2,
      m.match_date,
      gp.team_pokemon AS player_team,
      gp.lead_pokemon AS player_lead,
      gp.tera_used AS player_tera,
      opp.player_name AS opponent,
      opp.team_pokemon AS opponent_team,
      opp.lead_pokemon AS opponent_lead,
      opp.tera_used AS opponent_tera
    FROM games g
    JOIN matches m ON g.match_id = m.id
    JOIN game_players gp ON g.id = gp.game_id AND gp.player_name = ?
    JOIN game_players opp ON g.id = opp.game_id AND opp.player_name != ?
  `;

  db.all(sql, [player, player], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 10. Get all matches for a player with game details
app.get('/api/player/:name/matches', (req, res) => {
  const player = req.params.name;
  
  // First get match IDs where the player participated
  const matchSql = `
    SELECT id, match_uuid, player1, player2, winner, match_date 
    FROM matches 
    WHERE player1 = ? OR player2 = ?
  `;
  
  db.all(matchSql, [player, player], (matchErr, rawMatches) => {
    if (matchErr) return res.status(500).json({ error: matchErr.message });
    
    if (rawMatches.length === 0) return res.json([]);

    const uniqueMatchUuids = new Set();
    const matches = rawMatches.filter(m => {
      if (uniqueMatchUuids.has(m.match_uuid)) {
        return false;
      }
      uniqueMatchUuids.add(m.match_uuid);
      return true;
    });

    if (matches.length === 0) return res.json([]); // After filtering, there might be no unique matches
    
    // Get game details for these matches
    const matchIds = matches.map(m => m.id);
    const gameSql = `
      SELECT 
        g.id, g.match_id, g.game_number, g.winner AS game_winner, g.replay,
        gp.player_name, gp.team_pokemon, gp.lead_pokemon, gp.tera_used,
        CASE WHEN m.player1 = gp.player_name THEN m.player2 ELSE m.player1 END AS opponent_name,
        (SELECT team_pokemon FROM game_players WHERE game_id = g.id AND player_name = (CASE WHEN m.player1 = gp.player_name THEN m.player2 ELSE m.player1 END)) AS opponent_team,
        (SELECT lead_pokemon FROM game_players WHERE game_id = g.id AND player_name = (CASE WHEN m.player1 = gp.player_name THEN m.player2 ELSE m.player1 END)) AS opponent_lead,
        (SELECT tera_used FROM game_players WHERE game_id = g.id AND player_name = (CASE WHEN m.player1 = gp.player_name THEN m.player2 ELSE m.player1 END)) AS opponent_tera
      FROM games g
      JOIN matches m ON g.match_id = m.id
      JOIN game_players gp ON g.id = gp.game_id AND gp.player_name = ?
      WHERE g.match_id IN (${matchIds.map(() => '?').join(',')})
    `;
    
    db.all(gameSql, [player, ...matchIds], (gameErr, games) => {
      if (gameErr) return res.status(500).json({ error: gameErr.message });
      
      // Group games by match and reformat data
      const matchMap = {};
      matches.forEach(match => {
        matchMap[match.id] = {
          ...match,
          winner_name: match.winner === 1 ? match.player1 : match.player2,
          games: []
        };
      });
      
      // Add games to matches
      games.forEach(game => {
        const matchId = game.match_id;
        if (matchMap[matchId]) {
          // Avoid duplicate game entries
          const gameExists = matchMap[matchId].games.some(g => g.id === game.id);
          if (!gameExists) {
            matchMap[matchId].games.push({
              game_id: game.id,
              game_number: game.game_number,
              winner: game.game_winner,
              replay: game.replay,
              player: {
                name: game.player_name,
                team: game.team_pokemon,
                lead: game.lead_pokemon,
                tera: game.tera_used
              },
              opponent: {
                name: game.opponent_name,
                team: game.opponent_team,
                lead: game.opponent_lead,
                tera: game.opponent_tera
              }
            });
          }
        }
      });
      
      // Convert to array
      const result = Object.values(matchMap);
      res.json(result);
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
