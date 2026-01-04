'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PaymentButton } from '@/components/payment/PaymentButton';
import { discoveryApi } from '@/lib/api';
import { ProblemDetail } from '@/types/problem';

type ProductType = 'STAGE_B' | 'STAGE_C';

interface ProductInfo {
  type: ProductType;
  amount: number;
  title: string;
  description: string;
  backUrl: string;
  backLabel: string;
}

const PRODUCT_CONFIG: Record<ProductType, Omit<ProductInfo, 'backUrl' | 'backLabel'>> = {
  STAGE_B: {
    type: 'STAGE_B',
    amount: 990,
    title: 'Stage B Idea Generation',
    description: 'AI-powered business idea generation based on the selected problem',
  },
  STAGE_C: {
    type: 'STAGE_C',
    amount: 2500,
    title: 'Stage C Technical Specification',
    description: 'Complete technical specification including PRD, architecture, roadmap, and tech stack',
  },
};

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    </div>
  );
}

interface IdeaData {
  id: string;
  title: string;
  description: string;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const problemId = searchParams.get('problemId');
  const ideaId = searchParams.get('ideaId');
  const productParam = searchParams.get('product');

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [idea, setIdea] = useState<IdeaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determine product type
  const productType: ProductType = productParam === 'stage-c' || ideaId ? 'STAGE_C' : 'STAGE_B';
  const productConfig = PRODUCT_CONFIG[productType];
  const amount = productConfig.amount;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (productType === 'STAGE_B' && problemId) {
          // Fetch problem for Stage B
          const response = await discoveryApi.getProblem(problemId);
          setProblem(response.data);
        } else if (productType === 'STAGE_C' && ideaId) {
          // Fetch idea for Stage C
          const response = await fetch(`/api/ideas/${ideaId}/saved-status`);
          if (response.ok) {
            const data = await response.json();
            setIdea({
              id: ideaId,
              title: data.title || 'Business Idea',
              description: data.description || '',
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (problemId || ideaId) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [problemId, ideaId, productType]);

  // No valid ID provided
  if (!problemId && !ideaId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              No Item Selected
            </h1>
            <p className="text-gray-600 mb-6">
              Please select a problem or idea to continue.
            </p>
            <Link
              href="/"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 font-medium"
            >
              Go to Discovery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Item not found
  if ((productType === 'STAGE_B' && !problem) || (productType === 'STAGE_C' && !idea)) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {productType === 'STAGE_B' ? 'Problem Not Found' : 'Idea Not Found'}
            </h1>
            <p className="text-gray-600 mb-6">
              The selected item could not be found.
            </p>
            <Link
              href="/"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 font-medium"
            >
              Go to Discovery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Build order name and customer data
  const itemTitle = productType === 'STAGE_B'
    ? problem!.title
    : idea!.title;
  const orderName = `${productConfig.title}: ${itemTitle.slice(0, 40)}${itemTitle.length > 40 ? '...' : ''}`;

  const customerData = productType === 'STAGE_B'
    ? { problemId, productType: 'STAGE_B' }
    : { ideaId, productType: 'STAGE_C' };

  const backUrl = productType === 'STAGE_B' ? '/' : `/my-ideas`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link href={backUrl} className="text-primary-600 hover:underline text-sm">
            &larr; Back
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600 mb-8">
            {productConfig.description}
          </p>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {productType === 'STAGE_B' ? 'Selected Problem' : 'Selected Idea'}
            </h2>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-2">{itemTitle}</h3>
              {productType === 'STAGE_B' && problem && (
                <div className="flex flex-wrap gap-2">
                  {problem.keywords.slice(0, 3).map((keyword, index) => (
                    <span
                      key={index}
                      className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
              {productType === 'STAGE_C' && idea && idea.description && (
                <p className="text-gray-600 text-sm line-clamp-2">{idea.description}</p>
              )}
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Order Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Product:</span>
                <span className="font-medium text-gray-900 text-sm">{productConfig.title}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Price:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('ko-KR', {
                    style: 'currency',
                    currency: 'KRW',
                  }).format(amount)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <PaymentButton
              amount={amount}
              orderName={orderName}
              customerData={customerData}
              className="w-full"
            />

            <p className="text-xs text-gray-500 mt-4 text-center">
              You will be redirected to Toss Payments to complete your purchase
              securely
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Secure payment powered by{' '}
            <a
              href="https://www.tosspayments.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Toss Payments
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CheckoutContent />
    </Suspense>
  );
}
