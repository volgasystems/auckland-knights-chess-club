export const TOURNAMENT_SYSTEM_OPTIONS = [
  "Swiss-system",
  "Round-Robin",
  "Knockout",
  "Scheveningen",
  "Arena",
  "Team Swiss",
  "Team Round-Robin",
  "Match",
  "Simultaneous Exhibition",
  "Training / Coaching Event",
  "Other",
];

export const RATING_FORMAT_OPTIONS = [
  "Classical",
  "Rapid",
  "Blitz",
  "Lightning",
  "Bullet",
  "Unrated / Casual",
  "Junior Event",
  "Training Event",
  "Other",
];

export const RATING_TYPE_OPTIONS = [
  "FIDE Rated",
  "NZCF Rated",
  "FIDE & NZCF Rated",
  "Non-rated",
  "Club Rated",
  "Training / Casual",
];

export const TIME_CONTROL_OPTIONS = [
  "90+30",
  "90+30, 40 moves then 30+30",
  "90+30, 40 moves then 15+30",
  "75+30",
  "60+30",
  "60+15",
  "60+0",
  "45+45",
  "25+10",
  "25+5",
  "25+0",
  "20+10",
  "15+10",
  "15+5",
  "15+0",
  "10+5",
  "10+0",
  "5+3",
  "5+0",
  "3+2",
  "3+0",
  "2+1",
  "2+0",
  "1+1",
  "1+0",
  "Custom",
];

export const ROUND_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "Custom"];

export function displayTournamentSystem(t: any) {
  return t?.tournament_system || t?.tournament_format || "System TBC";
}

export function displayRatingFormat(t: any) {
  return t?.rating_format || "Format TBC";
}

export function displayRatingType(t: any) {
  return t?.rating_type || "Rating type TBC";
}

// Prefer the standard dropdown selection; use the numeric field for Custom/legacy records.
export function tournamentRounds(t: any): number | null {
  const selected = String(t?.rounds_display ?? "").trim();
  const value = /^\d+$/.test(selected) ? Number(selected) : Number(t?.rounds);
  return Number.isInteger(value) && value > 0 ? value : null;
}
