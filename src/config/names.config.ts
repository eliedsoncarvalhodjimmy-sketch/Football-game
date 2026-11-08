// Syllable pools for INVENTED names (test data only). Names are built by combining syllables,
// so they "sound" regional without copying real people or clubs.

import type { NameRegion } from '../engine/types';

export interface NamePool {
  firstStart: string[];
  firstEnd: string[];
  lastStart: string[];
  lastEnd: string[];
  cityStart: string[];
  cityEnd: string[];
  /** Club name patterns; "{city}" is replaced. */
  clubPatterns: string[];
}

export const NAME_POOLS: Record<NameRegion, NamePool> = {
  iberian: {
    firstStart: ['Al', 'Ma', 'Jo', 'Ser', 'Da', 'Ru', 'Ni', 'Gon', 'Pa', 'Ed', 'Is', 'Ro'],
    firstEnd: ['berto', 'rio', 'sé', 'gio', 'niel', 'bén', 'colás', 'zalo', 'blo', 'uardo', 'mael', 'drigo'],
    lastStart: ['Gar', 'Mor', 'Fer', 'Al', 'Ve', 'Cas', 'Ibar', 'Lo', 'Ser', 'Ro', 'Tor', 'Mar'],
    lastEnd: ['ciaga', 'ales', 'nández', 'varo', 'lasco', 'tejón', 'rola', 'zano', 'rano', 'dela', 'rente', 'quina'],
    cityStart: ['Val', 'San', 'Villa', 'Al', 'Tor', 'Ar', 'Mon', 'Pe'],
    cityEnd: ['dorada', 'mirón', 'rreal', 'cantar', 'relobos', 'anda', 'tellano', 'ñarroya'],
    clubPatterns: ['CD {city}', 'Real {city}', 'Atlético {city}', '{city} CF', 'UD {city}', 'Racing {city}'],
  },
  lusophone: {
    firstStart: ['Jo', 'Ro', 'Tia', 'Fa', 'Ru', 'Lu', 'Ca', 'Vi', 'Gil', 'Edu', 'Ma', 'Hen'],
    firstEnd: ['ão', 'dri', 'go', 'bio', 'ben', 'ís', 'io', 'tor', 'son', 'ardo', 'rcelo', 'rique'],
    lastStart: ['Fer', 'Al', 'Mo', 'Pe', 'Car', 'Ri', 'So', 'Ma', 'Bar', 'Teix', 'Ga', 'Lo'],
    lastEnd: ['reira', 'meida', 'rais', 'reira', 'valho', 'beiro', 'ares', 'cedo', 'bosa', 'eiras', 'lvão', 'urenço'],
    cityStart: ['Vila', 'São', 'Porto', 'Ri', 'Mon', 'Al', 'Bar', 'Cas'],
    cityEnd: ['franca', 'tomé', 'vale', 'beira', 'tealto', 'verca', 'reiro', 'telo'],
    clubPatterns: ['SC {city}', 'Desportivo {city}', '{city} FC', 'Atlético {city}', 'União {city}', 'Clube {city}'],
  },
  latam: {
    firstStart: ['Ma', 'Fa', 'Lu', 'San', 'Ger', 'Ni', 'Ju', 'Bri', 'Fran', 'Is', 'Cris', 'Ra'],
    firstEnd: ['tías', 'cundo', 'ciano', 'tiago', 'mán', 'colás', 'lián', 'an', 'co', 'mael', 'tian', 'món'],
    lastStart: ['Go', 'Ace', 'Ri', 'Que', 'Ville', 'Pe', 'Ca', 'Al', 'So', 'Bu', 'Me', 'Ta'],
    lastEnd: ['doy', 'vedo', 'quelme', 'vedo', 'gas', 'ralta', 'brera', 'tamirano', 'sa', 'stos', 'dina', 'pia'],
    cityStart: ['Puerto', 'San', 'Villa', 'Río', 'Mer', 'Las', 'Cor', 'Pa'],
    cityEnd: ['alegre', 'martín', 'nueva', 'claro', 'cedes', 'heras', 'dillera', 'rana'],
    clubPatterns: ['Club {city}', 'Deportivo {city}', 'Atlético {city}', 'Independiente {city}', 'Sportivo {city}', '{city} FC'],
  },
  french: {
    firstStart: ['Ju', 'Ma', 'Ky', 'Ba', 'Lu', 'Ni', 'Ra', 'Thé', 'Yo', 'Clé', 'An', 'Ser'],
    firstEnd: ['lien', 'thieu', 'lian', 'stien', 'cas', 'colas', 'phaël', 'o', 'ann', 'ment', 'toine', 'ge'],
    lastStart: ['Du', 'Le', 'Mo', 'Ber', 'Fon', 'Gi', 'Ro', 'La', 'Mar', 'Che', 'Pe', 'Vau'],
    lastEnd: ['bois', 'roux', 'reau', 'nard', 'taine', 'rard', 'ussel', 'combe', 'chand', 'valier', 'tit', 'trin'],
    cityStart: ['Saint-', 'Mont', 'Beau', 'Val', 'Ro', 'Bel', 'Châ', 'Ver'],
    cityEnd: ['villers', 'mirail', 'lieu', 'brune', 'chefort', 'fort', 'teauroux', 'nières'],
    clubPatterns: ['FC {city}', 'Olympique {city}', 'Stade {city}', 'AS {city}', 'Racing {city}', 'US {city}'],
  },
  germanic: {
    firstStart: ['Lu', 'Jo', 'Fe', 'Ti', 'Ma', 'Le', 'Ni', 'Flo', 'Jan', 'Ke', 'Ste', 'Ro'],
    firstEnd: ['kas', 'nas', 'lix', 'mo', 'ximilian', 'on', 'klas', 'rian', 'nik', 'vin', 'fan', 'bin'],
    lastStart: ['Mül', 'Schmi', 'Wag', 'Ho', 'Kel', 'Brau', 'Zim', 'Hart', 'Lehm', 'Kra', 'Wei', 'Sto'],
    lastEnd: ['ler', 'dtke', 'ner', 'fmann', 'ler', 'nert', 'mermann', 'wig', 'ann', 'use', 'gand', 'ckl'],
    cityStart: ['Ober', 'Nieder', 'Alt', 'Neu', 'Bad ', 'Hoch', 'Stein', 'Wald'],
    cityEnd: ['hausen', 'feld', 'burg', 'stadt', 'bach', 'heim', 'dorf', 'kirchen'],
    clubPatterns: ['FC {city}', 'SV {city}', 'VfB {city}', 'TSV {city}', 'SC {city}', 'Sportfreunde {city}'],
  },
  dutch: {
    firstStart: ['Da', 'Jo', 'Ru', 'Sem', 'Ti', 'Bas', 'Wou', 'Lars', 'Me', 'Pie', 'Ko', 'Ste'],
    firstEnd: ['an', 'ris', 'ud', '', 'jn', 'tiaan', 't', '', 'lvin', 'ter', 'en', 'ijn'],
    lastStart: ['de ', 'van ', 'Bak', 'Jan', 'Vis', 'Smi', 'Mul', 'Dek', 'Bos', 'Kui', 'Ver', 'Hen'],
    lastEnd: ['Vries', 'Dijk', 'ker', 'sen', 'ser', 'ts', 'der', 'ker', 'ma', 'pers', 'meer', 'drix'],
    cityStart: ['Wes', 'Oost', 'Zuid', 'Noord', 'Ber', 'Hel', 'Ro', 'Gro'],
    cityEnd: ['terveld', 'dam', 'hoven', 'wijk', 'gen', 'mond', 'sendaal', 'ningen'],
    clubPatterns: ['FC {city}', 'SV {city}', '{city} Sport', 'VV {city}', 'Go Ahead {city}', 'RKC {city}'],
  },
  nordic: {
    firstStart: ['Mag', 'Ol', 'Erik', 'An', 'Sve', 'Kas', 'Jo', 'Ras', 'Bjør', 'Lin', 'Emi', 'Tor'],
    firstEnd: ['nus', 'e', '', 'ders', 'n', 'per', 'nas', 'mus', 'n', 'us', 'l', 'stein'],
    lastStart: ['Ander', 'Han', 'Ols', 'Lar', 'Niel', 'Jo', 'Pe', 'Berg', 'Lind', 'Hol', 'Sø', 'Dahl'],
    lastEnd: ['sen', 'sen', 'son', 'sen', 'sen', 'hansen', 'tersen', 'strøm', 'qvist', 'm', 'rensen', 'berg'],
    cityStart: ['Fjell', 'Nord', 'Sø', 'Øst', 'Hav', 'Lund', 'Strand', 'Vik'],
    cityEnd: ['by', 'vik', 'borg', 'havn', 'stad', 'holm', 'heim', 'sund'],
    clubPatterns: ['{city} IF', 'IK {city}', '{city} BK', 'FK {city}', '{city} FF', 'IFK {city}'],
  },
  anglo: {
    firstStart: ['Ja', 'Ol', 'Har', 'Tho', 'Wil', 'Ry', 'Cal', 'Lia', 'Ben', 'Jor', 'Mi', 'Con'],
    firstEnd: ['mes', 'iver', 'ry', 'mas', 'liam', 'an', 'lum', 'm', 'jamin', 'dan', 'chael', 'nor'],
    lastStart: ['Ash', 'Brad', 'Car', 'Whit', 'Hol', 'Thorn', 'Black', 'Fair', 'Kings', 'Mar', 'Pen', 'Wood'],
    lastEnd: ['worth', 'ley', 'ter', 'more', 'den', 'ton', 'well', 'brook', 'ford', 'shall', 'rose', 'ward'],
    cityStart: ['Ash', 'Brook', 'Craw', 'East', 'Har', 'Lang', 'Mill', 'Stan'],
    cityEnd: ['field', 'ford', 'ley', 'bury', 'ton', 'chester', 'wick', 'mouth'],
    clubPatterns: ['{city} United', '{city} Town', '{city} City', '{city} Rovers', '{city} Athletic', '{city} Albion'],
  },
  slavic: {
    firstStart: ['Pa', 'To', 'Ja', 'Mi', 'Ka', 'Lu', 'An', 'Ser', 'Vla', 'Dmy', 'Ole', 'Ma'],
    firstEnd: ['vel', 'máš', 'kub', 'chal', 'rol', 'kas', 'drej', 'hiy', 'dimír', 'tro', 'ksandr', 'rek'],
    lastStart: ['Nowa', 'Kowal', 'Dvo', 'Svo', 'Kra', 'Shev', 'Bon', 'Lewa', 'Hor', 'Tka', 'Zie', 'Ma'],
    lastEnd: ['k', 'ski', 'řák', 'boda', 'vets', 'chenko', 'darenko', 'ndowicz', 'ák', 'chuk', 'liński', 'rek'],
    cityStart: ['Nowo', 'Staro', 'Bia', 'Zelen', 'Kras', 'Gor', 'Ostro', 'Vel'],
    cityEnd: ['gród', 'mir', 'łystok', 'ograd', 'nodar', 'ice', 'ava', 'ko'],
    clubPatterns: ['FK {city}', 'Sparta {city}', 'Dynamo {city}', 'Górnik {city}', 'Lokomotyv {city}', 'MFK {city}'],
  },
  balkan: {
    firstStart: ['Lu', 'Iv', 'Mar', 'Jo', 'An', 'Do', 'Ni', 'Fi', 'Ma', 'Bo', 'Ti', 'Ste'],
    firstEnd: ['ka', 'an', 'ko', 'sip', 'te', 'minik', 'kola', 'lip', 'rio', 'rna', 'n', 'pan'],
    lastStart: ['Ko', 'Ba', 'Pe', 'Ju', 'Ma', 'Kne', 'Vu', 'Ra', 'Ba', 'Sa', 'Ho', 'Gr'],
    lastEnd: ['vačić', 'bić', 'rišić', 'rić', 'tić', 'žević', 'ković', 'kitić', 'rać', 'vić', 'rvat', 'bić'],
    cityStart: ['Slav', 'Kar', 'Vara', 'Zad', 'Bje', 'Vin', 'Osi', 'Kri'],
    cityEnd: ['onija', 'lovac', 'ždin', 'ar', 'lovar', 'kovci', 'jek', 'ževci'],
    clubPatterns: ['NK {city}', 'HNK {city}', 'GNK {city}', 'NK Slaven {city}', 'Rudar {city}', 'Lokomotiva {city}'],
  },
  hungarian: {
    firstStart: ['Bá', 'Do', 'Ádá', 'Zsol', 'Ger', 'Lász', 'Ben', 'Mik', 'Ro', 'Ba', 'Kris', 'Dá'],
    firstEnd: ['lint', 'minik', 'm', 't', 'gely', 'ló', 'ce', 'lós', 'land', 'rnabás', 'tóf', 'vid'],
    lastStart: ['Nagy', 'Ková', 'Tó', 'Sza', 'Hor', 'Var', 'Ki', 'Mol', 'Né', 'Fa', 'Pap', 'Lak'],
    lastEnd: ['', 'cs', 'th', 'bó', 'váth', 'ga', 'ss', 'nár', 'meth', 'rkas', 'p', 'atos'],
    cityStart: ['Kis', 'Nagy', 'Szé', 'Ba', 'Ka', 'Tisza', 'Mező', 'Sár'],
    cityEnd: ['várda', 'kanizsa', 'kesfehér', 'ja', 'posvár', 'újváros', 'kövesd', 'vár'],
    clubPatterns: ['{city} FC', '{city} TE', '{city} SE', 'Vasas {city}', '{city} ETO', 'MTK {city}'],
  },
  turkish: {
    firstStart: ['Mer', 'Bu', 'Em', 'Ke', 'Ya', 'Ar', 'Ca', 'Ok', 'Ha', 'Se', 'Tol', 'Ul'],
    firstEnd: ['t', 'rak', 're', 'rem', 'sin', 'da', 'n', 'ay', 'kan', 'lim', 'ga', 'aş'],
    lastStart: ['Yıl', 'Kaya', 'Demir', 'Şa', 'Çe', 'Ay', 'Öz', 'Ar', 'Kurt', 'Do', 'Ak', 'Pol'],
    lastEnd: ['dız', '', 'taş', 'hin', 'lik', 'dın', 'türk', 'slan', 'oğlu', 'ğan', 'soy', 'at'],
    cityStart: ['Kara', 'Ak', 'Bey', 'Göz', 'Kır', 'Yeni', 'Sarı', 'Er'],
    cityEnd: ['deniz', 'hisar', 'şehir', 'tepe', 'kale', 'köy', 'yer', 'zincan'],
    clubPatterns: ['{city}spor', '{city} SK', '{city} Belediyespor', '{city} Gençlik', '{city} FK', '{city} İdmanyurdu'],
  },
  greek: {
    firstStart: ['Gior', 'Kos', 'Di', 'Ni', 'Pa', 'Va', 'Chri', 'Ana', 'Thano', 'Ste', 'Ale', 'Mi'],
    firstEnd: ['gos', 'tas', 'mitris', 'kos', 'nagiotis', 'silis', 'stos', 'stasios', 's', 'lios', 'xis', 'chalis'],
    lastStart: ['Papa', 'Kara', 'Geor', 'Niko', 'Ioan', 'Kon', 'Vla', 'Mak', 'Dimi', 'Ale', 'Sta', 'Pe'],
    lastEnd: ['dopoulos', 'giannis', 'giou', 'laidis', 'nou', 'stantinou', 'chos', 'ris', 'trakis', 'xiou', 'thopoulos', 'tridis'],
    cityStart: ['Ano', 'Kato', 'Neo', 'Pal', 'Agio', 'Kala', 'Mesa', 'Lefko'],
    cityEnd: ['polis', 'chori', 'kastro', 'aio', 's Nikolaos', 'mata', 'longi', 'kada'],
    clubPatterns: ['{city} FC', 'AO {city}', 'PAS {city}', 'Asteras {city}', 'Atromitos {city}', 'Iraklis {city}'],
  },
  arabic: {
    firstStart: ['Mo', 'Ab', 'Fa', 'Sa', 'Kha', 'Ya', 'Ha', 'Na', 'Tu', 'Ma', 'Ba', 'Ra'],
    firstEnd: ['hammed', 'dullah', 'hd', 'lem', 'lid', 'sser', 'tem', 'wwaf', 'rki', 'jed', 'ndar', 'yan'],
    lastStart: ['Al-Qah', 'Al-Ghan', 'Al-Shah', 'Al-Dos', 'Al-Ma', 'Al-Faraj', 'Al-Bu', 'Al-Ha', 'Al-Sha', 'Al-Am', 'Al-Ru', 'Al-Za'],
    lastEnd: ['tani', 'nam', 'rani', 'sari', 'lki', 'i', 'laihi', 'rbi', 'mmari', 'ri', 'waili', 'hrani'],
    cityStart: ['Al-', 'Wadi ', 'Ras ', 'Ain ', 'Jebel ', 'Bir ', 'Dar ', 'Umm '],
    cityEnd: ['Nahda', 'Fajr', 'Qamar', 'Riyah', 'Nour', 'Sahil', 'Wahat', 'Saqr'],
    clubPatterns: ['{city} FC', '{city} Club', 'Ittihad {city}', 'Nadi {city}', 'Shabab {city}', 'Ahli {city}'],
  },
  japanese: {
    firstStart: ['Ta', 'Ken', 'Hi', 'Yu', 'Ka', 'Sho', 'Dai', 'Ri', 'Ko', 'Mi', 'Na', 'So'],
    firstEnd: ['kumi', 'ta', 'roki', 'ki', 'ito', 'ma', 'suke', 'ku', 'ji', 'noru', 'oto', 'ta'],
    lastStart: ['Ta', 'Ya', 'Wata', 'Su', 'Na', 'Ka', 'Mori', 'Ino', 'Sa', 'Hashi', 'Ki', 'Ma'],
    lastEnd: ['naka', 'mamoto', 'nabe', 'zuki', 'kamura', 'tō', 'moto', 'ue', 'saki', 'guchi', 'mura', 'tsuda'],
    cityStart: ['Kita', 'Minami', 'Higashi', 'Nishi', 'Shin', 'Ō', 'Taka', 'Kawa'],
    cityEnd: ['yama', 'hama', 'zaki', 'shima', 'oka', 'mura', 'saki', 'gawa'],
    clubPatterns: ['{city} FC', '{city} United', 'Sports Club {city}', '{city} SC', 'FC {city}', '{city} Athletic'],
  },
  korean: {
    firstStart: ['Min', 'Ji', 'Seung', 'Hyun', 'Dong', 'Jae', 'Sung', 'Woo', 'Tae', 'Young', 'Joon', 'Ho'],
    firstEnd: ['-jun', '-hoon', '-woo', '-soo', '-hyun', '-min', '-ho', '-jin', '-yang', '-gwon', '-seo', '-bin'],
    lastStart: ['K', 'L', 'P', 'Ch', 'J', 'Y', 'H', 'S', 'Ky', 'Ry', 'B', 'Hw'],
    lastEnd: ['im', 'ee', 'ark', 'oi', 'ung', 'oon', 'an', 'eo', 'eong', 'u', 'ae', 'ang'],
    cityStart: ['Cheong', 'Gang', 'Dae', 'Gwang', 'Sang', 'Ul', 'Su', 'Pyeong'],
    cityEnd: ['ju', 'won', 'gu', 'san', 'nam', 'do', 'cheon', 'taek'],
    clubPatterns: ['{city} FC', '{city} United', '{city} Citizen', '{city} Hyundai', 'Sangmu {city}', '{city} Sports'],
  },
};

export const CLUB_COLORS = [
  '#c8102e', '#003399', '#ffffff', '#000000', '#008f39', '#ffd100', '#6c1d45', '#0099da',
  '#f26f21', '#4b2e83', '#7a0019', '#00a0e1', '#006341', '#1d428a', '#e4002b', '#8b6914',
];
