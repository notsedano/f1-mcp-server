// Driver name to code mapping for F1 MCP tools
// This helps convert natural language driver names to proper FastF1 driver codes

export const DRIVER_NAME_TO_CODE: Record<string, string> = {
  // Current drivers (2023-2024)
  'hamilton': 'HAM',
  'lewis hamilton': 'HAM',
  'lewis': 'HAM',
  'ham': 'HAM',
  '44': 'HAM',
  
  'verstappen': 'VER',
  'max verstappen': 'VER',
  'max': 'VER',
  'ver': 'VER',
  '1': 'VER',
  
  'leclerc': 'LEC',
  'charles leclerc': 'LEC',
  'charles': 'LEC',
  'lec': 'LEC',
  '16': 'LEC',
  
  'russell': 'RUS',
  'george russell': 'RUS',
  'george': 'RUS',
  'rus': 'RUS',
  '63': 'RUS',
  
  'sainz': 'SAI',
  'carlos sainz': 'SAI',
  'carlos': 'SAI',
  'sai': 'SAI',
  '55': 'SAI',
  
  'norris': 'NOR',
  'lando norris': 'NOR',
  'lando': 'NOR',
  'nor': 'NOR',
  '4': 'NOR',
  
  'piastri': 'PIA',
  'oscar piastri': 'PIA',
  'oscar': 'PIA',
  'pia': 'PIA',
  '81': 'PIA',
  
  'alonso': 'ALO',
  'fernando alonso': 'ALO',
  'fernando': 'ALO',
  'alo': 'ALO',
  '14': 'ALO',
  
  'stroll': 'STR',
  'lance stroll': 'STR',
  'lance': 'STR',
  'str': 'STR',
  '18': 'STR',
  
  'ocon': 'OCO',
  'esteban ocon': 'OCO',
  'esteban': 'OCO',
  'oco': 'OCO',
  '31': 'OCO',
  
  'gasly': 'GAS',
  'pierre gasly': 'GAS',
  'pierre': 'GAS',
  'gas': 'GAS',
  '10': 'GAS',
  
  'hulkenberg': 'HUL',
  'nico hulkenberg': 'HUL',
  'nico': 'HUL',
  'hul': 'HUL',
  '27': 'HUL',
  
  'magnussen': 'MAG',
  'kevin magnussen': 'MAG',
  'kevin': 'MAG',
  'mag': 'MAG',
  '20': 'MAG',
  
  'tsunoda': 'TSU',
  'yuki tsunoda': 'TSU',
  'yuki': 'TSU',
  'tsu': 'TSU',
  '22': 'TSU',
  
  'ricciardo': 'RIC',
  'daniel ricciardo': 'RIC',
  'daniel': 'RIC',
  'ric': 'RIC',
  '3': 'RIC',
  
  'bottas': 'BOT',
  'valtteri bottas': 'BOT',
  'valtteri': 'BOT',
  'bot': 'BOT',
  '77': 'BOT',
  
  'zhou': 'ZHO',
  'guanyu zhou': 'ZHO',
  'guanyu': 'ZHO',
  'zho': 'ZHO',
  '24': 'ZHO',
  
  'albon': 'ALB',
  'alexander albon': 'ALB',
  'alexander': 'ALB',
  'alb': 'ALB',
  '23': 'ALB',
  
  'sargeant': 'SAR',
  'logan sargeant': 'SAR',
  'logan': 'SAR',
  'sar': 'SAR',
  '2': 'SAR',
  
  'perez': 'PER',
  'sergio perez': 'PER',
  'sergio': 'PER',
  'per': 'PER',
  '11': 'PER',
  
  // Legacy/retired drivers (for historical data)
  'vettel': 'VET',
  'sebastian vettel': 'VET',
  'sebastian': 'VET',
  'vet': 'VET',
  
  'schumacher': 'MSC',
  'mick schumacher': 'MSC',
  'mick': 'MSC',
  'msc': 'MSC',
  
  'latifi': 'LAT',
  'nicholas latifi': 'LAT',
  'nicholas': 'LAT',
  'lat': 'LAT',
  
  'mazepin': 'MAZ',
  'nikita mazepin': 'MAZ',
  'nikita': 'MAZ',
  'maz': 'MAZ',
};

export function normalizeDriverIdentifier(input: string): string {
  if (!input) return input;
  
  const normalized = input.toLowerCase().trim();
  
  // Check if it's already a valid 3-letter code
  if (/^[A-Z]{3}$/i.test(input.trim())) {
    return input.trim().toUpperCase();
  }
  
  // Check if it's a number (driver number)
  if (/^\d{1,2}$/.test(input.trim())) {
    return DRIVER_NAME_TO_CODE[input.trim()] || input.trim();
  }
  
  // Look up in mapping
  const mapped = DRIVER_NAME_TO_CODE[normalized];
  if (mapped) {
    return mapped;
  }
  
  // If no mapping found, return the original (might still work with FastF1)
  return input;
}

export function getDriverSuggestions(input: string): string[] {
  const normalized = input.toLowerCase();
  return Object.keys(DRIVER_NAME_TO_CODE)
    .filter(name => name.includes(normalized))
    .map(name => DRIVER_NAME_TO_CODE[name])
    .filter((code, index, array) => array.indexOf(code) === index) // Remove duplicates
    .slice(0, 5); // Limit to top 5 suggestions
} 