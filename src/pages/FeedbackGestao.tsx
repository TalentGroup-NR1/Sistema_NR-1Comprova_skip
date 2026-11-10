import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FeedbackColaboradoresList } from '@/components/feedback/FeedbackColaboradoresList';
import { FeedbackColaboradorDetail } from '@/components/feedback/FeedbackColaboradorDetail';

export default function FeedbackGestao() {
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null);

  return (
    <MainLayout>
      {selectedColaboradorId ? (
        <FeedbackColaboradorDetail
          colaboradorId={selectedColaboradorId}
          onBack={() => setSelectedColaboradorId(null)}
        />
      ) : (
        <FeedbackColaboradoresList
          onSelectColaborador={setSelectedColaboradorId}
        />
      )}
    </MainLayout>
  );
}
