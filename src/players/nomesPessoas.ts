// Nomes fictícios de pessoas (jogadores e treinadores) por nacionalidade.
// Nome próprio comum do país + apelido inventado por sílabas (os apelidos não
// vêm de listas reais). Ficam todos marcados "gerado".
import type { Rng } from '../core/rng.ts';

interface PerfilPessoa {
  nomes: string[];
  ap_ini: string[];
  ap_fim: string[];
  /** Formato: "{N} {A}" por defeito; ex.: "{A} {N}" (Japão, Coreia). */
  formato?: string;
}

const P: Record<string, PerfilPessoa> = {
  pt: { nomes: ['João', 'Rui', 'Tiago', 'Diogo', 'André', 'Miguel', 'Nuno', 'Pedro', 'Rafael', 'Bruno', 'Gonçalo', 'Filipe', 'Hugo', 'Vasco'],
    ap_ini: ['Bar', 'Fer', 'Gou', 'Mar', 'Rib', 'Sal', 'Tav', 'Val', 'Mor', 'Pin', 'Loure', 'Cor', 'Amar', 'Tei'], ap_fim: ['eira', 'ado', 'ilho', 'ares', 'inho', 'ota', 'edo', 'elo', 'ança', 'ouro'] },
  br: { nomes: ['Lucas', 'Gabriel', 'Matheus', 'Thiago', 'Vinícius', 'Felipe', 'Gustavo', 'Rodrigo', 'Caio', 'Diego', 'Renan', 'Wesley', 'Igor', 'Murilo'],
    ap_ini: ['Bar', 'Fer', 'Gou', 'Mar', 'Rib', 'Sal', 'Tav', 'Val', 'Mor', 'Pin', 'Ara', 'Cam', 'Nas', 'Ros'], ap_fim: ['eira', 'ado', 'ilho', 'ares', 'inho', 'ota', 'edo', 'elo', 'ança', 'ujo'] },
  es: { nomes: ['Javier', 'Pablo', 'Sergio', 'Álvaro', 'Daniel', 'Adrián', 'Mario', 'Iván', 'Raúl', 'Hugo', 'Marcos', 'Rubén', 'Víctor', 'Jorge'],
    ap_ini: ['Gar', 'Fer', 'Mor', 'Ced', 'Vill', 'Esc', 'Gal', 'Ort', 'Pal', 'Ruiz', 'Ben', 'Cas', 'Mol', 'Ser'], ap_fim: ['ano', 'ero', 'ales', 'ega', 'illa', 'udo', 'ández', 'izo', 'ón', 'ados'] },
  es_am: { nomes: ['Juan', 'Santiago', 'Matías', 'Nicolás', 'Sebastián', 'Facundo', 'Joaquín', 'Brayan', 'Cristian', 'Franco', 'Emiliano', 'Agustín', 'Kevin', 'Luis'],
    ap_ini: ['Gar', 'Fer', 'Mor', 'Ced', 'Vill', 'Esc', 'Gal', 'Ort', 'Pal', 'Quin', 'Ben', 'Cas', 'Mol', 'Ser'], ap_fim: ['ano', 'ero', 'ales', 'ega', 'illa', 'udo', 'ández', 'izo', 'ón', 'oya'] },
  en: { nomes: ['James', 'Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'Thomas', 'Daniel', 'Ryan', 'Callum', 'Lewis', 'Jordan', 'Kyle', 'Ben'],
    ap_ini: ['Ash', 'Brad', 'Hol', 'Kem', 'Mor', 'Pen', 'Rad', 'Whit', 'Thorn', 'Dal', 'Cart', 'Fair', 'Hart', 'Ling'], ap_fim: ['ley', 'ton', 'well', 'by', 'ford', 'son', 'ham', 'wood', 'field', 'stone'] },
  de: { nomes: ['Lukas', 'Jonas', 'Leon', 'Felix', 'Niklas', 'Tim', 'Jan', 'Maximilian', 'Florian', 'Kevin', 'Tobias', 'Moritz', 'Julian', 'Fabian'],
    ap_ini: ['Bran', 'Hof', 'Kel', 'Lang', 'Mül', 'Ster', 'Wag', 'Zim', 'Bau', 'Fisch', 'Hart', 'Kuhn', 'Rein', 'Schwar'], ap_fim: ['mann', 'er', 'ner', 'hardt', 'berg', 'el', 'ke', 'ling', 'stein', 'z'] },
  fr: { nomes: ['Lucas', 'Hugo', 'Théo', 'Maxime', 'Antoine', 'Julien', 'Bastien', 'Romain', 'Kylian', 'Mathis', 'Enzo', 'Yanis', 'Clément', 'Florian'],
    ap_ini: ['Bel', 'Dub', 'Gar', 'Lam', 'Mor', 'Per', 'Roch', 'Vin', 'Bou', 'Chev', 'Fav', 'Lec', 'Mar', 'Rou'], ap_fim: ['ard', 'ois', 'eau', 'ier', 'et', 'ière', 'and', 'ault', 'on', 'elle'] },
  nl: { nomes: ['Daan', 'Sem', 'Lars', 'Jesse', 'Thijs', 'Bram', 'Ruben', 'Stijn', 'Joey', 'Kevin', 'Niels', 'Tim', 'Wout', 'Jelle'],
    ap_ini: ['van den ', 'de ', 'van ', 'Bak', 'Dek', 'Vis', 'Smit', 'Jan', 'Mul', 'Bos'], ap_fim: ['Berg', 'Vries', 'Dijk', 'Hoven', 'ker', 'ser', 'sen', 'der', 'ma', 'Meer'] },
  it: { nomes: ['Lorenzo', 'Matteo', 'Andrea', 'Alessandro', 'Federico', 'Riccardo', 'Davide', 'Simone', 'Nicolò', 'Gianluca', 'Marco', 'Stefano', 'Luca', 'Paolo'],
    ap_ini: ['Bel', 'Cor', 'Fer', 'Gal', 'Lom', 'Mar', 'Ros', 'Rin', 'Sar', 'Tor', 'Vit', 'Bar', 'Cap', 'Dell'], ap_fim: ['etti', 'ini', 'elli', 'ardi', 'one', 'ucci', 'ato', 'ese', 'otti', 'ani'] },
  tr: { nomes: ['Emre', 'Mert', 'Burak', 'Can', 'Kerem', 'Arda', 'Ozan', 'Yusuf', 'Hakan', 'Serkan', 'Ömer', 'Furkan', 'Cenk', 'Barış'],
    ap_ini: ['Yıl', 'Kara', 'Ak', 'Demir', 'Öz', 'Çe', 'Ay', 'Kılı', 'Taş', 'Er'], ap_fim: ['maz', 'kaya', 'han', 'dağ', 'lik', 'soy', 'ğlu', 'can', 'tekin', 'baş'] },
  nordico: { nomes: ['Mikkel', 'Jonas', 'Emil', 'Magnus', 'Oskar', 'Henrik', 'Erik', 'Sander', 'Viktor', 'Anders', 'Kasper', 'Elias', 'Filip', 'Rasmus'],
    ap_ini: ['Ander', 'Peder', 'Niel', 'Lind', 'Berg', 'Holm', 'Strand', 'Dahl', 'Sol', 'Ek'], ap_fim: ['sen', 'son', 'gaard', 'strøm', 'qvist', 'lund', 'by', 'vik', 'ström', 'berg'] },
  el: { nomes: ['Giorgos', 'Dimitris', 'Kostas', 'Nikos', 'Giannis', 'Panagiotis', 'Christos', 'Vasilis', 'Andreas', 'Stelios', 'Michalis', 'Petros', 'Thanasis', 'Lefteris'],
    ap_ini: ['Papa', 'Karam', 'Niko', 'Geor', 'Dimi', 'Vasi', 'Kost', 'Ange', 'Mano', 'Stav'], ap_fim: ['poulos', 'idis', 'akis', 'opoulos', 'iou', 'atos', 'ellis', 'ikas', 'aras', 'ou'] },
  cs: { nomes: ['Jakub', 'Tomáš', 'Lukáš', 'Ondřej', 'Martin', 'Petr', 'David', 'Adam', 'Filip', 'Matěj', 'Václav', 'Jan', 'Pavel', 'Michal'],
    ap_ini: ['Nov', 'Svob', 'Dvoř', 'Čern', 'Proch', 'Kuč', 'Vesel', 'Hor', 'Pokor', 'Krej'], ap_fim: ['ák', 'oda', 'ák', 'ý', 'ázka', 'era', 'ý', 'ák', 'ný', 'čí'] },
  hr: { nomes: ['Luka', 'Ivan', 'Marko', 'Josip', 'Mateo', 'Ante', 'Nikola', 'Filip', 'Petar', 'Domagoj', 'Stefan', 'Milan', 'Bojan', 'Dario'],
    ap_ini: ['Hor', 'Kov', 'Bab', 'Mar', 'Jur', 'Per', 'Vuk', 'Nov', 'Pet', 'Mil'], ap_fim: ['vat', 'ačić', 'ić', 'ković', 'ović', 'anić', 'ević', 'inić', 'ašević', 'jević'] },
  pl: { nomes: ['Jakub', 'Kacper', 'Mateusz', 'Bartosz', 'Piotr', 'Michał', 'Krzysztof', 'Kamil', 'Łukasz', 'Paweł', 'Szymon', 'Damian', 'Adrian', 'Patryk'],
    ap_ini: ['Now', 'Kow', 'Wiś', 'Woj', 'Kam', 'Lew', 'Zieli', 'Szym', 'Woź', 'Dąb'], ap_fim: ['ak', 'alski', 'niewski', 'cik', 'iński', 'andowski', 'ński', 'czak', 'niak', 'rowski'] },
  hu: { nomes: ['Bence', 'Máté', 'Dávid', 'Levente', 'Ádám', 'Balázs', 'Gergő', 'Dániel', 'Péter', 'Zsolt', 'Attila', 'Tamás', 'Roland', 'Norbert'],
    ap_ini: ['Nagy', 'Kov', 'Szab', 'Tót', 'Horv', 'Var', 'Kis', 'Mol', 'Né', 'Far'], ap_fim: ['ács', 'ó', 'h', 'áth', 'ga', 'nár', 'meth', 'kas', 'di', 'os'] },
  uk: { nomes: ['Andriy', 'Oleksandr', 'Dmytro', 'Mykola', 'Serhiy', 'Vitaliy', 'Bohdan', 'Taras', 'Yuriy', 'Ruslan', 'Artem', 'Denys', 'Maksym', 'Volodymyr'],
    ap_ini: ['Shev', 'Kov', 'Bon', 'Tka', 'Mel', 'Hry', 'Lys', 'Kra', 'Mos', 'Yar'], ap_fim: ['chenko', 'alenko', 'darenko', 'chuk', 'nyk', 'shyn', 'enko', 'ovych', 'yuk', 'ets'] },
  ro: { nomes: ['Andrei', 'Alexandru', 'Ionuț', 'Mihai', 'Răzvan', 'Florin', 'Cristian', 'Bogdan', 'Vlad', 'Darius', 'Gabriel', 'Ciprian', 'Sorin', 'Marius'],
    ap_ini: ['Pop', 'Ion', 'Stan', 'Dum', 'Mun', 'Rad', 'Cons', 'Ghe', 'Mar', 'Tud'], ap_fim: ['escu', 'ică', 'ovici', 'itrescu', 'eanu', 'u', 'antin', 'orghe', 'inescu', 'or'] },
  he: { nomes: ['Itay', 'Omer', 'Yonatan', 'Eden', 'Dor', 'Liel', 'Noam', 'Shon', 'Tomer', 'Ido', 'Amit', 'Roee', 'Yarden', 'Gal'],
    ap_ini: ['Ben ', 'Bar', 'Ga', 'Sha', 'Le', 'Ha', 'Pe', 'Za'], ap_fim: ['Haim', 'zilay', 'bay', 'lom', 'vi', 'dad', 'retz', 'kai', 'Shimon', 'Ami'] },
  az: { nomes: ['Elvin', 'Rauf', 'Tural', 'Ramil', 'Emin', 'Kamran', 'Orxan', 'Ruslan', 'Vüqar', 'Nihad', 'Elnur', 'Fərid', 'Səbuhi', 'Murad'],
    ap_ini: ['Məm', 'Əli', 'Hüs', 'Qul', 'İsma', 'Rza', 'Səf', 'Kəri', 'Bağı', 'Nəs'], ap_fim: ['mədov', 'yev', 'eynov', 'iyev', 'yılov', 'yev', 'ərov', 'mov', 'rov', 'irov'] },
  ar: { nomes: ['Mohammed', 'Ahmed', 'Omar', 'Youssef', 'Khalid', 'Abdullah', 'Faisal', 'Hassan', 'Saleh', 'Nasser', 'Karim', 'Hamza', 'Ali', 'Tariq'],
    ap_ini: ['Al-', 'El ', 'Ben ', 'Bou'], ap_fim: ['Qahtani', 'Harbi', 'Shamri', 'Mansouri', 'Dawsari', 'Amrani', 'Haddad', 'Ziani', 'Sayed', 'Rachidi', 'Khalfi', 'Masri'] },
  ja: { nomes: ['Haruto', 'Sota', 'Yuto', 'Ren', 'Kaito', 'Daiki', 'Takumi', 'Riku', 'Shota', 'Kenta', 'Yuki', 'Hiroki', 'Ryota', 'Kazuki'],
    ap_ini: ['Taka', 'Naka', 'Yama', 'Ishi', 'Mori', 'Kawa', 'Fuji', 'Hira', 'Matsu', 'Saka'], ap_fim: ['hashi', 'mura', 'moto', 'da', 'no', 'guchi', 'saki', 'oka', 'shita', 'zawa'], formato: '{A} {N}' },
  ko: { nomes: ['Min-jun', 'Seo-jun', 'Ji-ho', 'Hyun-woo', 'Do-yun', 'Jun-seo', 'Woo-jin', 'Sung-min', 'Jae-won', 'Tae-hyun', 'Dong-hyun', 'Ji-sung', 'Young-ho', 'Seung-woo'],
    ap_ini: ['K', 'L', 'P', 'Ch', 'J', 'Y', 'H', 'S'], ap_fim: ['im', 'ee', 'ark', 'oi', 'ung', 'oon', 'wang', 'eo', 'ong', 'an'], formato: '{A} {N}' },
  af_en: { nomes: ['Chukwuemeka', 'Kwame', 'Tunde', 'Sipho', 'Emmanuel', 'Samuel', 'Victor', 'Joseph', 'Kelechi', 'Thabo', 'Kofi', 'Michael', 'Peter', 'Daniel'],
    ap_ini: ['Ade', 'Oko', 'Mensa', 'Nwa', 'Osei', 'Mba', 'Dlami', 'Ola', 'Asa', 'Ike'], ap_fim: ['yemi', 'nkwo', 'h', 'eze', 'bonsu', 'ku', 'ni', 'wale', 'moah', 'chukwu'] },
  af_fr: { nomes: ['Moussa', 'Ibrahima', 'Cheikh', 'Mamadou', 'Yao', 'Serge', 'Arnaud', 'Junior', 'Abdoulaye', 'Christian', 'Didier', 'Ousmane', 'Lamine', 'Jean'],
    ap_ini: ['Diall', 'Kou', 'Tra', 'Ndi', 'Sangar', 'Kab', 'Mbe', 'Dio', 'Kon', 'Yao'], ap_fim: ['o', 'assi', 'oré', 'aye', 'é', 'ila', 'ki', 'uf', 'até', 'bi'] },
};

const LINGUA_POR_PAIS: Record<string, string> = {
  POR: 'pt', BRA: 'br', ESP: 'es', ARG: 'es_am', COL: 'es_am', URU: 'es_am', ECU: 'es_am', MEX: 'es_am',
  ENG: 'en', SCO: 'en', USA: 'en', GER: 'de', AUT: 'de', SUI: 'de', FRA: 'fr', BEL: 'nl', NED: 'nl', ITA: 'it', TUR: 'tr',
  DEN: 'nordico', NOR: 'nordico', SWE: 'nordico', GRE: 'el', CYP: 'el', CZE: 'cs', CRO: 'hr', SRB: 'hr', POL: 'pl', HUN: 'hu',
  UKR: 'uk', ROU: 'ro', ISR: 'he', AZE: 'az', KSA: 'ar', UAE: 'ar', EGY: 'ar', MAR: 'ar', TUN: 'ar', ALG: 'ar',
  JPN: 'ja', KOR: 'ko', NGA: 'af_en', GHA: 'af_en', RSA: 'af_en', SEN: 'af_fr', CIV: 'af_fr', COD: 'af_fr',
};

export function linguaDoPais(pais: string): string {
  return LINGUA_POR_PAIS[pais] ?? 'en';
}

/** Nome completo fictício para um país. */
export function nomePessoa(pais: string, rng: Rng): string {
  let l = linguaDoPais(pais);
  if (pais === 'BEL' && rng.chance(0.45)) l = 'fr';
  const p = P[l];
  const ap = rng.pick(p.ap_ini) + rng.pick(p.ap_fim);
  return (p.formato ?? '{N} {A}').replace('{N}', rng.pick(p.nomes)).replace('{A}', ap);
}
