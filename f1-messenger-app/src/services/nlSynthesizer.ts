// Cursor-Grade Natural Language Synthesis for F1 Data
// Transforms raw MCP tool returns into conversational responses

export interface SynthesisStage {
  stage: 'extract' | 'summarize' | 'narrate';
  input: any;
  output: string;
}

export class NLSynthesizer {
  private fewShotExamples = `
Q: "Compare 2023 Suzuka fastest lap vs 2024 Bahrain"
A: Lewis Hamilton's 2023 Suzuka flyer (1:30.123) was 1.333 s quicker than Max Verstappen's 2024 Bahrain mark.

Q: "Who led the 2023 constructors after round 5?"
A: After five rounds Red Bull topped the table with 224 points, 67 clear of Mercedes.

Q: "2024 driver standings"
A: Max Verstappen leads the 2024 championship with 331 points, followed by Sergio Pérez (223) and Lewis Hamilton (201).

Q: "Sebastian Vettel 2012 standings"
A: Sebastian Vettel dominated the 2012 championship with 281 points and 5 wins, narrowly beating Fernando Alonso by just 3 points in a thrilling season finale.

Q: "analysis on redbull in 2011"
A: Red Bull dominated the 2011 season with Sebastian Vettel securing the championship with 392 points and 11 wins, while teammate Mark Webber finished third with 258 points.
`;

  /**
   * Stage 1: Extract - Flatten nested JSON → key metrics dict
   */
  private extract(data: any): Record<string, any> {
    const flat: Record<string, any> = {};
    
    if (!data) return flat;
    
    // Handle championship standings
    if (data.drivers && Array.isArray(data.drivers)) {
      flat.drivers = data.drivers.slice(0, 10); // Top 10
      flat.constructors = data.constructors?.slice(0, 5); // Top 5 teams
    }
    
    // Handle event schedule
    if (Array.isArray(data) && data.length > 0) {
      flat.events = data.slice(0, 10); // First 10 events
    }
    
    // Handle driver performance
    if (data.DriverCode || data.TotalLaps || data.FastestLap) {
      flat.performance = {
        driver: data.DriverCode,
        totalLaps: data.TotalLaps,
        fastestLap: data.FastestLap,
        avgLapTime: data.AverageLapTime
      };
    }
    
    // Handle session results
    if (Array.isArray(data) && data.length > 0 && data[0].position) {
      flat.results = data.slice(0, 10); // Top 10 finishers
    }
    
    return flat;
  }

  /**
   * Stage 2: Summarize - Generate bullet facts from extracted data
   */
  private summarize(extracted: Record<string, any>): string {
    const facts: string[] = [];
    
    // Championship standings
    if (extracted.drivers) {
      const top3 = extracted.drivers.slice(0, 3);
      top3.forEach((driver: any, index: number) => {
        const ordinal = this.getOrdinal(parseInt(driver.position));
        facts.push(`${ordinal} place: ${driver.givenName} ${driver.familyName} (${driver.driverCode}) with ${driver.points} points and ${driver.wins} wins`);
      });
      
      if (extracted.constructors) {
        const topTeam = extracted.constructors[0];
        facts.push(`Constructors champion: ${topTeam.constructorName} with ${topTeam.points} points`);
      }
    }
    
    // Event schedule
    if (extracted.events) {
      const firstEvent = extracted.events[0];
      const lastEvent = extracted.events[extracted.events.length - 1];
      facts.push(`Season runs from ${firstEvent.EventDate || firstEvent.eventDate} to ${lastEvent.EventDate || lastEvent.eventDate}`);
      facts.push(`Total of ${extracted.events.length} Grand Prix events`);
    }
    
    // Driver performance
    if (extracted.performance) {
      const perf = extracted.performance;
      if (perf.totalLaps) facts.push(`Completed ${perf.totalLaps} laps`);
      if (perf.fastestLap) facts.push(`Fastest lap: ${perf.fastestLap}`);
      if (perf.avgLapTime) facts.push(`Average lap time: ${perf.avgLapTime.toFixed(2)}s`);
    }
    
    // Session results
    if (extracted.results) {
      const winner = extracted.results[0];
      facts.push(`Winner: ${winner.givenName} ${winner.familyName} (${winner.driverCode})`);
      if (winner.lapTime) facts.push(`Winning time: ${winner.lapTime}`);
    }
    
    return facts.join('. ') + '.';
  }

  /**
   * Stage 3: Narrate - Create conversational wrap-up
   */
  private narrate(query: string, facts: string): string {
    const queryLower = query.toLowerCase();
    
    // Championship queries
    if (queryLower.includes('championship') || queryLower.includes('standings')) {
      if (queryLower.includes('vettel') || queryLower.includes('redbull') || queryLower.includes('red bull')) {
        return `🏆 ${facts}`;
      }
      return `📊 ${facts}`;
    }
    
    // Schedule queries
    if (queryLower.includes('schedule') || queryLower.includes('calendar')) {
      return `📅 ${facts}`;
    }
    
    // Performance queries
    if (queryLower.includes('performance') || queryLower.includes('stats')) {
      return `🏁 ${facts}`;
    }
    
    // Default
    return facts;
  }

  /**
   * Main synthesis method
   */
  public synthesize(query: string, data: any): string {
    try {
      // Stage 1: Extract
      const extracted = this.extract(data);
      
      // Stage 2: Summarize
      const facts = this.summarize(extracted);
      
      // Stage 3: Narrate
      const narrative = this.narrate(query, facts);
      
      return narrative.trim();
    } catch (error) {
      console.error('Synthesis error:', error);
      return `📊 Data retrieved successfully. ${JSON.stringify(data).substring(0, 100)}...`;
    }
  }

  /**
   * Helper: Convert numbers to ordinal names
   */
  private getOrdinal(num: number): string {
    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
    return ordinals[num - 1] || `${num}th`;
  }

  /**
   * Helper: Format time differences
   */
  public formatDelta(seconds: number): string {
    if (seconds < 0) {
      return `${Math.abs(seconds).toFixed(3)} s slower`;
    }
    return `${seconds.toFixed(3)} s quicker`;
  }
}

// Export singleton instance
export const nlSynthesizer = new NLSynthesizer(); 