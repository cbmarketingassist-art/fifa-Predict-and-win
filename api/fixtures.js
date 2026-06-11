// ─────────────────────────────────────────────
//  FIFA World Cup 2026 — Complete Fixture Data
//  104 matches · 48 teams · All IST times
//  Source: FIFA_World_Cup_2026_Fixture_List_IST.docx
// ─────────────────────────────────────────────

export const TEAMS = {
  // ── Group A ──
  'Mexico':       { name: 'Mexico',       flag: '🇲🇽', flagCode: 'mx', color: '#006847', colorDark: '#004D35' },
  'South Africa': { name: 'South Africa', flag: '🇿🇦', flagCode: 'za', color: '#007A4D', colorDark: '#004A2F' },
  'South Korea':  { name: 'South Korea',  flag: '🇰🇷', flagCode: 'kr', color: '#CD2E3A', colorDark: '#8B1E28' },
  'Czechia':      { name: 'Czechia',      flag: '🇨🇿', flagCode: 'cz', color: '#D7141A', colorDark: '#85090F' },
  // ── Group B ──
  'Canada':                  { name: 'Canada',                  flag: '🇨🇦', flagCode: 'ca', color: '#FF0000', colorDark: '#A00000' },
  'Bosnia and Herzegovina':  { name: 'Bosnia and Herzegovina',  flag: '🇧🇦', flagCode: 'ba', color: '#002395', colorDark: '#001560' },
  'Qatar':                   { name: 'Qatar',                   flag: '🇶🇦', flagCode: 'qa', color: '#8D1B3D', colorDark: '#5C1128' },
  'Switzerland':             { name: 'Switzerland',             flag: '🇨🇭', flagCode: 'ch', color: '#FF0000', colorDark: '#A00000' },
  // ── Group C ──
  'Brazil':   { name: 'Brazil',   flag: '🇧🇷', flagCode: 'br', color: '#009C3B', colorDark: '#006626' },
  'Morocco':  { name: 'Morocco',  flag: '🇲🇦', flagCode: 'ma', color: '#C1272D', colorDark: '#7D1A1E' },
  'Haiti':    { name: 'Haiti',    flag: '🇭🇹', flagCode: 'ht', color: '#00209F', colorDark: '#001566' },
  'Scotland': { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', flagCode: 'gb-sct', color: '#003DA5', colorDark: '#002060' },
  // ── Group D ──
  'United States': { name: 'United States', flag: '🇺🇸', flagCode: 'us', color: '#002868', colorDark: '#001A44' },
  'Paraguay':      { name: 'Paraguay',      flag: '🇵🇾', flagCode: 'py', color: '#0038A8', colorDark: '#00246E' },
  'Australia':     { name: 'Australia',      flag: '🇦🇺', flagCode: 'au', color: '#00843D', colorDark: '#005528' },
  'Turkey':        { name: 'Turkey',         flag: '🇹🇷', flagCode: 'tr', color: '#E30A17', colorDark: '#9A070F' },
  // ── Group E ──
  'Germany':      { name: 'Germany',      flag: '🇩🇪', flagCode: 'de', color: '#DD0000', colorDark: '#8B0000' },
  'Curaçao':      { name: 'Curaçao',      flag: '🇨🇼', flagCode: 'cw', color: '#003DA5', colorDark: '#002060' },
  'Ivory Coast':  { name: 'Ivory Coast',  flag: '🇨🇮', flagCode: 'ci', color: '#FF8200', colorDark: '#B35B00' },
  'Ecuador':      { name: 'Ecuador',      flag: '🇪🇨', flagCode: 'ec', color: '#FFD100', colorDark: '#B39200' },
  // ── Group F ──
  'Netherlands': { name: 'Netherlands', flag: '🇳🇱', flagCode: 'nl', color: '#FF6600', colorDark: '#993D00' },
  'Japan':       { name: 'Japan',       flag: '🇯🇵', flagCode: 'jp', color: '#BC002D', colorDark: '#7A001E' },
  'Sweden':      { name: 'Sweden',      flag: '🇸🇪', flagCode: 'se', color: '#006AA7', colorDark: '#004066' },
  'Tunisia':     { name: 'Tunisia',     flag: '🇹🇳', flagCode: 'tn', color: '#E70013', colorDark: '#99000D' },
  // ── Group G ──
  'Belgium':     { name: 'Belgium',     flag: '🇧🇪', flagCode: 'be', color: '#ED2939', colorDark: '#9B1B26' },
  'Egypt':       { name: 'Egypt',       flag: '🇪🇬', flagCode: 'eg', color: '#CE1126', colorDark: '#880B19' },
  'Iran':        { name: 'Iran',        flag: '🇮🇷', flagCode: 'ir', color: '#239F40', colorDark: '#166A2A' },
  'New Zealand': { name: 'New Zealand', flag: '🇳🇿', flagCode: 'nz', color: '#00247D', colorDark: '#001650' },
  // ── Group H ──
  'Spain':        { name: 'Spain',        flag: '🇪🇸', flagCode: 'es', color: '#AA151B', colorDark: '#6B0D10' },
  'Cape Verde':   { name: 'Cape Verde',   flag: '🇨🇻', flagCode: 'cv', color: '#003893', colorDark: '#00225A' },
  'Saudi Arabia': { name: 'Saudi Arabia', flag: '🇸🇦', flagCode: 'sa', color: '#006C35', colorDark: '#004522' },
  'Uruguay':      { name: 'Uruguay',      flag: '🇺🇾', flagCode: 'uy', color: '#5CBFEB', colorDark: '#2A8AB8' },
  // ── Group I ──
  'France':  { name: 'France',  flag: '🇫🇷', flagCode: 'fr', color: '#002395', colorDark: '#001560' },
  'Senegal': { name: 'Senegal', flag: '🇸🇳', flagCode: 'sn', color: '#00853F', colorDark: '#005528' },
  'Iraq':    { name: 'Iraq',    flag: '🇮🇶', flagCode: 'iq', color: '#CE1126', colorDark: '#880B19' },
  'Norway':  { name: 'Norway',  flag: '🇳🇴', flagCode: 'no', color: '#EF2B2D', colorDark: '#A01C1E' },
  // ── Group J ──
  'Argentina': { name: 'Argentina', flag: '🇦🇷', flagCode: 'ar', color: '#75AADB', colorDark: '#4A7FA8' },
  'Algeria':   { name: 'Algeria',   flag: '🇩🇿', flagCode: 'dz', color: '#006233', colorDark: '#003D20' },
  'Austria':   { name: 'Austria',   flag: '🇦🇹', flagCode: 'at', color: '#ED2939', colorDark: '#9B1B26' },
  'Jordan':    { name: 'Jordan',    flag: '🇯🇴', flagCode: 'jo', color: '#007A3D', colorDark: '#004D26' },
  // ── Group K ──
  'Portugal':   { name: 'Portugal',   flag: '🇵🇹', flagCode: 'pt', color: '#006600', colorDark: '#003D00' },
  'DR Congo':   { name: 'DR Congo',   flag: '🇨🇩', flagCode: 'cd', color: '#007FFF', colorDark: '#004C99' },
  'Uzbekistan': { name: 'Uzbekistan', flag: '🇺🇿', flagCode: 'uz', color: '#0099B5', colorDark: '#006677' },
  'Colombia':   { name: 'Colombia',   flag: '🇨🇴', flagCode: 'co', color: '#FCD116', colorDark: '#B3920F' },
  // ── Group L ──
  'England': { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', flagCode: 'gb-eng', color: '#CF081F', colorDark: '#8B0515' },
  'Croatia': { name: 'Croatia', flag: '🇭🇷', flagCode: 'hr', color: '#FF0000', colorDark: '#A00000' },
  'Ghana':   { name: 'Ghana',   flag: '🇬🇭', flagCode: 'gh', color: '#006B3F', colorDark: '#004528' },
  'Panama':  { name: 'Panama',  flag: '🇵🇦', flagCode: 'pa', color: '#DA121A', colorDark: '#8E0C11' },
};

const TBD = { name: 'TBD', flag: '🏳️', flagCode: '', color: '#555', colorDark: '#333' };

function T(name) { return TEAMS[name] || TBD; }

// Helper to build a group-stage match
function gs(id, date, time, group, t1, t2) {
  return { id, date, timeIST: time, group: 'Group ' + group, stage: 'Group Stage', team1: T(t1), team2: T(t2) };
}

// Helper to build a knockout match (teams TBD until admin assigns)
function ko(id, date, time, stage, desc) {
  return { id, date, timeIST: time, group: '-', stage, team1: { ...TBD }, team2: { ...TBD }, fixtureDesc: desc, isKnockout: true };
}

export const FIXTURES = [
  // ═══════════════════════════════════════════════
  //  MATCHDAY 1
  // ═══════════════════════════════════════════════
  gs(1,  '2026-06-12', '00:30', 'A', 'Mexico', 'South Africa'),
  gs(2,  '2026-06-12', '07:30', 'A', 'South Korea', 'Czechia'),
  gs(3,  '2026-06-13', '00:30', 'B', 'Canada', 'Bosnia and Herzegovina'),
  gs(4,  '2026-06-13', '06:30', 'D', 'United States', 'Paraguay'),
  gs(8,  '2026-06-14', '00:30', 'B', 'Qatar', 'Switzerland'),
  gs(7,  '2026-06-14', '03:30', 'C', 'Brazil', 'Morocco'),
  gs(5,  '2026-06-14', '06:30', 'C', 'Haiti', 'Scotland'),
  gs(6,  '2026-06-14', '09:30', 'D', 'Australia', 'Turkey'),
  gs(10, '2026-06-14', '22:30', 'E', 'Germany', 'Curaçao'),
  gs(11, '2026-06-15', '01:30', 'F', 'Netherlands', 'Japan'),
  gs(9,  '2026-06-15', '04:30', 'E', 'Ivory Coast', 'Ecuador'),
  gs(12, '2026-06-15', '07:30', 'F', 'Sweden', 'Tunisia'),
  gs(14, '2026-06-15', '21:30', 'H', 'Spain', 'Cape Verde'),
  gs(16, '2026-06-16', '00:30', 'G', 'Belgium', 'Egypt'),
  gs(13, '2026-06-16', '03:30', 'H', 'Saudi Arabia', 'Uruguay'),
  gs(15, '2026-06-16', '06:30', 'G', 'Iran', 'New Zealand'),
  gs(17, '2026-06-17', '00:30', 'I', 'France', 'Senegal'),
  gs(18, '2026-06-17', '03:30', 'I', 'Iraq', 'Norway'),
  gs(19, '2026-06-17', '06:30', 'J', 'Argentina', 'Algeria'),
  gs(20, '2026-06-17', '09:30', 'J', 'Austria', 'Jordan'),

  // ═══════════════════════════════════════════════
  //  MATCHDAY 1 continued (Groups K, L)
  // ═══════════════════════════════════════════════
  gs(23, '2026-06-17', '22:30', 'K', 'Portugal', 'DR Congo'),
  gs(22, '2026-06-18', '01:30', 'L', 'England', 'Croatia'),
  gs(21, '2026-06-18', '04:30', 'L', 'Ghana', 'Panama'),
  gs(24, '2026-06-18', '07:30', 'K', 'Uzbekistan', 'Colombia'),

  // ═══════════════════════════════════════════════
  //  MATCHDAY 2
  // ═══════════════════════════════════════════════
  gs(25, '2026-06-18', '21:30', 'A', 'Czechia', 'South Africa'),
  gs(26, '2026-06-19', '00:30', 'B', 'Switzerland', 'Bosnia and Herzegovina'),
  gs(27, '2026-06-19', '03:30', 'B', 'Canada', 'Qatar'),
  gs(28, '2026-06-19', '06:30', 'A', 'Mexico', 'South Korea'),
  gs(32, '2026-06-20', '00:30', 'D', 'United States', 'Australia'),
  gs(30, '2026-06-20', '03:30', 'C', 'Scotland', 'Morocco'),
  gs(29, '2026-06-20', '06:00', 'C', 'Brazil', 'Haiti'),
  gs(31, '2026-06-20', '08:30', 'D', 'Turkey', 'Paraguay'),
  gs(35, '2026-06-20', '22:30', 'F', 'Netherlands', 'Sweden'),
  gs(33, '2026-06-21', '01:30', 'E', 'Germany', 'Ivory Coast'),
  gs(34, '2026-06-21', '05:30', 'E', 'Ecuador', 'Curaçao'),
  gs(36, '2026-06-21', '09:30', 'F', 'Tunisia', 'Japan'),
  gs(38, '2026-06-21', '21:30', 'H', 'Spain', 'Saudi Arabia'),
  gs(39, '2026-06-22', '00:30', 'G', 'Belgium', 'Iran'),
  gs(37, '2026-06-22', '03:30', 'H', 'Uruguay', 'Cape Verde'),
  gs(40, '2026-06-22', '06:30', 'G', 'New Zealand', 'Egypt'),
  gs(43, '2026-06-22', '22:30', 'J', 'Argentina', 'Austria'),
  gs(42, '2026-06-23', '02:30', 'I', 'France', 'Iraq'),
  gs(41, '2026-06-23', '05:30', 'I', 'Norway', 'Senegal'),
  gs(44, '2026-06-23', '08:30', 'J', 'Jordan', 'Algeria'),
  gs(47, '2026-06-23', '22:30', 'K', 'Portugal', 'Uzbekistan'),
  gs(45, '2026-06-24', '01:30', 'L', 'England', 'Ghana'),
  gs(46, '2026-06-24', '04:30', 'L', 'Panama', 'Croatia'),
  gs(48, '2026-06-24', '07:30', 'K', 'Colombia', 'DR Congo'),

  // ═══════════════════════════════════════════════
  //  MATCHDAY 3 (simultaneous kickoffs per group)
  // ═══════════════════════════════════════════════
  gs(51, '2026-06-25', '00:30', 'B', 'Switzerland', 'Canada'),
  gs(52, '2026-06-25', '00:30', 'B', 'Bosnia and Herzegovina', 'Qatar'),
  gs(49, '2026-06-25', '03:30', 'C', 'Scotland', 'Brazil'),
  gs(50, '2026-06-25', '03:30', 'C', 'Morocco', 'Haiti'),
  gs(53, '2026-06-25', '06:30', 'A', 'Czechia', 'Mexico'),
  gs(54, '2026-06-25', '06:30', 'A', 'South Africa', 'South Korea'),
  gs(56, '2026-06-26', '01:30', 'E', 'Ecuador', 'Germany'),
  gs(55, '2026-06-26', '01:30', 'E', 'Curaçao', 'Ivory Coast'),
  gs(58, '2026-06-26', '04:30', 'F', 'Tunisia', 'Netherlands'),
  gs(57, '2026-06-26', '04:30', 'F', 'Japan', 'Sweden'),
  gs(59, '2026-06-26', '07:30', 'D', 'Turkey', 'United States'),
  gs(60, '2026-06-26', '07:30', 'D', 'Paraguay', 'Australia'),
  gs(61, '2026-06-27', '00:30', 'I', 'Norway', 'France'),
  gs(62, '2026-06-27', '00:30', 'I', 'Senegal', 'Iraq'),
  gs(66, '2026-06-27', '05:30', 'H', 'Uruguay', 'Spain'),
  gs(65, '2026-06-27', '05:30', 'H', 'Cape Verde', 'Saudi Arabia'),
  gs(64, '2026-06-27', '08:30', 'G', 'New Zealand', 'Belgium'),
  gs(63, '2026-06-27', '08:30', 'G', 'Egypt', 'Iran'),
  gs(67, '2026-06-28', '02:30', 'L', 'Panama', 'England'),
  gs(68, '2026-06-28', '02:30', 'L', 'Croatia', 'Ghana'),
  gs(71, '2026-06-28', '05:00', 'K', 'Colombia', 'Portugal'),
  gs(72, '2026-06-28', '05:00', 'K', 'DR Congo', 'Uzbekistan'),
  gs(70, '2026-06-28', '08:30', 'J', 'Jordan', 'Argentina'),
  gs(69, '2026-06-28', '08:30', 'J', 'Algeria', 'Austria'),

  // ═══════════════════════════════════════════════
  //  ROUND OF 32
  // ═══════════════════════════════════════════════
  ko(73,  '2026-06-29', '00:30', 'Round of 32', '2A vs 2B'),
  ko(76,  '2026-06-29', '22:30', 'Round of 32', '1C vs 2F'),
  ko(74,  '2026-06-30', '02:00', 'Round of 32', '1E vs Best 3rd (A/B/C/D/F)'),
  ko(75,  '2026-06-30', '06:30', 'Round of 32', '1F vs 2C'),
  ko(78,  '2026-06-30', '22:30', 'Round of 32', '2E vs 2I'),
  ko(77,  '2026-07-01', '02:30', 'Round of 32', '1I vs Best 3rd (C/D/F/G/H)'),
  ko(79,  '2026-07-01', '06:30', 'Round of 32', '1A vs Best 3rd (C/E/F/H/I)'),
  ko(80,  '2026-07-01', '21:30', 'Round of 32', '1L vs Best 3rd (E/H/I/J/K)'),
  ko(82,  '2026-07-02', '01:30', 'Round of 32', '1G vs Best 3rd (A/E/H/I/J)'),
  ko(81,  '2026-07-02', '05:30', 'Round of 32', '1D vs Best 3rd (B/E/F/I/J)'),
  ko(84,  '2026-07-03', '00:30', 'Round of 32', '1H vs 2J'),
  ko(83,  '2026-07-03', '04:30', 'Round of 32', '2K vs 2L'),
  ko(85,  '2026-07-03', '08:30', 'Round of 32', '1B vs Best 3rd (E/F/G/I/J)'),
  ko(88,  '2026-07-03', '23:30', 'Round of 32', '2D vs 2G'),
  ko(86,  '2026-07-04', '03:30', 'Round of 32', '1J vs 2H'),
  ko(87,  '2026-07-04', '07:00', 'Round of 32', '1K vs Best 3rd (D/E/I/J/L)'),

  // ═══════════════════════════════════════════════
  //  ROUND OF 16
  // ═══════════════════════════════════════════════
  ko(90,  '2026-07-04', '22:30', 'Round of 16', 'Winner M73 vs Winner M75'),
  ko(89,  '2026-07-05', '02:30', 'Round of 16', 'Winner M74 vs Winner M77'),
  ko(91,  '2026-07-06', '01:30', 'Round of 16', 'Winner M76 vs Winner M78'),
  ko(92,  '2026-07-06', '05:30', 'Round of 16', 'Winner M79 vs Winner M80'),
  ko(93,  '2026-07-07', '00:30', 'Round of 16', 'Winner M83 vs Winner M84'),
  ko(94,  '2026-07-07', '05:30', 'Round of 16', 'Winner M81 vs Winner M82'),
  ko(95,  '2026-07-07', '21:30', 'Round of 16', 'Winner M86 vs Winner M88'),
  ko(96,  '2026-07-08', '01:30', 'Round of 16', 'Winner M85 vs Winner M87'),

  // ═══════════════════════════════════════════════
  //  QUARTER-FINALS
  // ═══════════════════════════════════════════════
  ko(97,  '2026-07-10', '01:30', 'Quarter-finals', 'Winner M89 vs Winner M90'),
  ko(98,  '2026-07-11', '00:30', 'Quarter-finals', 'Winner M93 vs Winner M94'),
  ko(99,  '2026-07-12', '02:30', 'Quarter-finals', 'Winner M91 vs Winner M92'),
  ko(100, '2026-07-12', '06:30', 'Quarter-finals', 'Winner M95 vs Winner M96'),

  // ═══════════════════════════════════════════════
  //  SEMI-FINALS
  // ═══════════════════════════════════════════════
  ko(101, '2026-07-15', '00:30', 'Semi-finals', 'Winner M97 vs Winner M98'),
  ko(102, '2026-07-16', '00:30', 'Semi-finals', 'Winner M99 vs Winner M100'),

  // ═══════════════════════════════════════════════
  //  3RD PLACE & FINAL
  // ═══════════════════════════════════════════════
  ko(103, '2026-07-19', '02:30', 'Third-place match', 'Loser M101 vs Loser M102'),
  ko(104, '2026-07-20', '00:30', 'Final', 'Winner M101 vs Winner M102'),
];

// Group compositions for reference
export const GROUPS = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
};
