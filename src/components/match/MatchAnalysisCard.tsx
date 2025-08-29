import React from 'react';
import { Brain, TrendingUp, BarChart3 } from 'lucide-react';
import { Match, MatchAnalysis } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';

interface MatchAnalysisCardProps {
  match: Match;
  analysis: MatchAnalysis | null;
  loading: boolean;
}

const MatchAnalysisCard: React.FC<MatchAnalysisCardProps> = ({ match, analysis, loading }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-bold">AI Match Analysis</h2>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={6} />
        </div>
      ) : !analysis ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          <p>Analysis not available for this match.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Win Probability Chart */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>Win Probability</span>
            </h3>
            
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
              <div className="relative pt-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold">{match.home_team.name}</span>
                  <span className="text-xs font-semibold">{match.away_team.name}</span>
                </div>
                <div className="flex h-6 overflow-hidden text-xs rounded-full">
                  <div
                    style={{ width: `${analysis.homeTeamWinProbability * 100}%` }}
                    className="flex flex-col justify-center text-center text-white bg-blue-600 whitespace-nowrap transition-all duration-500"
                  >
                    {Math.round(analysis.homeTeamWinProbability * 100)}%
                  </div>
                  <div
                    style={{ width: `${analysis.awayTeamWinProbability * 100}%` }}
                    className="flex flex-col justify-center text-center text-white bg-red-600 whitespace-nowrap transition-all duration-500"
                  >
                    {Math.round(analysis.awayTeamWinProbability * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Key Factors */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span>Key Factors</span>
            </h3>
            
            <ul className="space-y-2">
              {analysis.keyFactors.map((factor, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="inline-block w-5 h-5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-sm">{factor}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Recommendation */}
          {analysis.recommendation && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium mb-1">AI Recommendation</h3>
              <p className="text-sm">{analysis.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchAnalysisCard;