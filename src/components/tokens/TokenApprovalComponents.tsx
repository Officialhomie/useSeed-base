import React from 'react';

// Types for approval status and state (customize as needed)
export type ApprovalStatus = 'not-required' | 'required' | 'pending' | 'approved' | 'error';
export type ApprovalState = {
  poolManager: ApprovalStatus;
  hook: ApprovalStatus;
  all: ApprovalStatus;
  error?: string;
};

// ApprovalStatusBanner
export const ApprovalStatusBanner: React.FC<{
  approvalStatus: ApprovalStatus;
  approvalState: ApprovalState;
  token: string;
  amount: string;
  onApproveAll: () => void;
  onRefresh: () => void;
  enabled?: boolean;
}> = ({ approvalStatus, approvalState, token, amount, onApproveAll, onRefresh, enabled }) => {
  if (!enabled) return null;
  return (
    <div className="mb-3 p-2 rounded bg-yellow-900/20 border border-yellow-700/40 flex items-center">
      <span className="text-yellow-400 font-medium mr-2">Approval Required</span>
      <span className="text-xs text-gray-300 mr-2">Approve {token} for swap/savings</span>
      <button onClick={onApproveAll} className="ml-auto px-2 py-1 bg-blue-600 text-white rounded text-xs">Approve</button>
      <button onClick={onRefresh} className="ml-2 px-2 py-1 bg-gray-700 text-gray-200 rounded text-xs">Refresh</button>
    </div>
  );
};

// ApprovalManager
export const ApprovalManager: React.FC<{
  approvalStatus: ApprovalStatus;
  approvalState: ApprovalState;
  token: string;
  amount: string;
  onApprovePoolManager: () => void;
  onApproveHook: () => void;
  onApproveAll: () => void;
  onRefresh: () => void;
  enabled?: boolean;
}> = ({ approvalStatus, approvalState, token, amount, onApprovePoolManager, onApproveHook, onApproveAll, onRefresh, enabled }) => {
  if (!enabled) return null;
  return (
    <div className="mb-2 p-2 rounded bg-gray-800 border border-gray-700 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300">Pool Manager Approval</span>
        <button onClick={onApprovePoolManager} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Approve</button>
        <span className={`ml-2 text-xs ${approvalState.poolManager === 'approved' ? 'text-green-400' : 'text-yellow-400'}`}>{approvalState.poolManager}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300">Hook Approval</span>
        <button onClick={onApproveHook} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Approve</button>
        <span className={`ml-2 text-xs ${approvalState.hook === 'approved' ? 'text-green-400' : 'text-yellow-400'}`}>{approvalState.hook}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300">All Approvals</span>
        <button onClick={onApproveAll} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Approve All</button>
        <span className={`ml-2 text-xs ${approvalState.all === 'approved' ? 'text-green-400' : 'text-yellow-400'}`}>{approvalState.all}</span>
      </div>
      <button onClick={onRefresh} className="mt-2 px-2 py-1 bg-gray-700 text-gray-200 rounded text-xs">Refresh Status</button>
    </div>
  );
};

// ApprovalProgress
export const ApprovalProgress: React.FC<{
  approvalStatus: ApprovalStatus;
  approvalState: ApprovalState;
}> = ({ approvalStatus, approvalState }) => {
  if (approvalStatus !== 'pending') return null;
  return (
    <div className="mb-2 p-2 rounded bg-blue-900/20 border border-blue-700/40 flex items-center">
      <span className="text-blue-400 font-medium mr-2">Approving...</span>
      <span className="text-xs text-gray-300">Pool Manager: {approvalState.poolManager}, Hook: {approvalState.hook}</span>
    </div>
  );
};

// CompactApprovalStatus
export const CompactApprovalStatus: React.FC<{
  approvalStatus: ApprovalStatus;
  approvalState: ApprovalState;
}> = ({ approvalStatus, approvalState }) => {
  if (approvalStatus === 'not-required') return null;
  return (
    <span className={`text-xs ml-2 ${approvalStatus === 'approved' ? 'text-green-400' : 'text-yellow-400'}`}>{approvalStatus}</span>
  );
}; 