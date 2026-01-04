'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StageCPage } from '@/components/stage-c/StageCPage';

interface IdeaData {
  id: string;
  title: string;
  description: string;
}

export default function StageCPageRoute() {
  const params = useParams();
  const router = useRouter();
  const ideaId = params.ideaId as string;

  const [idea, setIdea] = useState<IdeaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIdeaAndVerifyPayment = async () => {
      if (!ideaId) {
        setError('아이디어 ID가 필요합니다.');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch idea details
        const ideaResponse = await fetch(`/api/ideas/${ideaId}/saved-status`);

        if (!ideaResponse.ok) {
          if (ideaResponse.status === 401) {
            router.push('/auth/login?redirect=/stage-c/' + ideaId);
            return;
          }
          if (ideaResponse.status === 404) {
            setError('아이디어를 찾을 수 없습니다.');
            setIsLoading(false);
            return;
          }
          throw new Error('아이디어 정보를 불러오는데 실패했습니다.');
        }

        const ideaData = await ideaResponse.json();

        // Verify Stage C payment status
        const paymentResponse = await fetch(`/api/payment/check-stage-c?ideaId=${ideaId}`);
        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          if (!paymentData.has_unused_payment) {
            // No valid payment, redirect to checkout
            router.push(`/payment/checkout?ideaId=${ideaId}&product=stage-c`);
            return;
          }
        } else if (paymentResponse.status === 401) {
          router.push('/auth/login?redirect=/stage-c/' + ideaId);
          return;
        }

        setIdea({
          id: ideaId,
          title: ideaData.title || '비즈니스 아이디어',
          description: ideaData.description || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIdeaAndVerifyPayment();
  }, [ideaId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">오류 발생</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!idea) {
    return null;
  }

  return (
    <StageCPage
      ideaId={idea.id}
      ideaTitle={idea.title}
      ideaDescription={idea.description}
    />
  );
}
