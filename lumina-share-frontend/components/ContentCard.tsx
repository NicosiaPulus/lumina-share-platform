"use client";

import Link from "next/link";
import { Content, ContentType, AccessType, ContentTypeValue, AccessTypeValue } from "@/hooks/useLuminaShare";
import { ethers } from "ethers";

interface ContentCardProps {
  content: Content;
  contentId: bigint;
}

const contentTypeLabels: Record<ContentTypeValue, string> = {
  [ContentType.Article]: "Article",
  [ContentType.Video]: "Video",
  [ContentType.Music]: "Music",
  [ContentType.Other]: "Other",
};

const accessTypeLabels: Record<AccessTypeValue, string> = {
  [AccessType.Public]: "Public",
  [AccessType.Paid]: "Paid",
  [AccessType.Subscription]: "Subscription",
};

export function ContentCard({ content, contentId }: ContentCardProps) {
  const shortAddress = `${content.creator.slice(0, 6)}...${content.creator.slice(-4)}`;

  return (
    <Link
      href={`/content/${contentId.toString()}`}
      className="block p-6 rounded-lg shadow-lg bg-white dark:bg-slate-800 hover:shadow-xl transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {content.title}
        </h3>
        <span className="px-2 py-1 text-xs rounded bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
          {contentTypeLabels[content.contentType]}
        </span>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        Content Hash: {content.contentHash.slice(0, 20)}...
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>By {shortAddress}</span>
          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
            {accessTypeLabels[content.accessType]}
          </span>
        </div>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(Number(content.createdAt) * 1000).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}

