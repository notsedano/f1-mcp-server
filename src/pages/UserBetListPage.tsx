import React, { useState, useEffect } from 'react';
import { RefreshCw, Filter, List, Archive } from 'lucide-react';
import { useStraightBets } from '../context/StraightBetsContext';
import { StraightBetStatus } from '../services/straightBetsService';
import UserBetCard from '../components/bet/UserBetCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
// import BetDetailsModal from '../components/bet/BetDetailsModal'; // REMOVED: Legacy component
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import SportsIcon from '@mui/icons-material/Sports';

const UserBetListPage: React.FC = () => {
  const { 
    userBets, 
    isLoadingUserBets, 
    fetchUserBets, 
    refreshUserBets 
  } = useStraightBets();

  // Add debugging logs
  console.log('=== USER BET LIST PAGE: Render ===', {
    userBetsLength: userBets.length,
    isLoadingUserBets,
    userBets: userBets.map(bet => ({
      id: bet.id,
      creatorUserId: bet.creatorUserId,
      amount: bet.amount,
      status: bet.status
    }))
  });

  // Filter state
  const [selectedStatus, setSelectedStatus] = useState<StraightBetStatus | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateBetModal, setShowCreateBetModal] = useState(false);
  const [selectedBetForDetails, setSelectedBetForDetails] = useState<any>(null);
  const [showBetDetailsModal, setShowBetDetailsModal] = useState(false);
  const navigate = useNavigate();

  // Status filter options
  const statusOptions: Array<{ value: StraightBetStatus | 'all'; label: string; icon: any }> = [
    { value: 'all', label: 'ALL BETS', icon: List },
    { value: StraightBetStatus.OPEN, label: 'OPEN', icon: List },
    { value: StraightBetStatus.WAITING_RESULT, label: 'WAITING RESULT', icon: Archive },
    { value: StraightBetStatus.COMPLETED, label: 'COMPLETED', icon: Archive },
    { value: StraightBetStatus.CANCELLED, label: 'CANCELLED', icon: Archive }
  ];

  // Filter bets based on selected status
  const filteredBets = selectedStatus === 'all' 
    ? userBets 
    : userBets.filter(bet => bet.status === selectedStatus);

  // Handle status filter change
  const handleStatusChange = async (status: StraightBetStatus | 'all') => {
    setSelectedStatus(status);
    
    // Fetch with filter if not 'all'
    if (status !== 'all') {
      await fetchUserBets(status as StraightBetStatus);
    } else {
      await fetchUserBets();
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      if (selectedStatus === 'all') {
        await refreshUserBets();
      } else {
        await fetchUserBets(selectedStatus as StraightBetStatus);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get status count for display
  const getStatusCount = (status: StraightBetStatus | 'all') => {
    if (status === 'all') return userBets.length;
    return userBets.filter(bet => bet.status === status).length;
  };

  // Get stats for display
  const stats = {
    total: userBets.length,
    open: userBets.filter(bet => bet.status === StraightBetStatus.OPEN).length,
    waiting: userBets.filter(bet => bet.status === StraightBetStatus.WAITING_RESULT).length,
    completed: userBets.filter(bet => bet.status === StraightBetStatus.COMPLETED).length,
    cancelled: userBets.filter(bet => bet.status === StraightBetStatus.CANCELLED).length
  };

  const handleCreateBet = () => {
    setShowCreateBetModal(true);
  };

  const handleGoToMatches = () => {
    setShowCreateBetModal(false);
    navigate('/matches');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display text-console-white uppercase tracking-wider">
              MY BETS
            </h1>
            <p className="text-console-white-dim font-mono text-sm mt-1">
              Track all your betting activity
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateBet}
              className="flex items-center gap-2 bg-console-green/20 hover:bg-console-green/30 text-console-white font-mono text-sm py-2 px-4 border border-console-green/50 hover:border-console-green transition-colors"
            >
              <AddIcon className="h-4 w-4" />
              CREATE BET
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingUserBets}
              className="flex items-center gap-2 bg-console-blue/20 hover:bg-console-blue/30 disabled:opacity-50 disabled:cursor-not-allowed text-console-white font-mono text-sm py-2 px-4 border border-console-blue/50 hover:border-console-blue transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-console-blue/10 border border-console-blue/30 p-3 text-center">
            <div className="text-console-white font-mono text-xl">{stats.total}</div>
            <div className="text-console-white-dim font-mono text-xs">TOTAL</div>
          </div>
          <div className="bg-yellow-400/10 border border-yellow-400/30 p-3 text-center">
            <div className="text-yellow-400 font-mono text-xl">{stats.open}</div>
            <div className="text-console-white-dim font-mono text-xs">OPEN</div>
          </div>
          <div className="bg-blue-400/10 border border-blue-400/30 p-3 text-center">
            <div className="text-blue-400 font-mono text-xl">{stats.waiting}</div>
            <div className="text-console-white-dim font-mono text-xs">WAITING</div>
          </div>
          <div className="bg-green-400/10 border border-green-400/30 p-3 text-center">
            <div className="text-green-400 font-mono text-xl">{stats.completed}</div>
            <div className="text-console-white-dim font-mono text-xs">COMPLETED</div>
          </div>
          <div className="bg-red-400/10 border border-red-400/30 p-3 text-center">
            <div className="text-red-400 font-mono text-xl">{stats.cancelled}</div>
            <div className="text-console-white-dim font-mono text-xs">CANCELLED</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-console-white-dim" />
          <span className="text-console-white-dim font-mono text-sm">FILTER BY STATUS:</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedStatus === option.value;
            const count = getStatusCount(option.value);
            
            return (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={`flex items-center gap-2 px-3 py-2 font-mono text-xs border transition-colors ${
                  isSelected
                    ? 'bg-console-blue text-console-white border-console-blue'
                    : 'bg-console-gray-terminal/50 text-console-white-dim border-console-blue/30 hover:border-console-blue hover:text-console-white'
                }`}
              >
                <Icon className="h-3 w-3" />
                {option.label}
                <span className="bg-console-black/30 px-1 rounded text-xs">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bet List */}
      <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-console-white font-mono uppercase tracking-wider">
            {selectedStatus === 'all' ? 'ALL BETS' : statusOptions.find(opt => opt.value === selectedStatus)?.label}
            <span className="text-console-white-dim ml-2">({filteredBets.length})</span>
          </h2>
        </div>

        {/* Loading State */}
        {isLoadingUserBets && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
            <span className="text-console-white-dim font-mono ml-3">Loading your bets...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingUserBets && filteredBets.length === 0 && (
          <div className="text-center py-12">
            <Archive className="h-12 w-12 text-console-white-dim mx-auto mb-4" />
            <h3 className="text-console-white font-mono text-lg mb-2">
              {selectedStatus === 'all' ? 'NO BETS FOUND' : `NO ${statusOptions.find(opt => opt.value === selectedStatus)?.label} BETS`}
            </h3>
            <p className="text-console-white-dim font-mono text-sm">
              {selectedStatus === 'all' 
                ? 'You haven\'t placed any bets yet. Visit the Matches page to get started!'
                : `You don't have any bets with status "${selectedStatus}".`
              }
            </p>
          </div>
        )}

        {/* Bet Cards */}
        {!isLoadingUserBets && filteredBets.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredBets.map((bet) => (
              <UserBetCard
                key={bet.id}
                bet={bet}
                onViewDetails={(bet) => {
                  setSelectedBetForDetails(bet);
                  setShowBetDetailsModal(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Bet Modal */}
      <Modal
        isOpen={showCreateBetModal}
        onClose={() => setShowCreateBetModal(false)}
      >
        <div className="bg-console-gray-terminal border border-console-blue p-6">
          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-console-blue/30">
            <SportsIcon className="h-6 w-6 text-console-blue" />
            <h2 className="text-lg font-display text-console-white uppercase tracking-wider">
              Create a New Bet
            </h2>
          </div>

          {/* Modal Content */}
          <div className="mb-6">
            <p className="text-console-white-dim font-mono text-sm mb-4">
              To create a new bet, you need to first browse and select a match from the Matches page.
              This will allow you to specify your stake, odds, and outcome.
            </p>
            <div className="bg-console-blue/10 border border-console-blue/30 p-4">
              <div className="flex items-center gap-2 text-console-blue font-mono text-xs">
                <SportsIcon className="h-4 w-4" />
                <span>MATCHES → SELECT MATCH → CREATE BET</span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCreateBetModal(false)}
              className="bg-console-gray/20 hover:bg-console-gray/30 text-console-white-dim font-mono text-sm py-2 px-4 border border-console-gray/50 hover:border-console-gray transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleGoToMatches}
              className="bg-console-green/20 hover:bg-console-green/30 text-console-white font-mono text-sm py-2 px-4 border border-console-green/50 hover:border-console-green transition-colors"
            >
              <SportsIcon className="h-4 w-4 mr-2" />
              GO TO MATCHES
            </button>
          </div>
        </div>
      </Modal>

      {/* Bet Details Modal */}
      {/* The BetDetailsModal component was removed, so this section is now empty */}
    </div>
  );
};

export default UserBetListPage; 