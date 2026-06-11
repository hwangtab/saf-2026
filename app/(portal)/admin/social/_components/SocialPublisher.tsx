'use client';

import { useState } from 'react';

import type { PublishCandidate } from '@/app/actions/admin-social';
import type { Platform } from '@/lib/social/types';
import { CandidatePanel } from './CandidatePanel';
import { SocialComposer } from './SocialComposer';

interface ConfigStatus {
  platform: Platform;
  configured: boolean;
}

/**
 * 후보 패널 + 컴포저를 조립하고 선택 작품을 단일 소유.
 * 후보 카드 클릭 → setSelectedArtworkId → 컴포저가 controlled로 캡션·이미지를 채운다.
 */
export function SocialPublisher({
  candidates,
  showingArtistNames,
  configStatus,
}: {
  candidates: PublishCandidate[];
  showingArtistNames: string[];
  configStatus: ConfigStatus[];
}) {
  const [selectedArtworkId, setSelectedArtworkId] = useState('');

  return (
    <div className="space-y-6">
      <CandidatePanel
        candidates={candidates}
        showingArtistNames={showingArtistNames}
        selectedArtworkId={selectedArtworkId}
        onSelect={setSelectedArtworkId}
      />
      <SocialComposer
        selectedArtworkId={selectedArtworkId}
        onArtworkChange={setSelectedArtworkId}
        configStatus={configStatus}
      />
    </div>
  );
}
