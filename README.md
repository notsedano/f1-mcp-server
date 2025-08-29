<<<<<<< HEAD
# Formula One MCP Server

[![PyPI version](https://img.shields.io/pypi/v/f1-mcp-server.svg)](https://pypi.org/project/f1-mcp-server/)
[![Python Versions](https://img.shields.io/pypi/pyversions/f1-mcp-server.svg)](https://pypi.org/project/f1-mcp-server/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![smithery badge](https://smithery.ai/badge/@Machine-To-Machine/f1-mcp-server)](https://smithery.ai/server/@Machine-To-Machine/f1-mcp-server)

A Model Context Protocol (MCP) server that provides Formula One racing data. This package exposes various tools for querying F1 data including event schedules, driver information, telemetry data, and race results.

<a href="https://glama.ai/mcp/servers/@Machine-To-Machine/f1-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Machine-To-Machine/f1-mcp-server/badge" alt="Formula One Server (Python) MCP server" />
</a>

## Features

- **Event Schedule**: Access the complete F1 race calendar for any season
- **Event Information**: Detailed data about specific Grand Prix events
- **Session Results**: Comprehensive results from races, qualifying sessions, sprints, and practice sessions
- **Driver Information**: Access driver details for specific sessions
- **Performance Analysis**: Analyze a driver's performance with lap time statistics
- **Driver Comparison**: Compare multiple drivers' performances in the same session
- **Telemetry Data**: Access detailed telemetry for specific laps
- **Championship Standings**: View driver and constructor standings for any season

## Installation

### Installing via Smithery

To install f1-mcp-server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@Machine-To-Machine/f1-mcp-server):

```bash
npx -y @smithery/cli install @Machine-To-Machine/f1-mcp-server --client claude
```

### Manual Installation
In a `uv` managed python project, add to dependencies by:

```bash
uv add f1-mcp-server
```

Alternatively, for projects using `pip` for dependencies:
```bash
pip install f1-mcp-server
```

To run the server inside your project:

```bash
uv run f1-mcp-server
```

Or to run it globally in isolated environment:

```bash
uvx f1-mcp-server
```

To install directly from the source:

```bash
git clone https://github.com/Machine-To-Machine/f1-mcp-server.git
cd f1-mcp-server
pip install -e .
```

## Usage

### Command Line

The server can be run in two modes:

**Standard I/O mode** (default):

```bash
uvx run f1-mcp-server
```

**SSE transport mode** (for web applications):

```bash
uvx f1-mcp-server --transport sse --port 8000
```

### Python API

```python
from f1_mcp_server import main

# Run the server with default settings
main()

# Or with SSE transport settings
main(port=9000, transport="sse")
```

## API Documentation

The server exposes the following tools via MCP:

| Tool Name | Description |
|-----------|-------------|
| `get_event_schedule` | Get Formula One race calendar for a specific season |
| `get_event_info` | Get detailed information about a specific Formula One Grand Prix |
| `get_session_results` | Get results for a specific Formula One session |
| `get_driver_info` | Get information about a specific Formula One driver |
| `analyze_driver_performance` | Analyze a driver's performance in a Formula One session |
| `compare_drivers` | Compare performance between multiple Formula One drivers |
| `get_telemetry` | Get telemetry data for a specific Formula One lap |
| `get_championship_standings` | Get Formula One championship standings |

See the FastF1 documentation for detailed information about the underlying data: [FastF1 Documentation](https://theoehrly.github.io/Fast-F1/)

## Dependencies

- anyio (>=4.9.0)
- click (>=8.1.8)
- fastf1 (>=3.5.3)
- mcp (>=1.6.0)
- numpy (>=2.2.4)
- pandas (>=2.2.3)
- uvicorn (>=0.34.0)

## Development

### Setup Development Environment

```bash
git clone https://github.com/Machine-To-Machine/f1-mcp-server.git
cd f1-mcp-server
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

### Code Quality

```bash
# Run linting
uv run ruff check .

# Run formatting check
uv run ruff format --check .

# Run security checks
uv run bandit -r src/
```

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
=======
# AgentDD - NBA Betting Platform

A modern NBA betting platform with a cyberpunk terminal aesthetic, featuring DARE points, real-time odds, and an integrated chat system.

## Features

- **NBA Betting System** with real-time odds and match data
- **DARE Points Economy** with automatic signup bonuses and configurable rewards
- **Dual Authentication** - Email and Web3 wallet support
- **Chat System** with match-specific and global channels
- **Terminal-inspired UI** with cyberpunk aesthetic
- **Real-time Updates** via Supabase
- **Responsive Design** for all devices

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account (for full functionality)

### Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd agentdd
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp src/env.example .env
   # Add your Supabase credentials to .env
   ```

3. **Database Setup**
   ```bash
   npx supabase db push
   ```
   
   See `docs/setup-database.md` for detailed instructions.

4. **Start Development**
   ```bash
   npm run dev
   ```

## Documentation

Comprehensive documentation is available in the `docs/` folder:

### System Documentation
- **[Points System](docs/POINTS_README.md)** - DARE points economy and rewards
- **[Database Setup](docs/setup-database.md)** - Database configuration and deployment
- **[User Accounts](docs/USER_ACCOUNTS_README.md)** - User account system and authentication
- **[Matches System](docs/MATCHES_TABLE_README.md)** - NBA match data and betting

### Technical Documentation  
- **[Points Configuration](docs/POINTS_CONFIG_README.md)** - Configurable point values and admin controls
- **[Points Transactions](docs/POINTS_TRANSACTIONS_README.md)** - Transaction system and audit trail
- **[Schema Design](docs/POINTS_SCHEMA_DESIGN.md)** - Database schema and relationships

## Key Features

### DARE Points System
- **Automatic Signup Bonus**: 500 points via database triggers
- **Betting Rewards**: Configurable bonuses for bets and wins
- **Audit Trail**: Complete transaction history
- **Dual Signup Support**: Email and wallet users both get bonuses

### Authentication
- **Email Authentication** via Supabase Auth
- **Web3 Wallet Connection** with automatic account creation
- **Unified User Experience** across both auth methods

### Database Architecture
- **PostgreSQL** with Supabase hosting
- **Database Triggers** for automatic bonus awarding
- **RPC Functions** for complex operations
- **Row Level Security** for data protection

### Application Architecture
- **Separation of Concerns**: Dedicated React contexts for different data domains
  - `MatchesContext`: Manages match data with configurable data sources
  - `BettingContext`: Handles betting operations and user bet management
  - `PointsContext`: Manages points economy and transactions
  - `AuthContext`: Handles user authentication and sessions
- **Configuration-Driven**: Uses `USE_REMOTE_DATABASE` flag to control data fetching strategy
- **Flexible Data Sources**: Supports database, external APIs, and mock data with intelligent fallbacks

## Technologies

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: React Context API
- **Web3**: Wallet connection and authentication
- **Deployment**: Vercel

## Development

### Project Structure
```
agentdd/
├── docs/              # Documentation
├── src/
│   ├── components/    # React components
│   ├── context/       # React contexts
│   ├── services/      # API and business logic
│   ├── pages/         # Page components
│   └── types/         # TypeScript types
├── supabase/
│   └── migrations/    # Database migrations
└── public/           # Static assets
```

### Database Migrations
All database changes are managed through Supabase migrations:
```bash
npx supabase db diff     # See pending changes
npx supabase db push    # Apply migrations
npx supabase db reset   # Reset and reapply all
```

## Deployment

The application is deployed on Vercel with automatic deployments from the main branch.

**Live URL**: agentdd.vercel.app

## Contributing

1. Read the documentation in `docs/`
2. Set up your development environment
3. Make your changes
4. Test thoroughly
>>>>>>> add-core-chain-integration
5. Submit a pull request

## License

<<<<<<< HEAD
This project is licensed under the MIT License - see the LICENSE file for details.

## Authors

- **Machine To Machine**

## Acknowledgements

This project leverages `FastF1`, an excellent Python package for accessing Formula 1 data. We are grateful to its maintainers and contributors.

This project was inspired by [rakeshgangwar/f1-mcp-server](https://github.com/rakeshgangwar/f1-mcp-server) which was written in TypeScript. The `f1_data.py` module was mostly adapted from their source code.
=======
MIT License - see LICENSE file for details.

## Maintainer

agentdd.vercel.app 

## Deployment Status

- Latest updates include UI improvements with fixed navbar layout
- Added fallback.html for error handling in Vercel deployments
- Fixed Git configuration to ensure correct user attribution
- Deployed and maintained by sedanoNPC 

## Branch v05a
This is a change made on the v05a branch. 
>>>>>>> add-core-chain-integration
