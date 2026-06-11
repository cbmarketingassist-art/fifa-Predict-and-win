// ─────────────────────────────────────────────
//  Predictions Module — server-backed
//  Now supports prediction changes while match is open
// ─────────────────────────────────────────────
const Predictions = (() => {

  function canPredict(match) {
    const status = getMatchStatus(match);
    return status === 'open';
  }

  // Sync — uses cached predictions
  function hasUserPredicted(matchId) {
    const user = Auth.getCurrentUser();
    if (!user) return false;
    return !!DB.getPrediction(user.phone, matchId);
  }

  // Sync — uses cached predictions
  function getUserPrediction(matchId) {
    const user = Auth.getCurrentUser();
    if (!user) return null;
    return DB.getPrediction(user.phone, matchId);
  }

  // Can the user change their prediction?
  function canChangePrediction(matchId) {
    const match = MATCHES.find(m => m.id === matchId);
    if (!match) return false;
    return canPredict(match) && hasUserPredicted(matchId);
  }

  // Async — sends to server (now supports upsert)
  async function submitPrediction(matchId, teamName) {
    const user = Auth.getCurrentUser();
    if (!user) return { success: false, msg: 'Not logged in' };

    const match = MATCHES.find(m => m.id === matchId);
    if (!match) return { success: false, msg: 'Match not found' };
    if (!canPredict(match)) return { success: false, msg: 'Predictions are closed for this match' };

    // Server handles upsert — no need to block on "already predicted"
    const result = await DB.savePrediction(user.phone, matchId, teamName);
    if (result && result.error) return { success: false, msg: result.error };
    return { success: true, updated: result.updated || false };
  }

  // Sync — uses cached predictions
  function getStats(matchId) {
    const match = MATCHES.find(m => m.id === matchId);
    if (!match) return null;
    return DB.getMatchStats(matchId, match.team1.name, match.team2.name);
  }

  // Sync — uses cached predictions
  function getUserAllPredictions() {
    const user = Auth.getCurrentUser();
    if (!user) return [];
    return DB.getUserPredictions(user.phone).map(pred => {
      const match = MATCHES.find(m => m.id === parseInt(pred.matchId));
      return { ...pred, match };
    });
  }

  return { canPredict, canChangePrediction, hasUserPredicted, getUserPrediction, submitPrediction, getStats, getUserAllPredictions };
})();
