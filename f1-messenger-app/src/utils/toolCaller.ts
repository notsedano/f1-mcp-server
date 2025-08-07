// Shared F1 Tool Calling Utility
// Eliminates duplicate code between server and endpoint

/**
 * Call F1 tools recursively with follow-up support
 * Shared utility to eliminate code duplication
 */
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
    const requestBody = { name: queryPlan.tool, arguments: queryPlan.arguments };
    console.log(`📤 [Depth ${depth}] Sending request to bridge:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('http://localhost:3001/mcp/tool', {
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
      if (queryPlan.tool === 'get_event_schedule' && queryPlan.followUp.tool === 'get_session_results') {
        const lastRace = extractLastRaceFromSchedule(result.data.data);
        if (lastRace) {
          followUpPlan.arguments.event_identifier = lastRace;
          console.log(`📍 [Depth ${depth}] Extracted last race: ${lastRace}`);
        }
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