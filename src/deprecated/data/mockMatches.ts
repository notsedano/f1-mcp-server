/**
 * @deprecated This file is deprecated and should no longer be used.
 * Do not add new functionality to this file.
 * This file will be removed in a future version.
 */

import { Match } from '../../types';

// Mock matches that correspond to the bet match IDs in mockBets.ts
export const MOCK_MATCHES: Match[] = [
  {
    id: 'a704b5a09bc4a7d7f28930aa6e964db7',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Tomorrow
    home_team: {
      id: '7b1c2c17-f0df-4ea7-9a98-902bc2751c67',
      name: 'Los Angeles Lakers',
      logo: 'https://content.sportslogos.net/logos/6/237/thumbs/uig7aiht8jnpl1szbi57zzlsh.gif'
    },
    away_team: {
      id: '583ecae2-fb46-11e1-82cb-f4ce4684ea4c',
      name: 'Miami Heat',
      logo: 'https://content.sportslogos.net/logos/6/214/thumbs/burm5gh2wvjti3xhei5h16k8e.gif'
    },
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Los Angeles Lakers', price: 1.91 },
              { name: 'Miami Heat', price: 1.95 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'c0d28176ae9aae71aad8f45f95641f9c',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 2 days from now
    home_team: {
      id: '583ece50-fb46-11e1-82cb-f4ce4684ea4c',
      name: 'Boston Celtics',
      logo: 'https://content.sportslogos.net/logos/6/213/thumbs/slhg02hbef3j1ov4lsnwyol5o.gif'
    },
    away_team: {
      id: '583ecfa8-fb46-11e1-82cb-f4ce4684ea4c',
      name: 'Philadelphia 76ers',
      logo: 'https://content.sportslogos.net/logos/6/218/thumbs/qlpk0etqj8v07lrfhh9og3z9o.gif'
    },
    bookmakers: [
      {
        key: 'fanduel',
        title: 'FanDuel',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Boston Celtics', price: 1.7 },
              { name: 'Philadelphia 76ers', price: 2.25 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '9396e7db11c600a00f24cc54dc99abd1',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(), // 3 days from now
    home_team: {
      id: '583ed0ac-fb46-11e1-82cb-f4ce4684ea4c',
      name: 'Golden State Warriors',
      logo: 'https://content.sportslogos.net/logos/6/235/thumbs/23531522020.gif'
    },
    away_team: {
      id: '583ed102-fb46-11e1-82cb-f4ce4684ea4c',
      name: 'Los Angeles Clippers',
      logo: 'https://content.sportslogos.net/logos/6/236/thumbs/23654622016.gif'
    },
    bookmakers: [
      {
        key: 'betmgm',
        title: 'BetMGM',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Golden State Warriors', price: 1.83 },
              { name: 'Los Angeles Clippers', price: 2.05 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'c6c42068d7e39ca44bd64dfe64b649d5',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(), // 1.5 days from now
    home_team: {
      id: '583ecda6-fb46-11e1-82cb-f4ce4684ea4c',
      name: 'Milwaukee Bucks',
      logo: 'https://content.sportslogos.net/logos/6/225/thumbs/22582752016.gif'
    },
    away_team: {
      id: '583eccfa-fb46-11e1-82cb-f4ce4684ea4c',
      name: 'Chicago Bulls',
      logo: 'https://content.sportslogos.net/logos/6/221/thumbs/hj3gmh82w9hffmeh3fjm5h874.gif'
    },
    bookmakers: [
      {
        key: 'pointsbet',
        title: 'PointsBet',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Milwaukee Bucks', price: 1.65 },
              { name: 'Chicago Bulls', price: 2.35 }
            ]
          }
        ]
      }
    ]
  }
]; 