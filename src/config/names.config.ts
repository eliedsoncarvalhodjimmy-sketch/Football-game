// Syllable pools for INVENTED person names (test data only). Names combine syllables so they
// sound regional without copying real people.

import type { NameRegion } from '../engine/types';

export interface NamePool {
  firstStart: string[];
  firstEnd: string[];
  lastStart: string[];
  lastEnd: string[];
}

export const NAME_POOLS: Record<NameRegion, NamePool> = {
  anglo: {
    firstStart: ['Ja', 'Ol', 'Har', 'Tho', 'Wil', 'Ry', 'Cal', 'Lia', 'Ben', 'Jor', 'Mi', 'Con'],
    firstEnd: ['mes', 'iver', 'ry', 'mas', 'liam', 'an', 'lum', 'm', 'jamin', 'dan', 'chael', 'nor'],
    lastStart: ['Ash', 'Brad', 'Car', 'Whit', 'Hol', 'Thorn', 'Black', 'Fair', 'Kings', 'Mar', 'Pen', 'Wood'],
    lastEnd: ['worth', 'ley', 'ter', 'more', 'den', 'ton', 'well', 'brook', 'ford', 'shall', 'rose', 'ward'],
  },
  arabic: {
    firstStart: ['Mo', 'Ab', 'Fa', 'Sa', 'Kha', 'Ya', 'Ha', 'Na', 'Tu', 'Ma', 'Ba', 'Ra'],
    firstEnd: ['hammed', 'dullah', 'hd', 'lem', 'lid', 'sser', 'tem', 'wwaf', 'rki', 'jed', 'ndar', 'yan'],
    lastStart: ['Al-Qah', 'Al-Ghan', 'Al-Shah', 'Al-Dos', 'Al-Ma', 'Al-Faraj', 'Al-Bu', 'Al-Ha', 'Al-Sha', 'Al-Am', 'Al-Ru', 'Al-Za'],
    lastEnd: ['tani', 'nam', 'rani', 'sari', 'lki', 'i', 'laihi', 'rbi', 'mmari', 'ri', 'waili', 'hrani'],
  },
  balkan: {
    firstStart: ['Lu', 'Iv', 'Mar', 'Jo', 'An', 'Do', 'Ni', 'Fi', 'Ma', 'Bo', 'Ti', 'Ste'],
    firstEnd: ['ka', 'an', 'ko', 'sip', 'te', 'minik', 'kola', 'lip', 'rio', 'rna', 'n', 'pan'],
    lastStart: ['Ko', 'Ba', 'Pe', 'Ju', 'Ma', 'Kne', 'Vu', 'Ra', 'Ba', 'Sa', 'Ho', 'Gr'],
    lastEnd: ['vačić', 'bić', 'rišić', 'rić', 'tić', 'žević', 'ković', 'kitić', 'rać', 'vić', 'rvat', 'bić'],
  },
  baltic: {
    firstStart: ['Kris', 'Mar', 'Edg', 'Lau', 'Ai', 'Ra', 'Ja', 'Tom', 'Ar', 'Val', 'Do', 'Ri'],
    firstEnd: ['tjan', 'tins', 'ars', 'ris', 'vars', 'imond', 'nis', 'as', 'tūras', 'dis', 'vydas', 'hards'],
    lastStart: ['Kalni', 'Ozo', 'Bēr', 'Tam', 'Pe', 'Kaz', 'Jan', 'Pau', 'Vaš', 'Mil', 'Lau', 'Sau'],
    lastEnd: ['ņš', 'liņš', 'ziņš', 'm', 'tr', 'lauskas', 'kauskas', 'lauskas', 'kys', 'kus', 'rinaitis', 'lius'],
  },
  basque: {
    firstStart: ['I', 'Ai', 'Mi', 'Jo', 'Ga', 'Un', 'Be', 'Ur', 'Ander', 'Jon', 'Ei', 'Xa'],
    firstEnd: ['ñaki', 'tor', 'kel', 'seba', 'izka', 'ai', 'ñat', 'tzi', 'oni', 'an', 'ker', 'bi'],
    lastStart: ['Etxe', 'Goi', 'Ur', 'Larra', 'Zubi', 'Agi', 'Iturr', 'Men', 'Bere', 'Ola', 'Azpi', 'Lizar'],
    lastEnd: ['berria', 'koetxea', 'ibe', 'ñaga', 'zarreta', 'rre', 'alde', 'dizabal', 'ziartu', 'ño', 'litxeta', 'raga'],
  },
  caribbean: {
    firstStart: ['Shaq', 'De', 'Ja', 'Tre', 'Ke', 'Ra', 'Mar', 'Dar', 'Jer', 'Ty', 'Kev', 'Le'],
    firstEnd: ['uille', 'shawn', 'lon', 'vor', 'ndrick', 'shaun', 'lon', 'nell', 'maine', 'rone', 'in', 'roy'],
    lastStart: ['Wil', 'Bro', 'Jo', 'Cam', 'Gor', 'Bai', 'Ri', 'Mit', 'Ste', 'Clar', 'Gra', 'Ro'],
    lastEnd: ['liams', 'wne', 'hnson', 'pbell', 'don', 'ley', 'chards', 'chell', 'wart', 'ke', 'nt', 'binson'],
  },
  catalan: {
    firstStart: ['Jor', 'Pau', 'Mar', 'Ori', 'Arn', 'Ber', 'Xa', 'Ge', 'Jo', 'Ser', 'Al', 'Ri'],
    firstEnd: ['di', 'u', 'c', 'ol', 'au', 'nat', 'vi', 'rard', 'an', 'gi', 'bert', 'card'],
    lastStart: ['Pu', 'Ca', 'Fe', 'Vi', 'Ro', 'So', 'Ser', 'Ba', 'Gi', 'Ma', 'Ri', 'Ta'],
    lastEnd: ['jol', 'sals', 'rrer', 'lalta', 'vira', 'ler', 'ra', 'lló', 'ralt', 'sip', 'ba', 'rragó'],
  },
  caucasian: {
    firstStart: ['Gior', 'Le', 'Ni', 'Ar', 'Da', 'Lu', 'Va', 'Kha', 'Ra', 'Za', 'Sa', 'To'],
    firstEnd: ['gi', 'van', 'ka', 'tem', 'vit', 'ka', 'kho', 'tang', 'mil', 'ur', 'ba', 'rnike'],
    lastStart: ['Kva', 'Be', 'Ab', 'Mi', 'Ka', 'Gog', 'Ta', 'Sa', 'Ar', 'Ha', 'Pe', 'Mkh'],
    lastEnd: ['radze', 'ridze', 'ashidze', 'kheil', 'zaryan', 'ichaishvili', 'tarashvili', 'rkisyan', 'zumanyan', 'kobyan', 'trosyan', 'itaryan'],
  },
  centralasian: {
    firstStart: ['Ti', 'Nur', 'Ru', 'Ba', 'Er', 'Al', 'Az', 'Da', 'Ser', 'Ja', 'Ul', 'Ba'],
    firstEnd: ['mur', 'lan', 'stam', 'ur', 'zhan', 'isher', 'amat', 'ulet', 'ik', 'sur', 'an', 'ktiyar'],
    lastStart: ['Abdu', 'Kari', 'Nur', 'Tok', 'Ism', 'Sar', 'Akh', 'Zhu', 'Bek', 'Kur', 'Usm', 'Mur'],
    lastEnd: ['llaev', 'mov', 'lanov', 'tarov', 'ailov', 'sen', 'medov', 'sup', 'ov', 'banov', 'anov', 'adov'],
  },
  chinese: {
    firstStart: ['Wei', 'Jia', 'Hao', 'Zhi', 'Yu', 'Xin', 'Jun', 'Ming', 'Tian', 'Chen', 'Long', 'Kai'],
    firstEnd: ['ming', 'hao', 'yu', 'qiang', 'feng', 'jie', 'lin', 'wen', 'hui', 'yang', 'bo', 'xuan'],
    lastStart: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu', 'Xu', 'Sun'],
    lastEnd: [''],
  },
  dutch: {
    firstStart: ['Da', 'Jo', 'Ru', 'Sem', 'Ti', 'Bas', 'Wou', 'Lars', 'Me', 'Pie', 'Ko', 'Ste'],
    firstEnd: ['an', 'ris', 'ud', '', 'jn', 'tiaan', 't', '', 'lvin', 'ter', 'en', 'ijn'],
    lastStart: ['de ', 'van ', 'Bak', 'Jan', 'Vis', 'Smi', 'Mul', 'Dek', 'Bos', 'Kui', 'Ver', 'Hen'],
    lastEnd: ['Vries', 'Dijk', 'ker', 'sen', 'ser', 'ts', 'der', 'ker', 'ma', 'pers', 'meer', 'drix'],
  },
  eastafrican: {
    firstStart: ['Ba', 'Ke', 'Wa', 'Mu', 'Ha', 'Ji', 'Ki', 'Da', 'Ab', 'Mi', 'Ota', 'Jo'],
    firstEnd: ['raka', 'nny', 'njiru', 'gisha', 'ssan', 'ma', 'prono', 'udi', 'diel', 'chael', 'ieno', 'seph'],
    lastStart: ['Odh', 'Kip', 'Mwa', 'Ki', 'Was', 'Ha', 'Mu', 'Ab', 'Bek', 'Nya', 'Ot', 'Gi'],
    lastEnd: ['iambo', 'chumba', 'ngi', 'bet', 'swa', 'ssan', 'tua', 'ebe', 'ele', 'ngo', 'ieno', 'thinji'],
  },
  french: {
    firstStart: ['Ju', 'Ma', 'Ky', 'Ba', 'Lu', 'Ni', 'Ra', 'Thé', 'Yo', 'Clé', 'An', 'Ser'],
    firstEnd: ['lien', 'thieu', 'lian', 'stien', 'cas', 'colas', 'phaël', 'o', 'ann', 'ment', 'toine', 'ge'],
    lastStart: ['Du', 'Le', 'Mo', 'Ber', 'Fon', 'Gi', 'Ro', 'La', 'Mar', 'Che', 'Pe', 'Vau'],
    lastEnd: ['bois', 'roux', 'reau', 'nard', 'taine', 'rard', 'ussel', 'combe', 'chand', 'valier', 'tit', 'trin'],
  },
  germanic: {
    firstStart: ['Lu', 'Jo', 'Fe', 'Ti', 'Ma', 'Le', 'Ni', 'Flo', 'Jan', 'Ke', 'Ste', 'Ro'],
    firstEnd: ['kas', 'nas', 'lix', 'mo', 'ximilian', 'on', 'klas', 'rian', 'nik', 'vin', 'fan', 'bin'],
    lastStart: ['Mül', 'Schmi', 'Wag', 'Ho', 'Kel', 'Brau', 'Zim', 'Hart', 'Lehm', 'Kra', 'Wei', 'Sto'],
    lastEnd: ['ler', 'dtke', 'ner', 'fmann', 'ler', 'nert', 'mermann', 'wig', 'ann', 'use', 'gand', 'ckl'],
  },
  greek: {
    firstStart: ['Gior', 'Kos', 'Di', 'Ni', 'Pa', 'Va', 'Chri', 'Ana', 'Thano', 'Ste', 'Ale', 'Mi'],
    firstEnd: ['gos', 'tas', 'mitris', 'kos', 'nagiotis', 'silis', 'stos', 'stasios', 's', 'lios', 'xis', 'chalis'],
    lastStart: ['Papa', 'Kara', 'Geor', 'Niko', 'Ioan', 'Kon', 'Vla', 'Mak', 'Dimi', 'Ale', 'Sta', 'Pe'],
    lastEnd: ['dopoulos', 'giannis', 'giou', 'laidis', 'nou', 'stantinou', 'chos', 'ris', 'trakis', 'xiou', 'thopoulos', 'tridis'],
  },
  hebrew: {
    firstStart: ['Yo', 'Ei', 'Ma', 'Ro', 'Da', 'Ya', 'Ga', 'Ita', 'Shi', 'Ne', 'Ta', 'Or'],
    firstEnd: ['av', 'tan', 'or', 'ni', 'vid', 'ir', 'l', 'y', 'mon', 'ta', 'l', 'en'],
    lastStart: ['Co', 'Le', 'Mi', 'Pe', 'Fried', 'Ben', 'Ka', 'Sha', 'Bi', 'Ash', 'Ga', 'Az'],
    lastEnd: ['hen', 'vi', 'zrahi', 'retz', 'man', 'David', 'tz', 'pira', 'ton', 'kenazi', 'bai', 'ulay'],
  },
  hungarian: {
    firstStart: ['Bá', 'Do', 'Ádá', 'Zsol', 'Ger', 'Lász', 'Ben', 'Mik', 'Ro', 'Ba', 'Kris', 'Dá'],
    firstEnd: ['lint', 'minik', 'm', 't', 'gely', 'ló', 'ce', 'lós', 'land', 'rnabás', 'tóf', 'vid'],
    lastStart: ['Nagy', 'Ková', 'Tó', 'Sza', 'Hor', 'Var', 'Ki', 'Mol', 'Né', 'Fa', 'Pap', 'Lak'],
    lastEnd: ['', 'cs', 'th', 'bó', 'váth', 'ga', 'ss', 'nár', 'meth', 'rkas', 'p', 'atos'],
  },
  iberian: {
    firstStart: ['Al', 'Ma', 'Jo', 'Ser', 'Da', 'Ru', 'Ni', 'Gon', 'Pa', 'Ed', 'Is', 'Ro'],
    firstEnd: ['berto', 'rio', 'sé', 'gio', 'niel', 'bén', 'colás', 'zalo', 'blo', 'uardo', 'mael', 'drigo'],
    lastStart: ['Gar', 'Mor', 'Fer', 'Al', 'Ve', 'Cas', 'Ibar', 'Lo', 'Ser', 'Ro', 'Tor', 'Mar'],
    lastEnd: ['ciaga', 'ales', 'nández', 'varo', 'lasco', 'tejón', 'rola', 'zano', 'rano', 'dela', 'rente', 'quina'],
  },
  italian: {
    firstStart: ['Lo', 'Ma', 'Fe', 'Gian', 'Ales', 'Fran', 'Da', 'Ste', 'Ric', 'Mat', 'Ni', 'Tom'],
    firstEnd: ['renzo', 'rco', 'derico', 'luca', 'sandro', 'cesco', 'vide', 'fano', 'cardo', 'teo', 'cola', 'maso'],
    lastStart: ['Ros', 'Bian', 'Fer', 'Espo', 'Ro', 'Ric', 'Co', 'Bru', 'Gal', 'Con', 'Mar', 'De'],
    lastEnd: ['si', 'chi', 'rari', 'sito', 'mano', 'ci', 'lombo', 'no', 'lo', 'ti', 'chetti', 'Luca'],
  },
  japanese: {
    firstStart: ['Ta', 'Ken', 'Hi', 'Yu', 'Ka', 'Sho', 'Dai', 'Ri', 'Ko', 'Mi', 'Na', 'So'],
    firstEnd: ['kumi', 'ta', 'roki', 'ki', 'ito', 'ma', 'suke', 'ku', 'ji', 'noru', 'oto', 'ta'],
    lastStart: ['Ta', 'Ya', 'Wata', 'Su', 'Na', 'Ka', 'Mori', 'Ino', 'Sa', 'Hashi', 'Ki', 'Ma'],
    lastEnd: ['naka', 'mamoto', 'nabe', 'zuki', 'kamura', 'tō', 'moto', 'ue', 'saki', 'guchi', 'mura', 'tsuda'],
  },
  korean: {
    firstStart: ['Min', 'Ji', 'Seung', 'Hyun', 'Dong', 'Jae', 'Sung', 'Woo', 'Tae', 'Young', 'Joon', 'Ho'],
    firstEnd: ['-jun', '-hoon', '-woo', '-soo', '-hyun', '-min', '-ho', '-jin', '-yang', '-gwon', '-seo', '-bin'],
    lastStart: ['K', 'L', 'P', 'Ch', 'J', 'Y', 'H', 'S', 'Ky', 'Ry', 'B', 'Hw'],
    lastEnd: ['im', 'ee', 'ark', 'oi', 'ung', 'oon', 'an', 'eo', 'eong', 'u', 'ae', 'ang'],
  },
  latam: {
    firstStart: ['Ma', 'Fa', 'Lu', 'San', 'Ger', 'Ni', 'Ju', 'Bri', 'Fran', 'Is', 'Cris', 'Ra'],
    firstEnd: ['tías', 'cundo', 'ciano', 'tiago', 'mán', 'colás', 'lián', 'an', 'co', 'mael', 'tian', 'món'],
    lastStart: ['Go', 'Ace', 'Ri', 'Que', 'Ville', 'Pe', 'Ca', 'Al', 'So', 'Bu', 'Me', 'Ta'],
    lastEnd: ['doy', 'vedo', 'quelme', 'vedo', 'gas', 'ralta', 'brera', 'tamirano', 'sa', 'stos', 'dina', 'pia'],
  },
  lusophone: {
    firstStart: ['Jo', 'Ro', 'Tia', 'Fa', 'Ru', 'Lu', 'Ca', 'Vi', 'Gil', 'Edu', 'Ma', 'Hen'],
    firstEnd: ['ão', 'dri', 'go', 'bio', 'ben', 'ís', 'io', 'tor', 'son', 'ardo', 'rcelo', 'rique'],
    lastStart: ['Fer', 'Al', 'Mo', 'Pe', 'Car', 'Ri', 'So', 'Ma', 'Bar', 'Teix', 'Ga', 'Lo'],
    lastEnd: ['reira', 'meida', 'rais', 'reira', 'valho', 'beiro', 'ares', 'cedo', 'bosa', 'eiras', 'lvão', 'urenço'],
  },
  nordic: {
    firstStart: ['Mag', 'Ol', 'Erik', 'An', 'Sve', 'Kas', 'Jo', 'Ras', 'Bjør', 'Lin', 'Emi', 'Tor'],
    firstEnd: ['nus', 'e', '', 'ders', 'n', 'per', 'nas', 'mus', 'n', 'us', 'l', 'stein'],
    lastStart: ['Ander', 'Han', 'Ols', 'Lar', 'Niel', 'Jo', 'Pe', 'Berg', 'Lind', 'Hol', 'Sø', 'Dahl'],
    lastEnd: ['sen', 'sen', 'son', 'sen', 'sen', 'hansen', 'tersen', 'strøm', 'qvist', 'm', 'rensen', 'berg'],
  },
  pacific: {
    firstStart: ['Ta', 'Ma', 'Lo', 'Ti', 'Se', 'Pe', 'Ra', 'Mo', 'Ko', 'Na', 'Fe', 'Vi'],
    firstEnd: ['nielu', 'ika', 'tu', 'mote', 'ru', 'ni', 'lu', 'ana', 'fi', 'kai', 'tu', 'liami'],
    lastStart: ['Tu', 'Le', 'Ka', 'Fa', 'Ma', 'Va', 'Ta', 'To', 'Ne', 'Ta', 'Sa', 'Pe'],
    lastEnd: ['ilagi', 'ota', 'lou', 'atau', 'ea', 'i', 'ufa', 'ga', 'lua', 'mua', 'ili', 'ni'],
  },
  persian: {
    firstStart: ['Me', 'Ali', 'Re', 'Sa', 'Ka', 'Ar', 'Mo', 'Da', 'Fa', 'Ho', 'Na', 'Om'],
    firstEnd: ['hdi', 'reza', 'za', 'eed', 'veh', 'ash', 'hsen', 'riush', 'rhad', 'ssein', 'vid', 'id'],
    lastStart: ['Ah', 'Ka', 'Ho', 'Re', 'Mo', 'Ja', 'Sa', 'Ta', 'He', 'Ra', 'Az', 'Ba'],
    lastEnd: ['madi', 'rimi', 'sseini', 'zaei', 'radi', 'hani', 'deghi', 'heri', 'dari', 'himi', 'izi', 'gheri'],
  },
  romanian: {
    firstStart: ['An', 'Ra', 'Io', 'Vla', 'Ste', 'Ma', 'Cris', 'Al', 'Ra', 'Do', 'Cos', 'Mi'],
    firstEnd: ['drei', 'du', 'nuț', 'd', 'fan', 'rius', 'tian', 'exandru', 'zvan', 'rin', 'min', 'hai'],
    lastStart: ['Po', 'Io', 'Con', 'Ste', 'Ra', 'Dum', 'Mun', 'Sto', 'Ene', 'Pa', 'Mar', 'Lu'],
    lastEnd: ['pescu', 'nescu', 'stantin', 'fan', 'du', 'itrescu', 'teanu', 'ica', 'scu', 'vel', 'in', 'pu'],
  },
  seasian: {
    firstStart: ['Ngu', 'Tha', 'Ari', 'Bu', 'Pha', 'Som', 'De', 'Ri', 'Fa', 'Har', 'Ka', 'Wi'],
    firstEnd: ['yen', 'nh', 'fin', 'di', 'kin', 'chai', 'wa', 'zal', 'ris', 'yo', 'tut', 'rat'],
    lastStart: ['Ngu', 'Tran', 'Sri', 'Sant', 'Wong', 'Pras', 'Kus', 'Hart', 'Ram', 'Bin', 'Des', 'Pha'],
    lastEnd: ['yen', 'oso', 'wong', 'osa', 'sak', 'etyo', 'uma', 'ono', 'os', 'tos', 'mi', 'm'],
  },
  slavic: {
    firstStart: ['Pa', 'To', 'Ja', 'Mi', 'Ka', 'Lu', 'An', 'Ser', 'Vla', 'Dmy', 'Ole', 'Ma'],
    firstEnd: ['vel', 'máš', 'kub', 'chal', 'rol', 'kas', 'drej', 'hiy', 'dimír', 'tro', 'ksandr', 'rek'],
    lastStart: ['Nowa', 'Kowal', 'Dvo', 'Svo', 'Kra', 'Shev', 'Bon', 'Lewa', 'Hor', 'Tka', 'Zie', 'Ma'],
    lastEnd: ['k', 'ski', 'řák', 'boda', 'vets', 'chenko', 'darenko', 'ndowicz', 'ák', 'chuk', 'liński', 'rek'],
  },
  southasian: {
    firstStart: ['Ar', 'Ra', 'Su', 'Vi', 'Ab', 'Ha', 'Ma', 'Sa', 'Ka', 'Im', 'Fa', 'Ro'],
    firstEnd: ['jun', 'hul', 'nil', 'kram', 'dul', 'mid', 'nish', 'chin', 'ran', 'ran', 'rhan', 'hit'],
    lastStart: ['Sha', 'Ku', 'Si', 'Pa', 'Kha', 'Cho', 'Gup', 'Ra', 'Mi', 'Hu', 'Iq', 'Ah'],
    lastEnd: ['rma', 'mar', 'ngh', 'tel', 'n', 'udhary', 'ta', 'o', 'shra', 'ssain', 'bal', 'med'],
  },
  southernafrican: {
    firstStart: ['Tha', 'Si', 'Bon', 'Lu', 'Ka', 'Ma', 'Te', 'Sfi', 'Mpho', 'Kag', 'Ta', 'Ze'],
    firstEnd: ['bo', 'pho', 'gani', 'thando', 'belo', 'landa', 'boho', 'so', 'lo', 'iso', 'nda', 'ko'],
    lastStart: ['Mo', 'Nko', 'Dla', 'Ma', 'Nde', 'Zu', 'Ma', 'Si', 'Mot', 'Ban', 'Ph', 'Ch'],
    lastEnd: ['kena', 'si', 'mini', 'thebula', 'vu', 'ma', 'bena', 'thole', 'sepe', 'da', 'iri', 'anda'],
  },
  turkish: {
    firstStart: ['Mer', 'Bu', 'Em', 'Ke', 'Ya', 'Ar', 'Ca', 'Ok', 'Ha', 'Se', 'Tol', 'Ul'],
    firstEnd: ['t', 'rak', 're', 'rem', 'sin', 'da', 'n', 'ay', 'kan', 'lim', 'ga', 'aş'],
    lastStart: ['Yıl', 'Kaya', 'Demir', 'Şa', 'Çe', 'Ay', 'Öz', 'Ar', 'Kurt', 'Do', 'Ak', 'Pol'],
    lastEnd: ['dız', '', 'taş', 'hin', 'lik', 'dın', 'türk', 'slan', 'oğlu', 'ğan', 'soy', 'at'],
  },
  westafrican: {
    firstStart: ['Ib', 'Mou', 'Ous', 'Ma', 'Kof', 'Seyd', 'Ab', 'Che', 'Yao', 'Ko', 'Ama', 'Ba'],
    firstEnd: ['rahim', 'ssa', 'mane', 'madou', 'fi', 'ou', 'doulaye', 'ikh', 'kouamé', 'ffi', 'dou', 'kary'],
    lastStart: ['Dia', 'Tra', 'Kou', 'Cou', 'Kei', 'Ma', 'Ba', 'Ou', 'A', 'Ok', 'Ade', 'Ba'],
    lastEnd: ['llo', 'oré', 'yaté', 'libaly', 'ta', 'né', 'ldé', 'attara', 'do', 'afor', 'yemi', 'mba'],
  },
};

export const TEAM_COLORS = [
  '#c8102e', '#003399', '#ffffff', '#000000', '#008f39', '#ffd100', '#6c1d45', '#0099da',
  '#f26f21', '#4b2e83', '#7a0019', '#00a0e1', '#006341', '#1d428a', '#e4002b', '#8b6914',
];
