import React from 'react';
import { Check, X } from 'lucide-react';
import { DiffPart } from '../types';

interface AcceptRejectControlsProps {
  part: DiffPart;
  onAccept?: (changeId: string) => void;
  onReject?: (changeId: string) => void;
}

export const AcceptRejectControls: React.FC<AcceptRejectControlsProps> = ({
  part,
  onAccept,
  onReject
}) => {
  // Only show controls for changes (additions or deletions)
  if (!part.added && !part.removed) {
    return null;
  }

  const changeId = part.changeId || `change-${part.value.substring(0, 10)}-${part.added ? 'add' : 'remove'}`;
  const isAccepted = part.accepted === true;
  const isRejected = part.rejected === true;

  return (
    <span className="inline-flex items-center gap-1 ml-2 align-middle">
      {!isAccepted && !isRejected && (
        <>
          {onAccept && (
            <button
              onClick={() => onAccept(changeId)}
              className="p-0.5 rounded hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors"
              title="Accept change"
            >
              <Check size={12} />
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(changeId)}
              className="p-0.5 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
              title="Reject change"
            >
              <X size={12} />
            </button>
          )}
        </>
      )}
      {isAccepted && (
        <span className="text-green-600 text-xs" title="Accepted">
          ✓
        </span>
      )}
      {isRejected && (
        <span className="text-red-600 text-xs" title="Rejected">
          ✗
        </span>
      )}
    </span>
  );
};








