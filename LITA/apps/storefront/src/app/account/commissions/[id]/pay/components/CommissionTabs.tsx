"use client";

import React, { useState } from "react";
import { OverviewPanel } from "./OverviewPanel";
import { MessagesPanel } from "./MessagesPanel";
import { UpdatesPanel } from "./UpdatesPanel";
import type {
  Commission,
  CommissionMessage,
  CommissionUpdate,
} from "./types";

export type TabKey = "overview" | "messages" | "updates";

interface CommissionTabsProps {
  commission: Commission;
  initialMessages: CommissionMessage[];
  updates?: CommissionUpdate[];
  defaultTab?: TabKey;
}

interface TabItem {
  id: TabKey;
  label: string;
}

export function CommissionTabs({
  commission,
  initialMessages,
  updates = [],
  defaultTab = "overview",
}: CommissionTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [messageCount, setMessageCount] = useState<number>(initialMessages.length);

  const tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "messages", label: "Messages" },
    { id: "updates", label: "Updates" },
  ];

  return (
    <div className="w-full">
      {/* 
        ── Tab Navigation ──
        Mobile: Horizontally scrollable pill bar
        Desktop: Clean atelier tab strip with underline indicator
      */}
      <div className="border-b border-[#e8e4df] mb-8">
        <div
          role="tablist"
          aria-label="Commission detail sections"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 sm:gap-6"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const badgeCount =
              tab.id === "messages"
                ? messageCount
                : tab.id === "updates"
                ? updates.length
                : undefined;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm font-medium transition-all px-4 py-2.5 rounded-full sm:rounded-none sm:px-1 sm:py-3.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f2f3c] focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-[#5f2f3c] text-white sm:bg-transparent sm:text-neutral-900 font-semibold"
                    : "bg-[#f5f3f0] text-neutral-600 hover:text-neutral-900 sm:bg-transparent sm:text-neutral-500 sm:hover:text-neutral-800"
                }`}
              >
                <span>{tab.label}</span>
                {typeof badgeCount === "number" && badgeCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-mono rounded-full font-semibold transition-colors ${
                      isActive
                        ? "bg-white text-[#5f2f3c] sm:bg-[#5f2f3c] sm:text-white"
                        : "bg-neutral-200 text-neutral-700 sm:bg-neutral-100 sm:text-neutral-600"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}

                {/* Desktop underline indicator */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="hidden sm:block absolute bottom-0 left-0 right-0 h-[2px] bg-[#5f2f3c]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Panels ── */}
      <div>
        {activeTab === "overview" && (
          <OverviewPanel commission={commission} />
        )}

        {activeTab === "messages" && (
          <MessagesPanel
            commissionId={commission.id}
            initialMessages={initialMessages}
            onMessageCountChange={setMessageCount}
          />
        )}

        {activeTab === "updates" && (
          <UpdatesPanel updates={updates} />
        )}
      </div>
    </div>
  );
}

export default CommissionTabs;
