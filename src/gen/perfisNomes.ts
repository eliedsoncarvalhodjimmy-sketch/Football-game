// Perfis de nomes fictícios por país. Cada perfil junta sílabas para criar
// cidades inventadas e padrões de nome de clube ({C} = cidade).
// Os nomes são de TESTE: plausíveis, mas não correspondem a clubes reais.
// Uma lista de bloqueio evita cidades reais conhecidas; colisões com
// localidades pequenas são possíveis e aceites (os clubes ficam marcados "teste").

export interface PerfilNomes {
  ini: string[];
  fim: string[];
  /** Sílabas do meio, usadas às vezes para nomes mais longos. */
  meio?: string[];
  padroes: [string, number][];
  /** Nome genérico do estádio ({C} = cidade). */
  estadio: string[];
  bloqueio?: string[];
}

const P: Record<string, PerfilNomes> = {
  en: {
    ini: ['Ash', 'Brack', 'Carn', 'Dun', 'Elver', 'Fal', 'Grim', 'Hather', 'Kell', 'Lang', 'Mor', 'Nether', 'Oak', 'Pen', 'Rad', 'Shel', 'Thorn', 'Wex', 'Whit', 'Yar', 'Brom', 'Cal', 'Dray', 'Evers', 'Hollin', 'Stour', 'Marl', 'Quen'],
    meio: ['ing', 'er', 'en', 'mer'],
    fim: ['ford', 'ton', 'bury', 'ham', 'field', 'wick', 'port', 'by', 'mouth', 'ley', 'stead', 'bridge', 'worth', 'combe', 'dale', 'minster', 'hurst', 'cester', 'mere', 'holt'],
    padroes: [['{C} United', 4], ['{C} Town', 5], ['{C} City', 4], ['{C} Rovers', 2], ['{C} Athletic', 2], ['{C} Albion', 1], ['{C} Wanderers', 1], ['{C} Borough', 1], ['{C} County', 1], ['AFC {C}', 1], ['{C} Rangers', 1]],
    estadio: ['{C} Park', '{C} Road', 'The {C} Ground', '{C} Lane'],
    bloqueio: ['Ashford', 'Ashton', 'Ashby', 'Ashley', 'Brackley', 'Bromley', 'Falmouth', 'Whitby', 'Whitley', 'Whitton', 'Wexford', 'Radford', 'Thornbury', 'Thornton', 'Oakley', 'Oakham', 'Morley', 'Langley', 'Langford', 'Calbury', 'Dunham', 'Brompton', 'Grimsby', 'Marlow', 'Marlborough', 'Penworth', 'Stourbridge', 'Stourport', 'Dunstable', 'Carnforth'],
  },
  sc: {
    ini: ['Ard', 'Bal', 'Craig', 'Dal', 'Inver', 'Kil', 'Loch', 'Strath', 'Glen', 'Auch', 'Kin', 'Tor', 'Dun', 'Ben'],
    fim: ['more', 'lochy', 'ness', 'ie', 'arn', 'muir', 'cairn', 'wick', 'brae', 'haven', 'gowan', 'lin'],
    padroes: [['{C}', 3], ['{C} Athletic', 2], ['{C} Thistle', 2], ['{C} United', 2], ['{C} Academicals', 1], ['{C} Rovers', 1]],
    estadio: ['{C} Park', '{C} Brae', 'Firhill Road'],
    bloqueio: ['Inverness', 'Dunmore', 'Kilmore', 'Dalmuir', 'Glenmore', 'Strathmore', 'Kinross', 'Dunlin', 'Ardmore', 'Balmore'],
  },
  us: {
    ini: ['Cedar', 'Silver', 'Red', 'Iron', 'Lake', 'Prairie', 'Granite', 'Harbor', 'Copper', 'Bay', 'Pine', 'Summit', 'River', 'Sun', 'Maple', 'Stone', 'Falcon', 'Eagle'],
    fim: [' Ridge', ' Falls', ' Point', ' Springs', ' Valley', 'ton', ' Harbor', ' Bluff', ' Creek', ' Heights', 'ville', ' Rock'],
    padroes: [['{C} FC', 4], ['{C} SC', 2], ['{C} United', 2], ['Real {C}', 1], ['{C} City SC', 1], ['Athletic {C}', 1]],
    estadio: ['{C} Stadium', '{C} Park', 'Field of {C}'],
    bloqueio: ['Cedar Rapids', 'Silver Spring', 'Red Bank', 'Iron Mountain', 'Silverton', 'Stoneville', 'Pineville', 'Mapleton', 'Summitville', 'Sun Valley', 'Cedar Falls', 'Bay Point', 'Stone Mountain', 'Red Rock', 'Eagle Rock', 'Copper Harbor', 'Granite Falls'],
  },
  es: {
    ini: ['Alba', 'Bena', 'Cala', 'Torre', 'Villa', 'Mon', 'Pera', 'Sala', 'Val', 'Mira', 'Olme', 'Ribe', 'Alcor', 'Cerve', 'Fuen', 'Lore', 'Tarra', 'Hino', 'Gual', 'Zara'],
    fim: ['monte', 'rrada', 'vega', 'jares', 'llosa', 'cedo', 'nares', 'drón', 'tejo', 'riza', 'lmar', 'sierra', 'rejo', 'nueva', 'dosa', 'mbre'],
    padroes: [['Real {C}', 2], ['{C} CF', 4], ['CD {C}', 3], ['UD {C}', 3], ['Atlético {C}', 2], ['SD {C}', 2], ['Racing {C}', 1], ['Deportivo {C}', 1], ['CF {C}', 1]],
    estadio: ['Estadio de {C}', 'Campo Municipal de {C}', 'Estadio Nuevo {C}'],
    bloqueio: ['Albacete', 'Villanueva', 'Torrevega', 'Monterrada', 'Valdemoro', 'Miranda', 'Salamanca', 'Fuenlabrada', 'Valverde', 'Torremolinos', 'Villarreal', 'Montejo'],
  },
  es_am: {
    ini: ['Puerto ', 'Villa ', 'Río ', 'Cerro ', 'Valle ', 'Monte ', 'Llano ', 'Paso ', 'Loma '],
    meio: [],
    fim: ['Alameda', 'Esperanza', 'Floresta', 'Quebrada', 'Arenal', 'Cumbre', 'Portillo', 'Lucero', 'Soledad', 'Mirador', 'Corral', 'Tablada', 'Ceibal', 'Palmar', 'Aguada', 'Rosario Alto'],
    padroes: [['Club {C}', 3], ['Deportivo {C}', 3], ['Atlético {C}', 3], ['{C} FC', 2], ['Unión {C}', 2], ['Sporting {C}', 1], ['Independiente {C}', 1], ['Real {C}', 1], ['Juventud {C}', 1]],
    estadio: ['Estadio {C}', 'Estadio Municipal de {C}', 'Coliseo {C}'],
    bloqueio: ['San Lorenzo', 'Santa Fe', 'Puerto Montt', 'Villa Nueva', 'Monte Alto', 'Río Cuarto', 'Santa Rosa'],
  },
  ar: {
    ini: ['Villa ', 'General ', 'Coronel ', 'Barrio ', 'Puerto ', 'Colonia ', 'Paso '],
    fim: ['Arroyito', 'Pinares', 'Tala', 'Chañares', 'Ombúes', 'Moreira', 'Pradera', 'Quintana', 'Lagunita', 'Alamos', 'Sauces', 'Ceibos', 'Bellavista', 'Toscas'],
    padroes: [['Club Atlético {C}', 3], ['Sportivo {C}', 2], ['Deportivo {C}', 2], ['Juventud {C}', 1], ['Unión de {C}', 2], ['Ferro {C}', 1], ['Social {C}', 1], ['Talleres de {C}', 1]],
    estadio: ['Estadio {C}', 'Cancha de {C}'],
    bloqueio: ['Los Andes', 'San Martín', 'Villa Dálmine', 'General Paz', 'Los Ceibos'],
  },
  pt: {
    ini: ['Vila ', 'Torre ', 'Ponte ', 'Póvoa ', 'Quinta ', 'Serra ', 'Barca ', 'Azenha ', 'Casal ', 'Lugar '],
    fim: ['da Ribeira', 'do Outeiro', 'de Alvarim', 'das Lajes', 'do Souto', 'de Marvila', 'da Lagoa', 'do Vale', 'de Carvide', 'da Fonteira', 'de Rebordelo', 'do Freixo', 'da Corga', 'do Penedo'],
    padroes: [['Sporting Clube de {C}', 2], ['Clube Desportivo de {C}', 3], ['União de {C}', 2], ['Futebol Clube de {C}', 3], ['Atlético de {C}', 1], ['Grupo Desportivo de {C}', 2], ['Académico de {C}', 1]],
    estadio: ['Estádio Municipal de {C}', 'Estádio de {C}', 'Campo de {C}'],
    bloqueio: ['Vila do Conde', 'Póvoa de Varzim', 'Ponte da Barca', 'Torre de Moncorvo', 'São João da Madeira'],
  },
  br: {
    ini: ['Barra', 'Campo', 'Rio', 'Porto', 'Serra', 'Lagoa', 'Ribeirão', 'Arraial', 'Vale', 'Morro', 'Vila', 'Pouso'],
    fim: [' do Ipê', ' das Palmeiras', ' do Jatobá', ' do Cajueiro', ' do Buriti', ' das Pedras', ' do Pequi', ' da Aroeira', ' do Sertão', ' dos Ventos', ' das Garças', ' do Cedro', ' da Cascata', ' do Angico', ' das Araras'],
    padroes: [['Esporte Clube {C}', 3], ['{C} Futebol Clube', 3], ['Atlético {C}', 2], ['Sociedade Esportiva {C}', 1], ['Clube Atlético {C}', 2], ['Grêmio {C}', 1], ['Associação {C}', 1], ['América de {C}', 1]],
    estadio: ['Estádio {C}', 'Arena {C}', 'Estádio Municipal de {C}'],
    bloqueio: ['Lagoa das Pedras', 'Rio das Pedras', 'Barra do Cedro', 'Morro do Cedro', 'Rio do Cedro', 'Porto das Pedras', 'Barra das Garças', 'Vale do Sertão', 'Pouso Alegre'],
  },
  de: {
    ini: ['Alten', 'Bern', 'Dorn', 'Eich', 'Fal', 'Grün', 'Hohen', 'Kirch', 'Linden', 'Mühl', 'Neu', 'Ober', 'Rhein', 'Stein', 'Tann', 'Wald', 'Wester', 'Zell', 'Buch', 'Hasel'],
    fim: ['bach', 'berg', 'burg', 'dorf', 'feld', 'hausen', 'heim', 'stadt', 'au', 'tal', 'brück', 'wangen', 'rode', 'stetten', 'ingen'],
    padroes: [['FC {C}', 4], ['SV {C}', 3], ['VfB {C}', 2], ['TSV {C}', 2], ['SC {C}', 2], ['{C}er SV', 1], ['Eintracht {C}', 1], ['SpVgg {C}', 1], ['VfL {C}', 1], ['FSV {C}', 1]],
    estadio: ['{C}-Stadion', 'Sportpark {C}', 'Waldstadion {C}'],
    bloqueio: ['Altenburg', 'Bernburg', 'Neustadt', 'Neuburg', 'Oberhausen', 'Steinfeld', 'Waldhof', 'Lindenau', 'Eichstätt', 'Hohenheim', 'Kirchheim', 'Neuhausen', 'Neuheim', 'Rheinfeld', 'Rheinberg', 'Zelldorf', 'Wolfsburg', 'Freiburg', 'Steinbach', 'Waldkirch', 'Buchholz'],
  },
  fr: {
    ini: ['Beau', 'Mont', 'Saint-', 'Ville', 'Roche', 'Clair', 'Fonte', 'Mar', 'Belle', 'Val', 'Chante', 'Sauve', 'Ver', 'Plessis-'],
    fim: ['mont', 'ville', 'fort', 'court', 'lieu', 'bois', 'champ', 'roc', 'val', 'ferrand', 'mesnil', 'cluse', 'garde', 'brun'],
    padroes: [['FC {C}', 3], ['Olympique de {C}', 2], ['AS {C}', 3], ['US {C}', 2], ['SC {C}', 2], ['Racing Club de {C}', 1], ['AJ {C}', 1], ['En Avant {C}', 1]],
    estadio: ['Stade de {C}', 'Stade Municipal de {C}', 'Parc des Sports de {C}'],
    bloqueio: ['Beauvais', 'Montpellier', 'Montbéliard', 'Belleville', 'Clermont', 'Clairvaux', 'Montfort', 'Rochefort', 'Valmont', 'Beaumont', 'Villefort', 'Marville', 'Clermont-Ferrand', 'Montval', 'Beaulieu', 'Beauval', 'Villeneuve', 'Montchamp', 'Mardore', 'Vercourt', 'Belleval', 'Valbois', 'Rochebrun', 'Clairval'],
  },
  be: {
    ini: ['Heren', 'Oost', 'West', 'Zand', 'Berg', 'Beau', 'Ronse', 'Maas', 'Lier', 'Ver', 'Hoog', 'Mol', 'Ter'],
    fim: ['dijk', 'hout', 'kerke', 'zele', 'velde', 'meer', 'gem', 'mont', 'ville', 'sart', 'broek', 'rode'],
    padroes: [['KV {C}', 2], ['KSC {C}', 2], ['Sporting {C}', 2], ['RFC {C}', 2], ['Royal {C}', 1], ['FC {C}', 2], ['KAS {C}', 1], ['Union {C}', 1]],
    estadio: ['Stadion {C}', 'Stade de {C}'],
    bloqueio: ['Westerlo', 'Oostende', 'Zandvoort', 'Herentals', 'Westkerke', 'Oostkerke', 'Zele', 'Molenbeek', 'Beauraing', 'Hoogstraten'],
  },
  nl: {
    ini: ['Alder', 'Bree', 'Dijk', 'Eem', 'Gro', 'Hoorn', 'Lede', 'Meer', 'Noord', 'Oud', 'Rijs', 'Sloot', 'Velde', 'Wester', 'Zuid', 'Bloem'],
    fim: ['dam', 'veen', 'wijk', 'horst', 'hoven', 'drecht', 'kerk', 'voort', 'loo', 'sum', 'broek', 'mond', 'zand'],
    padroes: [['FC {C}', 3], ['SC {C}', 2], ['{C} Boys', 1], ['VV {C}', 2], ['Sparta {C}', 1], ['Achilles {C}', 1]],
    estadio: ['Sportpark {C}', 'Stadion {C}'],
    bloqueio: ['Zuidhorn', 'Noordwijk', 'Oudewater', 'Westervoort', 'Meerssen', 'Dijkhuizen', 'Bloemendaal', 'Velsen', 'Rijswijk', 'Noordeloos', 'Zuidbroek', 'Oudkerk', 'Hoornveen', 'Groesbeek', 'Velp'],
  },
  it: {
    ini: ['Castel', 'Monte', 'Val', 'Borgo', 'Roc', 'San ', 'Villa', 'Ponte', 'Torre', 'Fonte', 'Poggio', 'Serra', 'Lago', 'Colle'],
    fim: ['franco', 'verde', 'rosso', 'fiore', 'nuovo', 'lungo', 'chiaro', 'bello', 'alto', 'marino', 'sereno', 'antico', 'dorato', 'vecchio'],
    padroes: [['US {C}', 3], ['AC {C}', 3], ['{C} Calcio', 3], ['SS {C}', 2], ['AS {C}', 2], ['Virtus {C}', 1], ['Pro {C}', 1], ['Polisportiva {C}', 1], ['FC {C}', 1]],
    estadio: ['Stadio Comunale di {C}', 'Stadio {C}', 'Arena {C}'],
    bloqueio: ['Castelfranco', 'Monteverde', 'Montebello', 'Borgonuovo', 'Villafranca', 'Pontevecchio', 'Torre del Greco', 'Montalto', 'Castelnuovo', 'Valverde', 'Collealto', 'Montemarino'],
  },
  tr: {
    ini: ['Kara', 'Ak', 'Yeşil', 'Kızıl', 'Demir', 'Göl', 'Dağ', 'Bay', 'Su', 'Çam', 'Taş', 'Yıldız', 'Ova', 'Gök'],
    fim: ['tepe', 'yurt', 'köy', 'pınar', 'ova', 'dere', 'kent', 'kaya', 'han', 'çay', 'yalı', 'bağ'],
    padroes: [['{C}spor', 5], ['{C} Belediyespor', 2], ['{C} FK', 2], ['{C} Gençlik', 1], ['{C} İdmanyurdu', 1]],
    estadio: ['{C} Stadyumu', '{C} Şehir Stadı'],
    bloqueio: ['Karaköy', 'Akdere', 'Yeşilköy', 'Demirkent', 'Göltepe', 'Baykent', 'Karabağ', 'Çamlıca', 'Akçay', 'Taşköy', 'Karadere', 'Akkent'],
  },
  da: {
    ini: ['Bro', 'Eg', 'Fjor', 'Hav', 'Lund', 'Mose', 'Nør', 'Sol', 'Strand', 'Vester', 'Øster', 'Skov', 'Hede'],
    fim: ['by', 'rup', 'sted', 'holm', 'lev', 'bjerg', 'havn', 'løse', 'vig', 'købing', 'ager'],
    padroes: [['{C} BK', 3], ['{C} IF', 3], ['FC {C}', 2], ['{C} Boldklub', 1], ['AC {C}', 1]],
    estadio: ['{C} Stadion', '{C} Idrætspark'],
    bloqueio: ['Vesterby', 'Østerby', 'Skovby', 'Strandby', 'Lundby', 'Solrød', 'Hedehusene', 'Brøndby', 'Egholm', 'Havnsø', 'Vestervig', 'Nørby'],
  },
  no: {
    ini: ['Bjør', 'Fjell', 'Hav', 'Lien', 'Myr', 'Sand', 'Skog', 'Strøm', 'Vik', 'Ås', 'Berg', 'Elve', 'Nord'],
    fim: ['dal', 'nes', 'vik', 'heim', 'stad', 'fjord', 'vang', 'sund', 'mo', 'lia', 'bø'],
    padroes: [['{C} IL', 3], ['{C} FK', 3], ['{C} BK', 2], ['IK {C}', 1], ['{C} Fotball', 1]],
    estadio: ['{C} Stadion', '{C}banen'],
    bloqueio: ['Sandnes', 'Bjørnevik', 'Fjellheim', 'Strømmen', 'Skogheim', 'Nordheim', 'Elverum', 'Sandvik', 'Vikheim', 'Berg', 'Myrdal', 'Ålesund', 'Sandefjord', 'Strømsund'],
  },
  sv: {
    ini: ['Ek', 'Björk', 'Al', 'Lind', 'Sjö', 'Berg', 'Hol', 'Gran', 'Strand', 'Åker', 'Väster', 'Öster', 'Torp'],
    fim: ['sund', 'by', 'holm', 'vik', 'berga', 'ås', 'köping', 'hamn', 'torp', 'ryd', 'näs', 'fors'],
    padroes: [['{C}s IF', 3], ['IFK {C}', 2], ['{C}s BK', 2], ['{C} FF', 2], ['IK {C}', 1], ['{C}s AIK', 1]],
    estadio: ['{C} Arena', '{C}vallen'],
    bloqueio: ['Eksjö', 'Lindholm', 'Västerås', 'Österby', 'Granby', 'Alby', 'Björkby', 'Holmsund', 'Ekby', 'Strandby', 'Västervik', 'Lindköping', 'Bergsund'],
  },
  el: {
    ini: ['Neo', 'Agia ', 'Kato ', 'Ano ', 'Palaio', 'Kala', 'Mega', 'Ori', 'Thalasso', 'Peri', 'Elio'],
    fim: ['polis', 'chori', 'kastro', 'limni', 'pyrgos', 'kampos', 'vouni', 'nisi', 'potamos', 'stathmos'],
    padroes: [['{C} FC', 2], ['Asteras {C}', 2], ['Atromitos {C}', 1], ['Panathlitikos {C}', 1], ['Iraklis {C}', 1], ['AE {C}', 2], ['Doxa {C}', 1]],
    estadio: ['Gipedo {C}', 'Dimotiko Gipedo {C}'],
    bloqueio: ['Neapolis', 'Megalopolis', 'Kalamata', 'Palaiochori', 'Orikastro', 'Kato Achaia', 'Neochori'],
  },
  cs: {
    ini: ['Bor', 'Hrad', 'Klat', 'Luh', 'Ost', 'Pod', 'Rych', 'Strak', 'Třeb', 'Vel', 'Záb', 'Dub', 'Les', 'Kost', 'Slav'],
    fim: ['ovice', 'nice', 'ov', 'any', 'ín', 'ec', 'kov', 'nov', 'ště', 'ná', 'ín nad Lesem'],
    padroes: [['FK {C}', 3], ['SK {C}', 3], ['Slavoj {C}', 1], ['Baník {C}', 1], ['TJ {C}', 1], ['FC {C}', 2], ['Viktoria {C}', 1]],
    estadio: ['Stadion {C}', 'Městský stadion {C}'],
    bloqueio: ['Borovice', 'Ostrov', 'Podany', 'Velnov', 'Dubnice', 'Lesnice', 'Ostrava', 'Klatovy', 'Hradec', 'Třebíč', 'Strakonice', 'Zábřeh', 'Slavkov', 'Kostelec', 'Slavonice', 'Borkov', 'Dubec', 'Kostnice', 'Luhačovice', 'Rychnov', 'Hradiště', 'Kostomlaty', 'Ostrovany', 'Třebovice', 'Dubany', 'Borovany', 'Lesná', 'Velkov'],
  },
  hr: {
    ini: ['Bije', 'Dra', 'Gor', 'Kri', 'Lo', 'Mo', 'No', 'Po', 'Sla', 'Vi', 'Za', 'Bre'],
    fim: ['govac', 'nica', 'vac', 'grad', 'pje', 'žec', 'sko', 'binj', 'kovo', 'jan'],
    padroes: [['NK {C}', 5], ['HNK {C}', 2], ['GNK {C}', 1], ['NK Slaven {C}', 1]],
    estadio: ['Stadion {C}', 'Gradski stadion {C}'],
    bloqueio: ['Karlovac', 'Vinkovac', 'Slavonica', 'Pogrorad', 'Novigrad', 'Zagrad', 'Gornica', 'Bjelovac', 'Bregrad'],
  },
  pl: {
    ini: ['Bia', 'Gro', 'Kra', 'Le', 'Mi', 'Ost', 'Pia', 'Ra', 'Sta', 'Wo', 'Zie', 'Dę', 'Ja'],
    fim: ['niewo', 'szów', 'ków', 'wice', 'nica', 'górz', 'lin', 'by', 'rów', 'mierz', 'dów'],
    padroes: [['{C} KS', 1], ['KS {C}', 3], ['Górnik {C}', 1], ['Polonia {C}', 1], ['Olimpia {C}', 1], ['MKS {C}', 2], ['Stal {C}', 1], ['Unia {C}', 1], ['Sparta {C}', 1]],
    estadio: ['Stadion Miejski {C}', 'Stadion {C}'],
    bloqueio: ['Krakow', 'Kraków', 'Ostrów', 'Radom', 'Mielec', 'Starogard', 'Lewice', 'Wolin', 'Ostrowice', 'Zielin', 'Jarów', 'Grodzisk', 'Radomierz'],
  },
  hu: {
    ini: ['Kis', 'Nagy', 'Bala', 'Szent', 'Fehér', 'Zala', 'Kő', 'Hegy', 'Tisza', 'Sár', 'Duna', 'Vár'],
    fim: ['falva', 'hely', 'vár', 'szeg', 'egyháza', 'halom', 'kút', 'telek', 'völgy', 'füred'],
    padroes: [['{C} FC', 3], ['{C} SE', 2], ['{C}i TE', 2], ['{C} VSE', 1], ['Vasas {C}', 1], ['{C} ETO', 1]],
    estadio: ['{C} Stadion', '{C}i Sporttelep'],
    bloqueio: ['Szentendre', 'Kisvárda', 'Balatonfüred', 'Szeged', 'Tiszafüred', 'Nagykút', 'Zalaegerszeg', 'Dunaszeg', 'Kistelek', 'Sárvár', 'Hegyhalom', 'Várpalota'],
  },
  uk: {
    ini: ['Bilo', 'Zele', 'Novo', 'Staro', 'Kras', 'Soko', 'Lysy', 'Hor', 'Dni', 'Pry', 'Vyso', 'Kame'],
    fim: ['horod', 'pil', 'dar', 'ivka', 'yne', 'sk', 'polis', 'chyn', 'myr', 'brid'],
    padroes: [['FK {C}', 3], ['Metalurh {C}', 1], ['Avanhard {C}', 1], ['Dynamo {C}', 1], ['Nyva {C}', 1], ['Kolos {C}', 1], ['Polissia {C}', 1], ['Karpaty {C}', 1]],
    estadio: ['Stadion {C}', 'Tsentralnyi stadion {C}'],
    bloqueio: ['Bilohorod', 'Novopil', 'Starosk', 'Krasnodar', 'Sokolivka', 'Lysychansk', 'Horodar', 'Dnipro', 'Kamenyne', 'Novomyr', 'Vysopil'],
  },
  ar_g: {
    ini: ['Al ', 'Ras ', 'Wadi ', 'Bab ', 'Ain ', 'Jabal ', 'Umm '],
    fim: ['Rimal', 'Nakheel', 'Saqr', 'Bustan', 'Dhafra', 'Wahat', 'Manar', 'Qamar', 'Sahil', 'Rayyan Sharq', 'Faisaliyah Jadida', 'Zahra', 'Nour', 'Thuraya', 'Barq', 'Sidra', 'Ghazal'],
    padroes: [['{C} Club', 3], ['{C} FC', 3], ['{C} SC', 2]],
    estadio: ['{C} Stadium', '{C} Sports City'],
    bloqueio: ['Al Nour', 'Al Saqr', 'Al Dhafra', 'Ras Al Khaimah', 'Al Wahat', 'Al Zahra', 'Ain Al Nakheel'],
  },
  ja: {
    ini: ['Aki', 'Fuji', 'Hana', 'Ishi', 'Kawa', 'Matsu', 'Naga', 'Oka', 'Saku', 'Taka', 'Yama', 'Kiri', 'Mizu', 'Tsuru', 'Hoshi'],
    fim: ['hara', 'mura', 'saki', 'zawa', 'gawa', 'mori', 'shima', 'oka', 'no', 'kubo', 'tani', 'mine'],
    padroes: [['{C} FC', 3], ['{C} SC', 2], ['Vento {C}', 1], ['{C} United', 1], ['Azul {C}', 1], ['Stella {C}', 1], ['Fortuna {C}', 1], ['{C} Blaze', 1]],
    estadio: ['{C} Stadium', '{C} Sports Park'],
    bloqueio: ['Fujisawa', 'Nagasaki', 'Okayama', 'Matsumura', 'Kawasaki', 'Takahara', 'Yamagawa', 'Ishihara', 'Akishima', 'Hanamura', 'Matsushima', 'Nagamine', 'Fujimori', 'Takashima', 'Sakuragawa', 'Yamamura', 'Kawamura', 'Yamaoka'],
  },
  ko: {
    ini: ['Han', 'Seo', 'Dae', 'Gyeong', 'Jin', 'Mun', 'Cheong', 'Nam', 'Bu', 'Yeong', 'Hwa', 'Song'],
    fim: ['san', 'ju', 'won', 'cheon', 'pyeong', 'gang', 'dong', 'rim', 'do', 'gok'],
    padroes: [['{C} FC', 4], ['{C} Citizen', 1], ['{C} United', 2], ['{C} Hawks', 1], ['{C} Dragons', 1], ['{C} Phoenix', 1]],
    estadio: ['{C} Stadium', '{C} World Cup Park'],
    bloqueio: ['Daejeon', 'Gyeongju', 'Jinju', 'Namwon', 'Busan', 'Hwaseong', 'Suwon', 'Seosan', 'Cheongju', 'Yeongju', 'Hanam', 'Jincheon', 'Namdo', 'Songdo', 'Mungyeong', 'Seoul', 'Daegu', 'Gangwon', 'Jinpyeong'],
  },
  af_ar: {
    ini: ['Ain ', 'Oued ', 'Bir ', 'Sidi ', 'Ras ', 'Bordj ', 'Dar '],
    fim: ['Zitouna', 'Lahmar', 'Safsaf', 'Kebira', 'Nakhla', 'Mrah', 'Bahri', 'Ghaba', 'Ksar Jdid', 'Rmel', 'Hajar', 'Sahel Nord'],
    padroes: [['Ittihad {C}', 2], ['Chabab {C}', 2], ['Wydad {C}', 1], ['Olympique {C}', 1], ['Nadi {C}', 2], ['Étoile de {C}', 1]],
    estadio: ['Stade de {C}', 'Stade Municipal {C}'],
    bloqueio: ['Sidi Bel Abbès', 'Ras Kebira', 'Oued Zem', 'Bir Mrah', 'Ain Sefra'],
  },
  af_en: {
    ini: ['Ola', 'Kwa', 'Ade', 'Ebu', 'Nko', 'Tamba', 'Ubu', 'Ike', 'Mba', 'Sunya', 'Ofo', 'Zwe'],
    fim: ['ville', 'kope', 'nyi', 'wani', 'tsho', 'beng', 'ma', 'lolo', 'dongo', 'baka', 'kuru'],
    padroes: [['{C} United', 2], ['{C} Stars', 2], ['{C} City', 2], ['{C} Rangers', 1], ['{C} Pillars', 1], ['{C} Warriors', 1], ['Royal {C}', 1]],
    estadio: ['{C} Stadium', '{C} Township Stadium'],
    bloqueio: ['Kwama', 'Ubuntu', 'Mbabane', 'Ikeja', 'Adeville'],
  },
  af_fr: {
    ini: ['Kin', 'Bama', 'Yopo', 'Dakou', 'Tiba', 'Lumba', 'Kaso', 'Ngou', 'Sika', 'Moya'],
    fim: ['koro', 'ssou', 'bala', 'nda', 'kéré', 'dougou', 'bé', 'nza', 'fara', 'mbo'],
    padroes: [['AS {C}', 3], ['Jeunesse de {C}', 1], ['Racing {C}', 1], ['US {C}', 2], ['Étoile de {C}', 1], ['Union Sportive {C}', 1], ['Daring Club {C}', 1]],
    estadio: ['Stade de {C}', 'Stade Municipal de {C}'],
    bloqueio: ['Bamako', 'Kinshasa', 'Yopougon', 'Kindia', 'Bamba', 'Ngoundé'],
  },
};

// Pacotes regionais: perfil por país.
export const PERFIL_POR_PAIS_AFRICA: Record<string, string> = {
  EGY: 'af_ar', MAR: 'af_ar', TUN: 'af_ar', ALG: 'af_ar',
  RSA: 'af_en', NGA: 'af_en', GHA: 'af_en',
  SEN: 'af_fr', CIV: 'af_fr', COD: 'af_fr',
};

export function perfil(id: string): PerfilNomes {
  const p = P[id];
  if (!p) throw new Error(`perfil de nomes desconhecido: ${id}`);
  return p;
}

export const PERFIS = Object.keys(P);
