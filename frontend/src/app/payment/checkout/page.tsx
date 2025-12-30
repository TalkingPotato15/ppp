'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PaymentButton } from '@/components/payment/PaymentButton';
import { discoveryApi } from '@/lib/api';
import { ProblemDetail } from '@/types/problem';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const problemId = searchParams.get('problemId');
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stage B pricing
  const amount = 990;

  useEffect(() => {
    if (!problemId) {
      setIsLoading(false);
      return;
    }

    const fetchProblem = async () => {
      try {
        const response = await discoveryApi.getProblem(problemId);
        setProblem(response.data);
      } catch (error) {
        console.error('Failed to fetch problem:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblem();
  }, [problemId]);

  if (!problemId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              No Problem Selected
            </h1>
            <p className="text-gray-600 mb-6">
              Please select a problem from the discovery page to continue.
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

  if (!problem) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Problem Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              The selected problem could not be found.
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

  const orderName = `Stage B Ideas: ${problem.title.slice(0, 50)}${problem.title.length > 50 ? '...' : ''}`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-primary-600 hover:underline text-sm">
            &larr; Back to Discovery
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600 mb-8">
            Unlock Stage B idea generation for this problem
          </p>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Selected Problem
            </h2>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-2">{problem.title}</h3>
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
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Order Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Product:</span>
                <span className="font-medium text-gray-900 text-sm">Stage B Idea Generation</span>
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
              customerData={{ problemId }}
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
