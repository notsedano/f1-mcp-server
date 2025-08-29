/**
 * Get all Southeast Asian timezones using the standard library approach
 * @returns Array of timezone objects with value and label for Southeast Asia
 */
export const getSoutheastAsianTimezones = () => {
  // Comprehensive list of Southeast Asian timezone IDs from IANA database
  const southeastAsianTimezones = [
    // Thailand
    'Asia/Bangkok',           // Indochina Time (UTC+7)
    
    // Singapore
    'Asia/Singapore',         // Singapore Standard Time (UTC+8)
    
    // Malaysia
    'Asia/Kuala_Lumpur',      // Malaysia Time (UTC+8)
    
    // Indonesia
    'Asia/Jakarta',           // Western Indonesian Time (UTC+7)
    'Asia/Makassar',          // Central Indonesian Time (UTC+8) 
    'Asia/Jayapura',          // Eastern Indonesian Time (UTC+9)
    
    // Philippines
    'Asia/Manila',            // Philippine Time (UTC+8)
    
    // Vietnam
    'Asia/Ho_Chi_Minh',       // Indochina Time (UTC+7)
    
    // Cambodia
    'Asia/Phnom_Penh',        // Indochina Time (UTC+7)
    
    // Laos
    'Asia/Vientiane',         // Indochina Time (UTC+7)
    
    // Myanmar (Burma)
    'Asia/Yangon',            // Myanmar Time (UTC+6:30)
    
    // Brunei
    'Asia/Brunei',            // Brunei Darussalam Time (UTC+8)
    
    // East Timor
    'Asia/Dili',              // East Timor Time (UTC+9)
    
    // Hong Kong
    'Asia/Hong_Kong',         // Hong Kong Time (UTC+8)
    
    // Macau
    'Asia/Macau',             // China Standard Time (UTC+8)
    
    // Taiwan
    'Asia/Taipei',            // China Standard Time (UTC+8)
  ];

  // Filter to only those the browser actually supports and sort
  const supportedTimezones = southeastAsianTimezones.filter(timezone => {
    try {
      Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date());
      return true;
    } catch {
      return false;
    }
  });

  // Convert to objects with labels and sort by label
  return supportedTimezones
    .map(timezone => ({
      value: timezone,
      label: formatSoutheastAsianTimezoneLabel(timezone)
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Format a Southeast Asian timezone identifier into a human-readable label
 * @param timezone - IANA timezone identifier
 * @returns Formatted label with timezone name and offset
 */
const formatSoutheastAsianTimezoneLabel = (timezone: string): string => {
  try {
    const now = new Date();
    
    // Get offset
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMinutes = (localDate.getTime() - utcDate.getTime()) / (1000 * 60);
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    
    const offsetString = offsetMins > 0 
      ? `${offsetSign}${offsetHours}:${String(offsetMins).padStart(2, '0')}`
      : `${offsetSign}${offsetHours}`;
    
    // Create descriptive names for Southeast Asian timezones
    const friendlyNames: Record<string, string> = {
      'Asia/Bangkok': 'Thailand Time',
      'Asia/Singapore': 'Singapore Time',
      'Asia/Kuala_Lumpur': 'Malaysia Time',
      'Asia/Jakarta': 'Western Indonesia Time',
      'Asia/Makassar': 'Central Indonesia Time',
      'Asia/Jayapura': 'Eastern Indonesia Time',
      'Asia/Manila': 'Philippines Time',
      'Asia/Ho_Chi_Minh': 'Vietnam Time',
      'Asia/Phnom_Penh': 'Cambodia Time',
      'Asia/Vientiane': 'Laos Time',
      'Asia/Yangon': 'Myanmar Time',
      'Asia/Brunei': 'Brunei Time',
      'Asia/Dili': 'East Timor Time',
      'Asia/Hong_Kong': 'Hong Kong Time',
      'Asia/Macau': 'Macau Time',
      'Asia/Taipei': 'Taiwan Time',
    };
    
    const friendlyName = friendlyNames[timezone] || timezone.split('/')[1]?.replace(/_/g, ' ') || timezone;
    return `${friendlyName} (UTC${offsetString})`;
  } catch (error) {
    console.error('Error formatting Southeast Asian timezone label:', error);
    return timezone;
  }
};

/**
 * Get all US and Canada timezones using the standard library approach
 * We can't directly get all timezone IDs from the standard library, but we can 
 * test against a comprehensive list of known North American zones
 * @returns Array of timezone objects with value and label
 */
export const getUSTimezones = () => {
  // Comprehensive list of US/Canada timezone IDs from IANA database
  // This covers all US states, territories, and major Canadian cities
  const allNorthAmericanTimezones = [
    // US Continental timezones
    'America/New_York',        // Eastern Time
    'America/Detroit',         // Eastern Time (Michigan)
    'America/Kentucky/Louisville', // Eastern Time (most of Kentucky)
    'America/Kentucky/Monticello', // Eastern Time (Wayne County, Kentucky)
    'America/Indiana/Indianapolis', // Eastern Time (most of Indiana)
    'America/Indiana/Vincennes',   // Eastern Time (Knox County, Indiana)
    'America/Indiana/Winamac',     // Eastern Time (Pulaski County, Indiana)
    'America/Indiana/Marengo',     // Eastern Time (Crawford County, Indiana)
    'America/Indiana/Petersburg',  // Eastern Time (Pike County, Indiana)
    'America/Indiana/Vevay',       // Eastern Time (Switzerland County, Indiana)
    
    'America/Chicago',         // Central Time
    'America/Indiana/Tell_City',   // Central Time (Perry County, Indiana)
    'America/Indiana/Knox',        // Central Time (Starke County, Indiana)
    'America/Menominee',          // Central Time (Menominee County, Michigan)
    'America/North_Dakota/Center', // Central Time (Oliver County, North Dakota)
    'America/North_Dakota/New_Salem', // Central Time (Morton County, North Dakota)
    'America/North_Dakota/Beulah',    // Central Time (Mercer County, North Dakota)
    
    'America/Denver',          // Mountain Time
    'America/Boise',          // Mountain Time (most of Idaho)
    
    'America/Phoenix',         // Mountain Standard Time (Arizona, no DST)
    
    'America/Los_Angeles',     // Pacific Time
    
    // Alaska
    'America/Anchorage',       // Alaska Time (most of Alaska)
    'America/Juneau',         // Alaska Time (Juneau area)
    'America/Sitka',          // Alaska Time (Sitka area)
    'America/Metlakatla',     // Alaska Time (Metlakatla)
    'America/Yakutat',        // Alaska Time (Yakutat)
    'America/Nome',           // Alaska Time (Nome)
    'America/Adak',           // Hawaii-Aleutian Time (Aleutian Islands)
    
    // Hawaii
    'Pacific/Honolulu',       // Hawaii-Aleutian Standard Time (no DST)
    
    // US Territories
    'America/Puerto_Rico',    // Atlantic Standard Time
    'America/St_Thomas',      // Atlantic Standard Time (US Virgin Islands)
    'Pacific/Guam',          // Chamorro Standard Time
    'Pacific/Saipan',        // Chamorro Standard Time (Northern Mariana Islands)
    'Pacific/Pago_Pago',     // Samoa Standard Time (American Samoa)
    'Pacific/Wake',          // Wake Island Time
    'Pacific/Midway',        // Samoa Standard Time (Midway Atoll)
    
    // Canada (major cities/provinces)
    'America/Toronto',        // Eastern Time (Ontario)
    'America/Montreal',       // Eastern Time (Quebec)
    'America/Halifax',        // Atlantic Time (Nova Scotia, New Brunswick)
    'America/St_Johns',       // Newfoundland Time
    'America/Winnipeg',       // Central Time (Manitoba)
    'America/Regina',         // Central Standard Time (Saskatchewan, no DST)
    'America/Calgary',        // Mountain Time (Alberta)
    'America/Edmonton',       // Mountain Time (Alberta)
    'America/Vancouver',      // Pacific Time (British Columbia)
    'America/Whitehorse',     // Mountain Standard Time (Yukon)
    'America/Yellowknife',    // Mountain Time (Northwest Territories)
    'America/Iqaluit',        // Eastern Time (Nunavut, eastern)
    'America/Rankin_Inlet',   // Central Time (Nunavut, central)
    'America/Cambridge_Bay',  // Mountain Time (Nunavut, western)
    
    // Mexico (North American part)
    'America/Mexico_City',    // Central Time
    'America/Tijuana',        // Pacific Time
    'America/Hermosillo',     // Mountain Standard Time (Sonora, no DST)
    'America/Mazatlan',       // Mountain Time (most of western Mexico)
    'America/Chihuahua',      // Mountain Time (Chihuahua)
    'America/Monterrey',      // Central Time (Nuevo León, Tamaulipas)
    'America/Merida',         // Central Time (Yucatan)
    'America/Cancun',         // Eastern Time (Quintana Roo)
  ];

  // Filter to only those the browser actually supports and sort
  const supportedTimezones = allNorthAmericanTimezones.filter(timezone => {
    try {
      Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date());
      return true;
    } catch {
      return false;
    }
  });

  // Convert to objects with labels and sort by label
  return supportedTimezones
    .map(timezone => ({
      value: timezone,
      label: formatTimezoneLabel(timezone)
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Format a timezone identifier into a human-readable label
 * @param timezone - IANA timezone identifier
 * @returns Formatted label with timezone name and offset
 */
const formatTimezoneLabel = (timezone: string): string => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || '';
    
    // Get offset
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMinutes = (localDate.getTime() - utcDate.getTime()) / (1000 * 60);
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    
    const offsetString = offsetMins > 0 
      ? `${offsetSign}${offsetHours}:${String(offsetMins).padStart(2, '0')}`
      : `${offsetSign}${offsetHours}`;
    
    // Create more descriptive names
    const friendlyNames: Record<string, string> = {
      // Major US zones
      'America/New_York': 'Eastern Time',
      'America/Chicago': 'Central Time',
      'America/Denver': 'Mountain Time',
      'America/Los_Angeles': 'Pacific Time',
      'America/Phoenix': 'Arizona Time (no DST)',
      'America/Anchorage': 'Alaska Time',
      'Pacific/Honolulu': 'Hawaii Time (no DST)',
      
      // Specific US locations
      'America/Detroit': 'Eastern Time (Michigan)',
      'America/Boise': 'Mountain Time (Idaho)',
      'America/Juneau': 'Alaska Time (Juneau)',
      'America/Nome': 'Alaska Time (Nome)',
      'America/Adak': 'Hawaii-Aleutian Time (Aleutian Islands)',
      
      // US Territories
      'America/Puerto_Rico': 'Atlantic Time (Puerto Rico)',
      'America/St_Thomas': 'Atlantic Time (US Virgin Islands)',
      'Pacific/Guam': 'Chamorro Time (Guam)',
      'Pacific/Saipan': 'Chamorro Time (Northern Mariana Islands)',
      'Pacific/Pago_Pago': 'Samoa Time (American Samoa)',
      
      // Canada
      'America/Toronto': 'Eastern Time (Toronto)',
      'America/Montreal': 'Eastern Time (Montreal)',
      'America/Halifax': 'Atlantic Time (Halifax)',
      'America/St_Johns': 'Newfoundland Time',
      'America/Winnipeg': 'Central Time (Winnipeg)',
      'America/Regina': 'Central Time (Saskatchewan, no DST)',
      'America/Calgary': 'Mountain Time (Calgary)',
      'America/Edmonton': 'Mountain Time (Edmonton)',
      'America/Vancouver': 'Pacific Time (Vancouver)',
      
      // Mexico
      'America/Mexico_City': 'Central Time (Mexico City)',
      'America/Tijuana': 'Pacific Time (Tijuana)',
      'America/Hermosillo': 'Mountain Time (Sonora, no DST)',
    };
    
    // Fall back to a more readable format if no friendly name exists
    let friendlyName = friendlyNames[timezone];
    if (!friendlyName) {
      // Convert something like "America/Kentucky/Louisville" to "Kentucky/Louisville"
      const parts = timezone.split('/');
      if (parts.length > 2) {
        friendlyName = parts.slice(1).join('/');
      } else if (parts.length === 2) {
        friendlyName = parts[1].replace(/_/g, ' ');
      } else {
        friendlyName = timeZoneName || timezone;
      }
    }
    return `${friendlyName} (UTC${offsetString})`;
  } catch (error) {
    console.error('Error formatting timezone label:', error);
    return timezone;
  }
};

/**
 * Convert a local datetime string and timezone to UTC
 * @param localDateTime - Local datetime string in format YYYY-MM-DDTHH:mm
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @returns UTC datetime string
 */
export const convertLocalToUTC = (localDateTime: string, timezone: string): string => {
  try {
    // Create a date string that specifies the timezone
    // This tells the Date constructor that this time is in the specified timezone
    const isoStringWithTimezone = localDateTime + ':00'; // Add seconds
    
    // The cleanest approach: use the fact that Date.parse understands ISO strings
    // But we need to manually account for the timezone offset
    const localDate = new Date(isoStringWithTimezone);
    
    // Get what this time would be in the target timezone vs UTC
    const nowUTC = new Date();
    const nowInTargetTZ = new Date(nowUTC.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMs = nowUTC.getTime() - nowInTargetTZ.getTime();
    
    // Apply the offset to convert from "local time in target timezone" to UTC
    const utcTime = new Date(localDate.getTime() + offsetMs);
    
    return utcTime.toISOString();
  } catch (error) {
    console.error('Error converting local time to UTC:', error);
    // Fallback: treat as local browser time
    return new Date(localDateTime).toISOString();
  }
};

/**
 * Convert UTC datetime to local timezone for display
 * @param utcDateTime - UTC datetime string
 * @param timezone - IANA timezone identifier
 * @returns Local datetime string in format YYYY-MM-DDTHH:mm
 */
export const convertUTCToLocal = (utcDateTime: string, timezone: string): string => {
  try {
    const utcDate = new Date(utcDateTime);
    
    // Convert to local timezone
    const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
    
    // Format for datetime-local input
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error converting UTC to local time:', error);
    // Fallback: treat as local time
    const date = new Date(utcDateTime);
    return date.toISOString().slice(0, 16);
  }
};

/**
 * Get user's current timezone
 * @returns IANA timezone identifier for user's current timezone
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Error getting user timezone:', error);
    return 'America/New_York'; // Default to Eastern Time
  }
};

 