# DareDevil NBA Analytics Chatbot

DareDevil is an AI chatbot persona that automatically responds to NBA-related keywords and direct mentions in the chat. This README explains how it works and how to update it.

## Overview

DareDevil is designed to:
- Monitor all chat messages across global, bet-specific, and match-specific chat rooms
- Respond to NBA-related keywords and direct mentions of "DareDevil" or "Dare Devil"
- Provide NBA predictions, analytics, and insights for the 2025 season
- Display a distinctive red styling with an analytics-focused personality

## How It Works

1. The `dareDevilService.ts` file contains the core logic:
   - `shouldDareDevilRespond()` - Determines if a message should trigger a response
   - `generateDareDevilResponse()` - Creates a response based on the trigger type
   - `getDareDevilResponseDelay()` - Adds a realistic typing delay

2. Keywords that trigger responses include:
   - NBA team names (Lakers, Celtics, Warriors, etc.)
   - Basketball terms (playoffs, championship, draft, etc.)
   - Player names (LeBron, Curry, Durant, etc.)
   - Direct mentions of "DareDevil" or "Dare Devil"

3. The responses are organized in categories:
   - Direct responses (when DareDevil is specifically mentioned)
   - NBA 2025 predictions (general basketball insights)
   - Team-specific responses
   - Betting advice
   - Rookie insights

## How to Update

### Adding New Responses

1. Edit the `src/data/daredevil-responses.txt` file
2. Add new responses under the appropriate category
3. The service will automatically use these responses

### Modifying Keywords

To change which keywords trigger DareDevil:

1. Edit the `NBA_KEYWORDS` array in `src/services/dareDevilService.ts`
2. Add or remove keywords as needed

### Styling Changes

DareDevil's appearance is controlled by:

1. `src/components/chat/DareDevilMessage.tsx` - The message component
2. The `.shadow-glow-red` class in CSS

## Future Development

This implementation is a placeholder for a more advanced ElizaOS agent. When ready to upgrade:

1. Replace the static responses with a true RAG (Retrieval Augmented Generation) system
2. Connect to real-time NBA data sources
3. Implement more sophisticated conversation tracking
4. Add personalized responses based on user history

## Notes for Developers

- DareDevil's sender address is `0xDARE0DEVIL1NBA2ANALYTICS3EXPERT4PREDICTIONS`
- The typing indicator creates a realistic "thinking" effect before responses
- The status indicator in the chat header shows when DareDevil is "analyzing" 