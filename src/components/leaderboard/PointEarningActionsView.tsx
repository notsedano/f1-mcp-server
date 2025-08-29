/**
 * PointEarningActionsView - Configurable container for point-earning actions
 * 
 * Displays available point-earning actions with current point values.
 * Fetches live configuration data from the database for remote management.
 */

import React, { useState, useEffect } from 'react';
import { 
  PointModifiableActionConfiguration,
  pointModifiableActionConfigurationsService 
} from '../../services/pointModifiableActionConfigurationsService';

const PointEarningActionsView: React.FC = () => {
  const [actions, setActions] = useState<PointModifiableActionConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPointActions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const configurations = await pointModifiableActionConfigurationsService.getEnabledPointModifiableActionConfigurations();
        setActions(configurations);
      } catch (err) {
        console.error('Error fetching point configurations:', err);
        setError('Failed to load point actions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPointActions();
  }, []);

  // Convert action keys to user-friendly display names
  const getActionDisplayName = (actionKey: string): string => {
    const actionNames: Record<string, string> = {
      'CREATED_NEW_ACCOUNT': 'Sign up for a new account',
      'MATCHED_STRAIGHT_BET': 'Place a bet that gets matched',
      'WON_STRAIGHT_BET': 'Win a straight bet',
      'REFERRED_NEW_USER': 'Refer a new user',
      'LOGGED_IN_FOR_THE_FIRST_TIME_TODAY': 'Daily login bonus'
    };
    
    return actionNames[actionKey] || actionKey.toLowerCase().replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <span className="text-console-white-muted font-mono text-sm">Loading actions...</span>
      </div>
    );
  }

  if (error || actions.length === 0) {
    return (
      <div className="text-center py-2">
        <span className="text-console-white-muted font-mono text-sm">
          {error || 'No point-earning actions available'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-console-blue-bright font-mono text-sm uppercase tracking-wider text-center">
        Available Actions
      </h3>
      
      <div className="space-y-2">
        {actions.map((action) => (
          <div 
            key={action.id} 
            className="flex items-center justify-between bg-console-black/60 border-1 border-console-blue/30 p-2 hover:border-console-blue/60 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {/* Action bullet point */}
              <div className="w-1 h-1 bg-console-blue-bright rounded-full flex-shrink-0"></div>
              
              {/* Action name */}
              <span className="text-console-white font-mono text-sm">
                {getActionDisplayName(action.action_key)}
              </span>
            </div>
            
            {/* Point value */}
            <div className="flex items-center space-x-1">
              <span className="text-console-blue-bright font-mono text-sm font-bold">
                +{action.current_value}
              </span>
              <span className="text-console-white-muted font-mono text-xs">
                pts
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PointEarningActionsView;