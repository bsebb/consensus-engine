import React from 'react';
import LobbyLoadingView from './LobbyLoadingView';

export default function HexagonLoadingOverlay({
  isOpen = false,
  category = 'Restaurants',
  locationLabel = '',
  isCustom = false,
  topic = 'Where should we go?',
  userName = 'Host',
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--bg-root)] animate-fade-in">
      <LobbyLoadingView
        topic={topic}
        category={category}
        userName={userName}
        locationLabel={locationLabel}
        isCustom={isCustom}
        onCancel={onCancel}
      />
    </div>
  );
}
