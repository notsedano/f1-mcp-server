// Shared F1 Tool Calling Utility
// Eliminates duplicate code between server and endpoint

/**
 * Call F1 tools recursively with follow-up support
 * Shared utility to eliminate code duplication
 */
import { normalizeDriverIdentifier } from '../services/driverMapping';

// Prefer IPv4 loopback to avoid ::1 binding issues; allow override
const BRIDGE_URL = (process.env.BRIDGE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

export async function callF1ToolsRecursive(queryPlan: any, depth: number = 0): Promise<any> {
  const MAX_DEPTH = 3;
  if (depth >= MAX_DEPTH) {
    return { error: 'Max recursion depth reached' };
  }
  
  // Validate query plan
  if (!queryPlan || !queryPlan.tool) {
    console.log(`⚠️ [Depth ${depth}] Skipping invalid query plan:`, queryPlan);
    return { error: 'Invalid query plan - no tool specified' };
  }
  
  try {
    console.log(`🔄 [Depth ${depth}] Calling F1 tool:`, queryPlan.tool, 'with args:', queryPlan.arguments);
    // Normalize arguments for known schema quirks
    const normalizedArgs: any = { ...(queryPlan.arguments || {}) };
    // compare_drivers expects a comma-separated string, not an array
    if (queryPlan.tool === 'compare_drivers') {
      if (Array.isArray(normalizedArgs.session_name)) {
        // Pick Race by default if multiple provided
        normalizedArgs.session_name = 'Race';
      }
      if (Array.isArray(normalizedArgs.drivers)) {
        normalizedArgs.drivers = normalizedArgs.drivers.join(',');
      }
    }
    const requestBody = { name: queryPlan.tool, arguments: normalizedArgs };
    console.log(`📤 [Depth ${depth}] Sending request to bridge:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${BRIDGE_URL}/mcp/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Bridge request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ [Depth ${depth}] F1 tool response received`);
    
    // Check for successful response with proper nested structure
    const isSuccess = result.status === 'success' && result.data && result.data.status === 'success';
    
    if (queryPlan.followUp && queryPlan.followUp.tool && isSuccess) {
      console.log(`🔄 [Depth ${depth}] Executing follow-up tool:`, queryPlan.followUp.tool);
      
      // Extract race information from schedule data for follow-up
      const followUpPlan = { ...queryPlan.followUp };
      // Normalize follow-up arguments object
      followUpPlan.arguments = { ...(followUpPlan.arguments || {}) };
      if (queryPlan.tool === 'get_event_schedule' && queryPlan.followUp.tool === 'get_session_results') {
        const scheduleInner = (result?.data?.data) ?? result?.data;
        const lastRace = extractLastRaceFromSchedule(scheduleInner);
        if (lastRace) {
          followUpPlan.arguments.event_identifier = lastRace;
          console.log(`📍 [Depth ${depth}] Extracted last race: ${lastRace}`);
        }
      }

      // Populate compare_drivers drivers from standings if missing/placeholder
      if (queryPlan.tool === 'get_championship_standings' && followUpPlan.tool === 'compare_drivers') {
        const standingsData = (result?.data?.data) ?? result?.data;
        const driverRows: any[] = standingsData?.drivers || [];
        const top3Codes: string[] = [];
        for (let i = 0; i < Math.min(3, driverRows.length); i++) {
          const row = driverRows[i] || {};
          let code = row.DriverCode || row.code || row['Driver code'];
          if (typeof code === 'string' && code.length === 3) {
            top3Codes.push(code.toUpperCase());
            continue;
          }
          // Try to derive from name fields
          const name = row.DriverName || row.driver || row.Driver || row['Driver Name'] || '';
          if (typeof name === 'string' && name.trim().length > 0) {
            top3Codes.push(normalizeDriverIdentifier(name));
            continue;
          }
          // Try to regex extract code from serialized Driver object text
          const serialized = JSON.stringify(row);
          const match = serialized.match(/code['"]?\s*[:=]\s*['"]?([A-Za-z]{3})['"]?/);
          if (match && match[1]) {
            top3Codes.push(match[1].toUpperCase());
          }
        }
        if (top3Codes.length > 0) {
          followUpPlan.arguments.drivers = top3Codes.join(',');
        }
        // Ensure event identifier is concrete; resolve last race if placeholder/absent
        const ev = followUpPlan.arguments.event_identifier;
        if (!ev || /all/i.test(ev)) {
          // Fetch schedule to resolve last completed event
          const scheduleReq = { name: 'get_event_schedule', arguments: { year: followUpPlan.arguments.year } };
          console.log(`📤 [Depth ${depth}] Resolving last event for compare via schedule`);
          const scheduleResp = await fetch(`${BRIDGE_URL}/mcp/tool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scheduleReq)
          });
          if (scheduleResp.ok) {
            const scheduleJson = await scheduleResp.json();
            const scheduleInner = scheduleJson?.data?.data ?? scheduleJson?.data;
            const lastRace = extractLastRaceFromSchedule(scheduleInner);
            if (lastRace) {
              followUpPlan.arguments.event_identifier = lastRace;
              console.log(`📍 [Depth ${depth}] compare_drivers event set to: ${lastRace}`);
            }
          }
        }
        // Final fallback: if we still lack drivers, derive top 3 codes from last race results
        if (!followUpPlan.arguments.drivers) {
          const scheduleReq2 = { name: 'get_event_schedule', arguments: { year: followUpPlan.arguments.year } };
          const schedResp2 = await fetch(`${BRIDGE_URL}/mcp/tool`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scheduleReq2)
          });
          if (schedResp2.ok) {
            const schedJson2 = await schedResp2.json();
            const schedInner2 = schedJson2?.data?.data ?? schedJson2?.data;
            const lastRace2 = extractLastRaceFromSchedule(schedInner2);
            if (lastRace2) {
              const resReq = { name: 'get_session_results', arguments: { year: followUpPlan.arguments.year, event_identifier: lastRace2, session_name: 'Race' } };
              const resResp = await fetch(`${BRIDGE_URL}/mcp/tool`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resReq) });
              if (resResp.ok) {
                const resJson = await resResp.json();
                const resData = resJson?.data?.data ?? resJson?.data;
                if (Array.isArray(resData) && resData.length >= 14) {
                  const positionData = resData[13];
                  const codes = resData[2];
                  const podiumDriverIds = Object.entries(positionData)
                    .filter(([, position]) => !isNaN(parseInt(position as string)) && parseInt(position as string) >= 1 && parseInt(position as string) <= 3)
                    .sort(([, a], [, b]) => parseInt(a as string) - parseInt(b as string))
                    .map(([driverId]) => String(driverId));
                  const podiumCodes = podiumDriverIds.map(id => (codes as any)[id]).filter(Boolean).slice(0, 3);
                  if (podiumCodes.length > 0) {
                    followUpPlan.arguments.drivers = podiumCodes.join(',');
                    followUpPlan.arguments.event_identifier = lastRace2;
                    console.log(`📍 [Depth ${depth}] compare_drivers drivers set from last race: ${followUpPlan.arguments.drivers}`);
                  }
                }
              }
            }
          }
        }
      }

      // Ensure compare_drivers drivers string and single session name
      if (followUpPlan.tool === 'compare_drivers') {
        if (Array.isArray(followUpPlan.arguments.session_name)) {
          followUpPlan.arguments.session_name = 'Race';
        }
        if (Array.isArray(followUpPlan.arguments.drivers)) {
          followUpPlan.arguments.drivers = followUpPlan.arguments.drivers.join(',');
        }
        // Drop placeholder driver tokens to avoid bridge errors
        const drv = followUpPlan.arguments.drivers;
        if (typeof drv === 'string' && /(DRIVER1|DRIVER2|DRIVER3|Top 3)/i.test(drv)) {
          console.log(`⚠️ [Depth ${depth}] Removing placeholder drivers from follow-up to avoid errors`);
          delete followUpPlan.arguments.drivers;
        }
      }

      // Replace invalid analyze_driver_performance placeholders
      if (followUpPlan.tool === 'analyze_driver_performance') {
        const id = followUpPlan.arguments.driver_identifier;
        if (typeof id === 'string' && /Top 3/i.test(id)) {
          console.log(`⚠️ [Depth ${depth}] Invalid driver placeholder in follow-up; dropping follow-up`);
          // Skip executing this unusable follow-up
          return result;
        }
      }
      
      // As a final guard: avoid calling compare_drivers without drivers to prevent 500
      if (followUpPlan.tool === 'compare_drivers' && !followUpPlan.arguments.drivers) {
        console.log(`⚠️ [Depth ${depth}] Skipping compare_drivers due to missing drivers after normalization`);
        return result;
      }
      const followUpResult = await callF1ToolsRecursive(followUpPlan, depth + 1);
      return { primaryResult: result, followUpResult, combined: true };
    }
    
    return result;
  } catch (error) {
    console.error(`❌ [Depth ${depth}] F1 tools call failed:`, error);
    throw error;
  }
}

/**
 * Extract the last race from schedule data
 * Shared utility for race identification
 */
export function extractLastRaceFromSchedule(scheduleData: any[]): string | null {
  if (!Array.isArray(scheduleData)) return null;
  
  const currentDate = new Date();
  const races = scheduleData.filter((race: any) => {
    if (!race.EventDate) return false;
    const raceDate = new Date(race.EventDate);
    return raceDate < currentDate && race.EventFormat !== 'testing';
  });
  
  if (races.length === 0) return null;
  
  const lastRace = races[races.length - 1];
  if (lastRace.OfficialEventName) {
    // Extract just the race name from the full event name
    const eventName = lastRace.OfficialEventName;
    if (eventName.includes('BELGIAN GRAND PRIX')) return 'Belgian Grand Prix';
    if (eventName.includes('BRITISH GRAND PRIX')) return 'British Grand Prix';
    if (eventName.includes('HUNGARIAN GRAND PRIX')) return 'Hungarian Grand Prix';
    if (eventName.includes('DUTCH GRAND PRIX')) return 'Dutch Grand Prix';
    if (eventName.includes('ITALIAN GRAND PRIX')) return 'Italian Grand Prix';
    if (eventName.includes('SINGAPORE GRAND PRIX')) return 'Singapore Grand Prix';
    if (eventName.includes('JAPANESE GRAND PRIX')) return 'Japanese Grand Prix';
    if (eventName.includes('QATAR GRAND PRIX')) return 'Qatar Grand Prix';
    if (eventName.includes('UNITED STATES GRAND PRIX')) return 'United States Grand Prix';
    if (eventName.includes('MEXICAN GRAND PRIX')) return 'Mexican Grand Prix';
    if (eventName.includes('BRAZILIAN GRAND PRIX')) return 'Brazilian Grand Prix';
    if (eventName.includes('LAS VEGAS GRAND PRIX')) return 'Las Vegas Grand Prix';
    if (eventName.includes('ABU DHABI GRAND PRIX')) return 'Abu Dhabi Grand Prix';
    if (eventName.includes('AUSTRALIAN GRAND PRIX')) return 'Australian Grand Prix';
    if (eventName.includes('CHINESE GRAND PRIX')) return 'Chinese Grand Prix';
    if (eventName.includes('MIAMI GRAND PRIX')) return 'Miami Grand Prix';
    if (eventName.includes('EMILIA ROMAGNA GRAND PRIX')) return 'Emilia Romagna Grand Prix';
    if (eventName.includes('MONACO GRAND PRIX')) return 'Monaco Grand Prix';
    if (eventName.includes('CANADIAN GRAND PRIX')) return 'Canadian Grand Prix';
    if (eventName.includes('SPANISH GRAND PRIX')) return 'Spanish Grand Prix';
    if (eventName.includes('AUSTRIAN GRAND PRIX')) return 'Austrian Grand Prix';
    if (eventName.includes('SAUDI ARABIAN GRAND PRIX')) return 'Saudi Arabian Grand Prix';
    if (eventName.includes('BAHRAIN GRAND PRIX')) return 'Bahrain Grand Prix';
  }
  
  return lastRace.Country + ' Grand Prix';
} 