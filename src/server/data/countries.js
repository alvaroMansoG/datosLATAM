const REGION_AGGREGATE_ISO = 'ALC';
const REGION_AGGREGATE_NAME = 'América Latina y el Caribe';

const BID_REGION_BY_ISO = {
  ARG: 'Cono Sur',
  BRA: 'Cono Sur',
  CHL: 'Cono Sur',
  PRY: 'Cono Sur',
  URY: 'Cono Sur',
  BOL: 'Grupo Andino',
  COL: 'Grupo Andino',
  ECU: 'Grupo Andino',
  PER: 'Grupo Andino',
  VEN: 'Grupo Andino',
  BLZ: 'Centroamérica y México',
  CRI: 'Centroamérica y México',
  SLV: 'Centroamérica y México',
  GTM: 'Centroamérica y México',
  HND: 'Centroamérica y México',
  MEX: 'Centroamérica y México',
  NIC: 'Centroamérica y México',
  PAN: 'Centroamérica y México',
  BHS: 'Caribe',
  BRB: 'Caribe',
  GUY: 'Caribe',
  JAM: 'Caribe',
  SUR: 'Caribe',
  TTO: 'Caribe',
  DOM: 'Caribe',
  HTI: 'Caribe',
};

const BORDER_COUNTRIES_BY_ISO = {
  ARG: ['BOL', 'BRA', 'CHL', 'PRY', 'URY'],
  BOL: ['ARG', 'BRA', 'CHL', 'PRY', 'PER'],
  BRA: ['ARG', 'BOL', 'COL', 'GUY', 'PRY', 'PER', 'SUR', 'URY', 'VEN'],
  CHL: ['ARG', 'BOL', 'PER'],
  COL: ['BRA', 'ECU', 'PAN', 'PER', 'VEN'],
  CRI: ['NIC', 'PAN'],
  DOM: ['HTI'],
  ECU: ['COL', 'PER'],
  SLV: ['GTM', 'HND'],
  GTM: ['BLZ', 'SLV', 'HND', 'MEX'],
  GUY: ['BRA', 'SUR', 'VEN'],
  HTI: ['DOM'],
  HND: ['GTM', 'SLV', 'NIC'],
  MEX: ['BLZ', 'GTM'],
  NIC: ['CRI', 'HND'],
  PAN: ['COL', 'CRI'],
  PRY: ['ARG', 'BOL', 'BRA'],
  PER: ['BOL', 'BRA', 'CHL', 'COL', 'ECU'],
  SUR: ['BRA', 'GUY'],
  URY: ['ARG', 'BRA'],
  VEN: ['BRA', 'COL', 'GUY'],
};

const ISO2_BY_ISO3 = {
  ARG: 'AR', BOL: 'BO', BRA: 'BR', CHL: 'CL', COL: 'CO', CRI: 'CR', DOM: 'DO',
  ECU: 'EC', SLV: 'SV', GTM: 'GT', HTI: 'HT', HND: 'HN', JAM: 'JM', MEX: 'MX',
  NIC: 'NI', PAN: 'PA', PRY: 'PY', PER: 'PE', TTO: 'TT', URY: 'UY', VEN: 'VE',
  GUY: 'GY', SUR: 'SR', BLZ: 'BZ', BHS: 'BS', BRB: 'BB',
};

function isoToFlag(iso3) {
  const iso2 = ISO2_BY_ISO3[iso3];
  if (!iso2) return '';
  return iso2
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

const COUNTRIES = [
  { iso3: 'ARG', name: 'Argentina', numericId: '032', capital: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires', currency: 'Peso argentino', currencyCode: 'ARS', domain: '.ar', phoneCode: '+54' },
  { iso3: 'BRA', name: 'Brasil', numericId: '076', capital: 'Brasilia', timezone: 'America/Sao_Paulo', currency: 'Real brasileño', currencyCode: 'BRL', domain: '.br', phoneCode: '+55' },
  { iso3: 'CHL', name: 'Chile', numericId: '152', capital: 'Santiago', timezone: 'America/Santiago', currency: 'Peso chileno', currencyCode: 'CLP', domain: '.cl', phoneCode: '+56' },
  { iso3: 'PRY', name: 'Paraguay', numericId: '600', capital: 'Asunción', timezone: 'America/Asuncion', currency: 'Guaraní', currencyCode: 'PYG', domain: '.py', phoneCode: '+595' },
  { iso3: 'URY', name: 'Uruguay', numericId: '858', capital: 'Montevideo', timezone: 'America/Montevideo', currency: 'Peso uruguayo', currencyCode: 'UYU', domain: '.uy', phoneCode: '+598' },
  { iso3: 'BOL', name: 'Bolivia', numericId: '068', capital: 'Sucre', timezone: 'America/La_Paz', currency: 'Boliviano', currencyCode: 'BOB', domain: '.bo', phoneCode: '+591' },
  { iso3: 'COL', name: 'Colombia', numericId: '170', capital: 'Bogotá', timezone: 'America/Bogota', currency: 'Peso colombiano', currencyCode: 'COP', domain: '.co', phoneCode: '+57' },
  { iso3: 'ECU', name: 'Ecuador', numericId: '218', capital: 'Quito', timezone: 'America/Guayaquil', currency: 'Dólar estadounidense', currencyCode: 'USD', domain: '.ec', phoneCode: '+593' },
  { iso3: 'PER', name: 'Perú', numericId: '604', capital: 'Lima', timezone: 'America/Lima', currency: 'Sol peruano', currencyCode: 'PEN', domain: '.pe', phoneCode: '+51' },
  { iso3: 'VEN', name: 'Venezuela', numericId: '862', capital: 'Caracas', timezone: 'America/Caracas', currency: 'Bolívar digital', currencyCode: 'VES', domain: '.ve', phoneCode: '+58' },
  { iso3: 'BLZ', name: 'Belice', numericId: '084', capital: 'Belmopán', timezone: 'America/Belize', currency: 'Dólar beliceño', currencyCode: 'BZD', domain: '.bz', phoneCode: '+501' },
  { iso3: 'CRI', name: 'Costa Rica', numericId: '188', capital: 'San José', timezone: 'America/Costa_Rica', currency: 'Colón costarricense', currencyCode: 'CRC', domain: '.cr', phoneCode: '+506' },
  { iso3: 'SLV', name: 'El Salvador', numericId: '222', capital: 'San Salvador', timezone: 'America/El_Salvador', currency: 'Dólar estadounidense', currencyCode: 'USD', domain: '.sv', phoneCode: '+503' },
  { iso3: 'GTM', name: 'Guatemala', numericId: '320', capital: 'Ciudad de Guatemala', timezone: 'America/Guatemala', currency: 'Quetzal', currencyCode: 'GTQ', domain: '.gt', phoneCode: '+502' },
  { iso3: 'HTI', name: 'Haití', numericId: '332', capital: 'Puerto Príncipe', timezone: 'America/Port-au-Prince', currency: 'Gourde', currencyCode: 'HTG', domain: '.ht', phoneCode: '+509' },
  { iso3: 'HND', name: 'Honduras', numericId: '340', capital: 'Tegucigalpa', timezone: 'America/Tegucigalpa', currency: 'Lempira', currencyCode: 'HNL', domain: '.hn', phoneCode: '+504' },
  { iso3: 'MEX', name: 'México', numericId: '484', capital: 'Ciudad de México', timezone: 'America/Mexico_City', currency: 'Peso mexicano', currencyCode: 'MXN', domain: '.mx', phoneCode: '+52' },
  { iso3: 'NIC', name: 'Nicaragua', numericId: '558', capital: 'Managua', timezone: 'America/Managua', currency: 'Córdoba', currencyCode: 'NIO', domain: '.ni', phoneCode: '+505' },
  { iso3: 'PAN', name: 'Panamá', numericId: '591', capital: 'Ciudad de Panamá', timezone: 'America/Panama', currency: 'Balboa / Dólar USD', currencyCode: 'PAB', domain: '.pa', phoneCode: '+507' },
  { iso3: 'DOM', name: 'República Dominicana', numericId: '214', capital: 'Santo Domingo', timezone: 'America/Santo_Domingo', currency: 'Peso dominicano', currencyCode: 'DOP', domain: '.do', phoneCode: '+1-809' },
  { iso3: 'BHS', name: 'Bahamas', numericId: '044', capital: 'Nassau', timezone: 'America/Nassau', currency: 'Dólar bahameño', currencyCode: 'BSD', domain: '.bs', phoneCode: '+1-242' },
  { iso3: 'BRB', name: 'Barbados', numericId: '052', capital: 'Bridgetown', timezone: 'America/Barbados', currency: 'Dólar barbadense', currencyCode: 'BBD', domain: '.bb', phoneCode: '+1-246' },
  { iso3: 'GUY', name: 'Guyana', numericId: '328', capital: 'Georgetown', timezone: 'America/Guyana', currency: 'Dólar guyanés', currencyCode: 'GYD', domain: '.gy', phoneCode: '+592' },
  { iso3: 'JAM', name: 'Jamaica', numericId: '388', capital: 'Kingston', timezone: 'America/Jamaica', currency: 'Dólar jamaicano', currencyCode: 'JMD', domain: '.jm', phoneCode: '+1-876' },
  { iso3: 'SUR', name: 'Surinam', numericId: '740', capital: 'Paramaribo', timezone: 'America/Paramaribo', currency: 'Dólar surinamés', currencyCode: 'SRD', domain: '.sr', phoneCode: '+597' },
  { iso3: 'TTO', name: 'Trinidad y Tobago', numericId: '780', capital: 'Puerto España', timezone: 'America/Port_of_Spain', currency: 'Dólar trinitense', currencyCode: 'TTD', domain: '.tt', phoneCode: '+1-868' },
].map((country) => ({
  ...country,
  flag: isoToFlag(country.iso3),
  bidRegion: BID_REGION_BY_ISO[country.iso3] || null,
  borderCountries: BORDER_COUNTRIES_BY_ISO[country.iso3] || [],
}));

const REGION_COUNTRY_COUNT = COUNTRIES.length;
const REGION_ISO_CODES = COUNTRIES.map((country) => country.iso3);
const WORLD_BANK_REGION_COUNTRY_PATH = REGION_ISO_CODES.join(';');
const UNDP_REGION_COUNTRY_LIST = REGION_ISO_CODES.join(',');

module.exports = {
  REGION_AGGREGATE_ISO,
  REGION_AGGREGATE_NAME,
  COUNTRIES,
  BID_REGION_BY_ISO,
  BORDER_COUNTRIES_BY_ISO,
  REGION_COUNTRY_COUNT,
  REGION_ISO_CODES,
  WORLD_BANK_REGION_COUNTRY_PATH,
  UNDP_REGION_COUNTRY_LIST,
};
