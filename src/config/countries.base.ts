// The 213 country-clubs: 211 FIFA member associations + Catalunya and País Basco (UEFA).
// Columns: code | name (pt-PT) | original confederation | name region (for invented test names).
// Source: written from knowledge — STATUS "por verificar" against the official FIFA list (see DECISIONS.md).
// Real economic data (population, GDP) is NOT here: it comes from your countries.csv.

import type { ConfederationId, NameRegion } from '../engine/types';

export const COUNTRY_LIST_STATUS = 'por verificar' as const;

/** Countries that may never be moved to another confederation. */
export const PROTECTED_COUNTRIES = ['CAT', 'EUS'] as const;

const RAW = `
ALB|Albânia|UEFA|balkan
AND|Andorra|UEFA|catalan
ARM|Arménia|UEFA|caucasian
AUT|Áustria|UEFA|germanic
AZE|Azerbaijão|UEFA|turkish
BLR|Bielorrússia|UEFA|slavic
BEL|Bélgica|UEFA|dutch
BIH|Bósnia e Herzegovina|UEFA|balkan
BUL|Bulgária|UEFA|slavic
CRO|Croácia|UEFA|balkan
CYP|Chipre|UEFA|greek
CZE|Chéquia|UEFA|slavic
DEN|Dinamarca|UEFA|nordic
ENG|Inglaterra|UEFA|anglo
EST|Estónia|UEFA|baltic
FRO|Ilhas Faroé|UEFA|nordic
FIN|Finlândia|UEFA|nordic
FRA|França|UEFA|french
GEO|Geórgia|UEFA|caucasian
GER|Alemanha|UEFA|germanic
GIB|Gibraltar|UEFA|anglo
GRE|Grécia|UEFA|greek
HUN|Hungria|UEFA|hungarian
ISL|Islândia|UEFA|nordic
ISR|Israel|UEFA|hebrew
ITA|Itália|UEFA|italian
KAZ|Cazaquistão|UEFA|centralasian
KVX|Kosovo|UEFA|balkan
LVA|Letónia|UEFA|baltic
LIE|Liechtenstein|UEFA|germanic
LTU|Lituânia|UEFA|baltic
LUX|Luxemburgo|UEFA|french
MLT|Malta|UEFA|italian
MDA|Moldávia|UEFA|romanian
MNE|Montenegro|UEFA|balkan
NED|Países Baixos|UEFA|dutch
MKD|Macedónia do Norte|UEFA|balkan
NIR|Irlanda do Norte|UEFA|anglo
NOR|Noruega|UEFA|nordic
POL|Polónia|UEFA|slavic
POR|Portugal|UEFA|lusophone
IRL|Irlanda|UEFA|anglo
ROU|Roménia|UEFA|romanian
RUS|Rússia|UEFA|slavic
SMR|San Marino|UEFA|italian
SCO|Escócia|UEFA|anglo
SRB|Sérvia|UEFA|balkan
SVK|Eslováquia|UEFA|slavic
SVN|Eslovénia|UEFA|balkan
ESP|Espanha|UEFA|iberian
SWE|Suécia|UEFA|nordic
SUI|Suíça|UEFA|germanic
TUR|Turquia|UEFA|turkish
UKR|Ucrânia|UEFA|slavic
WAL|País de Gales|UEFA|anglo
CAT|Catalunya|UEFA|catalan
EUS|País Basco|UEFA|basque
ARG|Argentina|CONMEBOL|latam
BOL|Bolívia|CONMEBOL|latam
BRA|Brasil|CONMEBOL|lusophone
CHI|Chile|CONMEBOL|latam
COL|Colômbia|CONMEBOL|latam
ECU|Equador|CONMEBOL|latam
PAR|Paraguai|CONMEBOL|latam
PER|Peru|CONMEBOL|latam
URU|Uruguai|CONMEBOL|latam
VEN|Venezuela|CONMEBOL|latam
ASA|Samoa Americana|OFC|pacific
COK|Ilhas Cook|OFC|pacific
FIJ|Fiji|OFC|pacific
NCL|Nova Caledónia|OFC|pacific
NZL|Nova Zelândia|OFC|anglo
PNG|Papua-Nova Guiné|OFC|pacific
SAM|Samoa|OFC|pacific
SOL|Ilhas Salomão|OFC|pacific
TAH|Taiti|OFC|pacific
TGA|Tonga|OFC|pacific
VAN|Vanuatu|OFC|pacific
AIA|Anguila|CONCACAF|caribbean
ATG|Antígua e Barbuda|CONCACAF|caribbean
ARU|Aruba|CONCACAF|caribbean
BAH|Bahamas|CONCACAF|caribbean
BRB|Barbados|CONCACAF|caribbean
BLZ|Belize|CONCACAF|caribbean
BER|Bermudas|CONCACAF|caribbean
VGB|Ilhas Virgens Britânicas|CONCACAF|caribbean
CAN|Canadá|CONCACAF|anglo
CAY|Ilhas Caimão|CONCACAF|caribbean
CRC|Costa Rica|CONCACAF|latam
CUB|Cuba|CONCACAF|latam
CUW|Curaçau|CONCACAF|caribbean
DMA|Dominica|CONCACAF|caribbean
DOM|República Dominicana|CONCACAF|latam
SLV|El Salvador|CONCACAF|latam
GRN|Granada|CONCACAF|caribbean
GUA|Guatemala|CONCACAF|latam
GUY|Guiana|CONCACAF|caribbean
HAI|Haiti|CONCACAF|french
HON|Honduras|CONCACAF|latam
JAM|Jamaica|CONCACAF|caribbean
MEX|México|CONCACAF|latam
MSR|Montserrat|CONCACAF|caribbean
NCA|Nicarágua|CONCACAF|latam
PAN|Panamá|CONCACAF|latam
PUR|Porto Rico|CONCACAF|latam
SKN|São Cristóvão e Neves|CONCACAF|caribbean
LCA|Santa Lúcia|CONCACAF|caribbean
VIN|São Vicente e Granadinas|CONCACAF|caribbean
SUR|Suriname|CONCACAF|caribbean
TRI|Trindade e Tobago|CONCACAF|caribbean
TCA|Ilhas Turcas e Caicos|CONCACAF|caribbean
VIR|Ilhas Virgens Americanas|CONCACAF|caribbean
USA|Estados Unidos|CONCACAF|anglo
AFG|Afeganistão|AFC|persian
AUS|Austrália|AFC|anglo
BHR|Barém|AFC|arabic
BAN|Bangladesh|AFC|southasian
BHU|Butão|AFC|southasian
BRU|Brunei|AFC|seasian
CAM|Camboja|AFC|seasian
CHN|China|AFC|chinese
TPE|Taipé Chinesa|AFC|chinese
GUM|Guam|AFC|pacific
HKG|Hong Kong|AFC|chinese
IND|Índia|AFC|southasian
IDN|Indonésia|AFC|seasian
IRN|Irão|AFC|persian
IRQ|Iraque|AFC|arabic
JPN|Japão|AFC|japanese
JOR|Jordânia|AFC|arabic
KUW|Kuwait|AFC|arabic
KGZ|Quirguistão|AFC|centralasian
LAO|Laos|AFC|seasian
LBN|Líbano|AFC|arabic
MAC|Macau|AFC|chinese
MAS|Malásia|AFC|seasian
MDV|Maldivas|AFC|southasian
MNG|Mongólia|AFC|centralasian
MYA|Myanmar|AFC|seasian
NEP|Nepal|AFC|southasian
PRK|Coreia do Norte|AFC|korean
OMA|Omã|AFC|arabic
PAK|Paquistão|AFC|southasian
PLE|Palestina|AFC|arabic
PHI|Filipinas|AFC|seasian
QAT|Catar|AFC|arabic
KSA|Arábia Saudita|AFC|arabic
SGP|Singapura|AFC|seasian
KOR|Coreia do Sul|AFC|korean
SRI|Sri Lanka|AFC|southasian
SYR|Síria|AFC|arabic
TJK|Tajiquistão|AFC|centralasian
THA|Tailândia|AFC|seasian
TLS|Timor-Leste|AFC|seasian
TKM|Turquemenistão|AFC|centralasian
UAE|Emirados Árabes Unidos|AFC|arabic
UZB|Usbequistão|AFC|centralasian
VIE|Vietname|AFC|seasian
YEM|Iémen|AFC|arabic
ALG|Argélia|CAF|arabic
ANG|Angola|CAF|lusophone
BEN|Benim|CAF|westafrican
BOT|Botsuana|CAF|southernafrican
BFA|Burkina Faso|CAF|westafrican
BDI|Burundi|CAF|eastafrican
CMR|Camarões|CAF|westafrican
CPV|Cabo Verde|CAF|lusophone
CTA|República Centro-Africana|CAF|westafrican
CHA|Chade|CAF|westafrican
COM|Comores|CAF|eastafrican
CGO|Congo|CAF|westafrican
COD|RD Congo|CAF|westafrican
DJI|Djibuti|CAF|eastafrican
EGY|Egipto|CAF|arabic
EQG|Guiné Equatorial|CAF|iberian
ERI|Eritreia|CAF|eastafrican
SWZ|Essuatíni|CAF|southernafrican
ETH|Etiópia|CAF|eastafrican
GAB|Gabão|CAF|westafrican
GAM|Gâmbia|CAF|westafrican
GHA|Gana|CAF|westafrican
GUI|Guiné|CAF|westafrican
GNB|Guiné-Bissau|CAF|lusophone
CIV|Costa do Marfim|CAF|westafrican
KEN|Quénia|CAF|eastafrican
LES|Lesoto|CAF|southernafrican
LBR|Libéria|CAF|westafrican
LBY|Líbia|CAF|arabic
MAD|Madagáscar|CAF|eastafrican
MWI|Malawi|CAF|southernafrican
MLI|Mali|CAF|westafrican
MTN|Mauritânia|CAF|arabic
MRI|Maurícia|CAF|french
MAR|Marrocos|CAF|arabic
MOZ|Moçambique|CAF|lusophone
NAM|Namíbia|CAF|southernafrican
NIG|Níger|CAF|westafrican
NGA|Nigéria|CAF|westafrican
RWA|Ruanda|CAF|eastafrican
STP|São Tomé e Príncipe|CAF|lusophone
SEN|Senegal|CAF|westafrican
SEY|Seicheles|CAF|french
SLE|Serra Leoa|CAF|westafrican
SOM|Somália|CAF|eastafrican
RSA|África do Sul|CAF|southernafrican
SSD|Sudão do Sul|CAF|eastafrican
SDN|Sudão|CAF|arabic
TAN|Tanzânia|CAF|eastafrican
TOG|Togo|CAF|westafrican
TUN|Tunísia|CAF|arabic
UGA|Uganda|CAF|eastafrican
ZAM|Zâmbia|CAF|southernafrican
ZIM|Zimbabué|CAF|southernafrican
`;

export interface BaseCountry {
  id: string;
  name: string;
  confederation: ConfederationId;
  nameRegion: NameRegion;
}

export const BASE_COUNTRIES: readonly BaseCountry[] = RAW.trim().split('\n').map((line) => {
  const [id, name, confederation, nameRegion] = line.split('|');
  return { id, name, confederation: confederation as ConfederationId, nameRegion: nameRegion as NameRegion };
});
