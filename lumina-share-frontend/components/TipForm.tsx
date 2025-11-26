"use client";

import { useState } from "react";
import { TipType } from "@/hooks/useLuminaShare";

interface TipFormProps {
  contentId: bigint;
  onTip: (contentId: bigint, amount: number, tipType: TipType) => Promise<void>;
  isLoading: boolean;
}

export function TipForm({ contentId, onTip, isLoading }: TipFormProps) {
  const [amount, setAmount] = useState("");
  const [tipType, setTipType] = useState<TipType>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid tip amount");
      return;
    }
    await onTip(contentId, amountNum, tipType);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tip Amount (in token units)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.01"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tip Type
        </label>
        <select
          value={tipType}
          onChange={(e) => setTipType(Number(e.target.value) as TipType)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        >
          <option value={0}>One-time Tip</option>
          <option value={1}>Time-based Tip</option>
          <option value={2}>View-based Tip</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors disabled:opacity-50"
      >
        {isLoading ? "Sending..." : "Send Tip"}
      </button>
    </form>
  );
}

