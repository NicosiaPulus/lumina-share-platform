"use client";

import { useState } from "react";

interface SubscriptionFormProps {
  contentId: bigint;
  onSubscribe: (
    contentId: bigint,
    fee: number,
    durationMonths: number,
    autoRenew: boolean
  ) => Promise<void>;
  isLoading: boolean;
}

export function SubscriptionForm({
  contentId,
  onSubscribe,
  isLoading,
}: SubscriptionFormProps) {
  const [fee, setFee] = useState("");
  const [durationMonths, setDurationMonths] = useState("1");
  const [autoRenew, setAutoRenew] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const feeNum = parseFloat(fee);
    const durationNum = parseInt(durationMonths);
    if (isNaN(feeNum) || feeNum <= 0) {
      alert("Please enter a valid subscription fee");
      return;
    }
    if (isNaN(durationNum) || durationNum <= 0) {
      alert("Please enter a valid duration");
      return;
    }
    await onSubscribe(contentId, feeNum, durationNum, autoRenew);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Monthly Fee (in token units)
        </label>
        <input
          type="number"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          min="0"
          step="0.01"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Duration (months)
        </label>
        <input
          type="number"
          value={durationMonths}
          onChange={(e) => setDurationMonths(e.target.value)}
          min="1"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          required
        />
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="autoRenew"
          checked={autoRenew}
          onChange={(e) => setAutoRenew(e.target.checked)}
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
        <label
          htmlFor="autoRenew"
          className="ml-2 text-sm text-gray-700 dark:text-gray-300"
        >
          Auto-renew subscription
        </label>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        {isLoading ? "Processing..." : "Subscribe"}
      </button>
    </form>
  );
}

