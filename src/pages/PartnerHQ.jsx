import { useCallback, useEffect, useMemo, useState } from "react";

const ADMIN_SESSION_KEY = "304-document-admin-session";

const APPLICATION_FILTERS = [
  ["all", "All Applications"],
  ["pending", "Pending Review"],
  ["approved", "Approved Partners"],
  ["suspended", "Suspended Partners"],
  ["denied", "Denied Applications"],
];

const REFERRAL_FILTERS = [
  ["all", "All Referrals"],
  ["pending", "Pending"],
  ["earned", "Earned"],
  ["paid", "Paid Out"],
  ["voided", "Voided"],
];
const RISK_FILTERS = [
  ["all", "All Reviews"],
  ["new", "New"],
  ["reviewing", "Reviewing"],
  ["cleared", "Cleared"],
  ["confirmed_abuse", "Confirmed Abuse"],
];

const RISK_SEVERITIES = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["critical", "Critical"],
];

const EMPTY_RISK_COUNTS = {
  new: 0,
  reviewing: 0,
  cleared: 0,
  confirmedAbuse: 0,
};

const EMPTY_SETTINGS = {
  minimumPayoutCents: 5000,
  updatedAt: "",
  updatedBy: "",
};

const EMPTY_LEADERBOARD_SETTINGS = {
  leaderboardMetric: "commission",
  monthlyRewardEnabled: true,
  monthlyRewardType: "store_credit",
  monthlyRewardAmountCents: 5000,
  monthlyMinimumReferrals: 1,
  quarterlyRewardEnabled: true,
  quarterlyRewardType: "swag",
  quarterlyRewardAmountCents: 0,
  quarterlyRewardDescription: "304 Peptides swag package",
  quarterlyMinimumReferrals: 3,
  updatedAt: "",
  updatedBy: "",
};

const CAMPAIGN_FILTERS = [
  ["all", "All Campaigns"],
  ["draft", "Drafts"],
  ["published", "Published"],
  ["archived", "Archived"],
];

const EMPTY_CAMPAIGN_FORM = {
  campaignId: "",
  slug: "",
  title: "",
  summary: "",
  headline: "",
  facebookCopy: "",
  instagramCopy: "",
  tiktokCopy: "",
  smsCopy: "",
  emailSubject: "",
  emailCopy: "",
  imageUrl: "",
  downloadUrl: "",
  disclaimer: "For laboratory research use only. Not for human consumption.",
  ctaLabel: "Research Catalog",
  destinationPath: "/checkout",
  startsAt: "",
  endsAt: "",
  displayOrder: "0",
};

const ANALYTICS_PERIOD_OPTIONS = [
  ["7", "Last 7 Days"],
  ["30", "Last 30 Days"],
  ["90", "Last 90 Days"],
  ["all", "All Time"],
];

const EMPTY_ANALYTICS_METRICS = {
  totalClicks: 0,
  uniqueVisitors: 0,
  attributedOrders: 0,
  earnedOrders: 0,
  voidedOrders: 0,
  earnedRevenueCents: 0,
  earnedCommissionCents: 0,
  conversionRateBps: 0,
};

const EMPTY_ANALYTICS_REPORT = {
  period: {
    key: "30",
    label: "Last 30 Days",
    startAt: "",
    endAt: "",
  },
  filters: {
    partnerCode: "",
    campaignSlug: "",
  },
  summary: EMPTY_ANALYTICS_METRICS,
  byPartner: [],
  byCampaign: [],
  byChannel: [],
  daily: [],
};

function getStoredSecret() {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

function storeSecret(secret) {
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, secret);
  } catch {
    // React state keeps the secret for this page session.
  }
}

function removeStoredSecret() {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // Session storage may be unavailable.
  }
}

function formatDate(value) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function formatDateOnly(value) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function formatMoneyFromCents(value) {
  return (Number(value || 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatPercentFromBasisPoints(value) {
  const percentage = Number(value || 0) / 100;
  return `${percentage.toLocaleString("en-US", {
    minimumFractionDigits: percentage % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`;
}

function normalizeApplications(records) {
  const priority = { pending: 0, approved: 1, suspended: 2, denied: 3 };
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      ...record,
      code: String(record.code || "").toUpperCase(),
      status: String(record.status || "pending").toLowerCase(),
      commissionRateBps: Number(record.commissionRateBps || 0),
    }))
    .sort((left, right) => {
      const statusDifference =
        (priority[left.status] ?? 9) - (priority[right.status] ?? 9);
      return statusDifference !== 0
        ? statusDifference
        : String(right.submittedAt || right.updatedAt || "").localeCompare(
            String(left.submittedAt || left.updatedAt || "")
          );
    });
}

function normalizeReferrals(records) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      ...record,
      partnerCode: String(record.partnerCode || "").toUpperCase(),
      referralStatus: String(record.referralStatus || "pending").toLowerCase(),
      commissionStatus: String(
        record.commissionStatus || record.referralStatus || "pending"
      ).toLowerCase(),
      orderSubtotalCents: Number(record.orderSubtotalCents || 0),
      commissionRateBps: Number(record.commissionRateBps || 0),
      commissionAmountCents: Number(record.commissionAmountCents || 0),
      isSelfUse: Boolean(record.isSelfUse),
      tierProgressEligible: Boolean(record.tierProgressEligible),
      payoutId: String(record.payoutId || ""),
      payoutHold: Boolean(record.payoutHold),
      payoutHoldReason: String(
        record.payoutHoldReason || ""
      ),
      payoutHoldAt: String(
        record.payoutHoldAt || ""
      ),
      payoutHoldBy: String(
        record.payoutHoldBy || ""
      ),
      requiresAdjustment: Boolean(record.requiresAdjustment),
    }))
    .sort((left, right) =>
      String(right.createdAt || right.updatedAt || "").localeCompare(
        String(left.createdAt || left.updatedAt || "")
      )
    );
}

function normalizeRiskFlags(records) {
  const priority = {
    new: 0,
    reviewing: 1,
    confirmed_abuse: 2,
    cleared: 3,
  };

  return (Array.isArray(records) ? records : [])
    .filter(
      (record) =>
        record &&
        typeof record === "object"
    )
    .map((record) => ({
      ...record,
      flagId: String(record.flagId || ""),
      orderId: String(
        record.orderId || ""
      ).toUpperCase(),
      partnerCode: String(
        record.partnerCode || ""
      ).toUpperCase(),
      status: String(
        record.status || "new"
      ).toLowerCase(),
      severity: String(
        record.severity || "medium"
      ).toLowerCase(),
      flagType: String(
        record.flagType || "manual_review"
      ).toLowerCase(),
      source: String(
        record.source || "manual"
      ).toLowerCase(),
      payoutHoldRecommended: Boolean(
        record.payoutHoldRecommended
      ),
      history: Array.isArray(record.history)
        ? record.history
        : [],
    }))
    .sort((left, right) => {
      const statusDifference =
        (priority[left.status] ?? 9) -
        (priority[right.status] ?? 9);

      return statusDifference !== 0
        ? statusDifference
        : String(
            right.updatedAt ||
            right.createdAt ||
            ""
          ).localeCompare(
            String(
              left.updatedAt ||
              left.createdAt ||
              ""
            )
          );
    });
}

function normalizeRiskCounts(counts) {
  const source =
    counts && typeof counts === "object"
      ? counts
      : {};

  return {
    new: Number(source.new || 0),
    reviewing: Number(
      source.reviewing || 0
    ),
    cleared: Number(source.cleared || 0),
    confirmedAbuse: Number(
      source.confirmedAbuse ||
      source.confirmed_abuse ||
      0
    ),
  };
}
function normalizePayouts(records) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      ...record,
      partnerCode: String(record.partnerCode || "").toUpperCase(),
      amountCents: Number(record.amountCents || 0),
      referralCount: Number(record.referralCount || 0),
      orderIds: Array.isArray(record.orderIds) ? record.orderIds : [],
      items: Array.isArray(record.items) ? record.items : [],
    }))
    .sort((left, right) =>
      String(right.paidAt || right.createdAt || "").localeCompare(
        String(left.paidAt || left.createdAt || "")
      )
    );
}

function normalizeLeaderboardEntries(records) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      ...record,
      rank: Number(record.rank || 0),
      partnerCode: String(record.partnerCode || "").toUpperCase(),
      referralCount: Number(record.referralCount || 0),
      revenueCents: Number(record.revenueCents || 0),
      commissionCents: Number(record.commissionCents || 0),
      score: Number(record.score || 0),
      metric: String(record.metric || "commission").toLowerCase(),
      eligible: Boolean(record.eligible),
    }))
    .sort((left, right) => left.rank - right.rank);
}

function normalizeRewards(records) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      ...record,
      partnerCode: String(record.partnerCode || "").toUpperCase(),
      periodType: String(record.periodType || "monthly").toLowerCase(),
      rewardType: String(record.rewardType || "store_credit").toLowerCase(),
      status: String(record.status || "awarded").toLowerCase(),
      rank: Number(record.rank || 0),
      referralCount: Number(record.referralCount || 0),
      revenueCents: Number(record.revenueCents || 0),
      commissionCents: Number(record.commissionCents || 0),
      rewardAmountCents: Number(record.rewardAmountCents || 0),
    }))
    .sort((left, right) =>
      String(right.awardedAt || right.issuedAt || "").localeCompare(
        String(left.awardedAt || left.issuedAt || "")
      )
    );
}

function normalizeCampaigns(records) {
  const priority = { published: 0, draft: 1, archived: 2 };
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      ...record,
      slug: String(record.slug || "").toLowerCase(),
      status: String(record.status || "draft").toLowerCase(),
      displayOrder: Number(record.displayOrder || 0),
      referralCount: Number(record.referralCount || 0),
      earnedReferralCount: Number(record.earnedReferralCount || 0),
      earnedRevenueCents: Number(record.earnedRevenueCents || 0),
      earnedCommissionCents: Number(record.earnedCommissionCents || 0),
      active: Boolean(record.active),
    }))
    .sort((left, right) => {
      const statusDifference =
        (priority[left.status] ?? 9) - (priority[right.status] ?? 9);
      if (statusDifference !== 0) return statusDifference;
      if (left.displayOrder !== right.displayOrder) {
        return left.displayOrder - right.displayOrder;
      }
      return String(right.updatedAt || right.createdAt || "").localeCompare(
        String(left.updatedAt || left.createdAt || "")
      );
    });
}

function normalizeAnalyticsMetrics(metrics) {
  const source = metrics && typeof metrics === "object" ? metrics : {};
  return {
    totalClicks: Math.max(0, Number(source.totalClicks || 0)),
    uniqueVisitors: Math.max(0, Number(source.uniqueVisitors || 0)),
    attributedOrders: Math.max(0, Number(source.attributedOrders || 0)),
    earnedOrders: Math.max(0, Number(source.earnedOrders || 0)),
    voidedOrders: Math.max(0, Number(source.voidedOrders || 0)),
    earnedRevenueCents: Math.max(0, Number(source.earnedRevenueCents || 0)),
    earnedCommissionCents: Math.max(
      0,
      Number(source.earnedCommissionCents || 0)
    ),
    conversionRateBps: Math.max(0, Number(source.conversionRateBps || 0)),
  };
}

function normalizeAnalyticsReport(report) {
  const source = report && typeof report === "object" ? report : {};
  const normalizeRows = (rows, extra = () => ({})) =>
    (Array.isArray(rows) ? rows : [])
      .filter((row) => row && typeof row === "object")
      .map((row) => ({
        ...row,
        ...extra(row),
        ...normalizeAnalyticsMetrics(row),
      }));

  return {
    ...EMPTY_ANALYTICS_REPORT,
    ...source,
    period: {
      ...EMPTY_ANALYTICS_REPORT.period,
      ...(source.period || {}),
      key: String(source.period?.key || "30"),
      label: String(source.period?.label || "Last 30 Days"),
    },
    filters: {
      partnerCode: String(source.filters?.partnerCode || "").toUpperCase(),
      campaignSlug: String(source.filters?.campaignSlug || "").toLowerCase(),
    },
    summary: normalizeAnalyticsMetrics(source.summary),
    byPartner: normalizeRows(source.byPartner, (row) => ({
      partnerCode: String(row.partnerCode || "").toUpperCase(),
    })).sort((left, right) =>
      right.totalClicks - left.totalClicks ||
      left.partnerCode.localeCompare(right.partnerCode)
    ),
    byCampaign: normalizeRows(source.byCampaign, (row) => ({
      campaignSlug: String(row.campaignSlug || "").toLowerCase(),
      campaignTitle: String(row.campaignTitle || "General Referral Link"),
    })).sort((left, right) =>
      right.totalClicks - left.totalClicks ||
      left.campaignTitle.localeCompare(right.campaignTitle)
    ),
    byChannel: normalizeRows(source.byChannel, (row) => ({
      channel: String(row.channel || "untracked").toLowerCase(),
    })).sort((left, right) =>
      right.totalClicks - left.totalClicks ||
      left.channel.localeCompare(right.channel)
    ),
    daily: normalizeRows(source.daily, (row) => ({
      day: String(row.day || ""),
    })).sort((left, right) => left.day.localeCompare(right.day)),
  };
}

function formatAnalyticsChannel(value) {
  return ({
    general: "General Link",
    qr: "QR Code",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    sms: "Text Message",
    email: "Email",
    other: "Other",
    untracked: "Untracked",
  })[String(value || "untracked").toLowerCase()] || String(value || "Other");
}

function formatAnalyticsDate(value) {
  if (!value) return "Unavailable";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function campaignStatusLabel(campaign) {
  if (campaign.status === "published" && campaign.active) return "LIVE";
  if (campaign.status === "published") return "SCHEDULED";
  return String(campaign.status || "draft").toUpperCase();
}

function normalizeLeaderboardSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  return {
    ...EMPTY_LEADERBOARD_SETTINGS,
    ...source,
    leaderboardMetric: ["commission", "revenue", "referrals"].includes(
      String(source.leaderboardMetric || "").toLowerCase()
    )
      ? String(source.leaderboardMetric).toLowerCase()
      : "commission",
    monthlyRewardEnabled: source.monthlyRewardEnabled !== false,
    monthlyRewardType: String(source.monthlyRewardType || "store_credit").toLowerCase(),
    monthlyRewardAmountCents: Number(source.monthlyRewardAmountCents ?? 5000),
    monthlyMinimumReferrals: Number(source.monthlyMinimumReferrals || 1),
    quarterlyRewardEnabled: source.quarterlyRewardEnabled !== false,
    quarterlyRewardType: String(source.quarterlyRewardType || "swag").toLowerCase(),
    quarterlyRewardAmountCents: Number(source.quarterlyRewardAmountCents || 0),
    quarterlyRewardDescription:
      String(source.quarterlyRewardDescription || "304 Peptides swag package"),
    quarterlyMinimumReferrals: Number(source.quarterlyMinimumReferrals || 3),
  };
}

function getCurrentMonthlyPeriodKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentQuarterlyPeriodKey() {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
}

function getDefaultPeriodKey(periodType) {
  return periodType === "quarterly"
    ? getCurrentQuarterlyPeriodKey()
    : getCurrentMonthlyPeriodKey();
}

function formatLeaderboardScore(entry, metric) {
  if (metric === "revenue") return formatMoneyFromCents(entry.revenueCents);
  if (metric === "referrals") return String(entry.referralCount);
  return formatMoneyFromCents(entry.commissionCents);
}

function formatRewardValue(reward) {
  if (!reward) return "Unavailable";
  if (reward.rewardType === "swag") {
    return reward.rewardDescription || "Swag reward";
  }
  return formatMoneyFromCents(reward.rewardAmountCents);
}

function rewardTypeLabel(value) {
  return ({
    cash: "Cash",
    store_credit: "Store Credit",
    swag: "Swag",
  })[value] || "Reward";
}

async function readJson(response) {
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("The protected Partner Program service returned an invalid response.");
  }
  if (!response.ok || !result.success) {
    throw new Error(
      result.error || "The protected Partner Program request could not be completed."
    );
  }
  return result;
}

function getLocalDateTimeValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function PartnerHQ({ onNavigate = () => {} }) {
  const [adminSecret, setAdminSecret] = useState(getStoredSecret);
  const [secretInput, setSecretInput] = useState("");
  const [applications, setApplications] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [riskFlags, setRiskFlags] = useState([]);
  const [riskStatusCounts, setRiskStatusCounts] =
    useState(EMPTY_RISK_COUNTS);
  const [riskSearch, setRiskSearch] = useState("");
  const [riskStatus, setRiskStatus] =
    useState("all");
  const [
    expandedRiskFlagId,
    setExpandedRiskFlagId,
  ] = useState("");
  const [riskDrafts, setRiskDrafts] =
    useState({});
  const [riskSavingId, setRiskSavingId] =
    useState("");
  const [
    holdSavingOrderId,
    setHoldSavingOrderId,
  ] = useState("");
  const [payouts, setPayouts] = useState([]);
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [thresholdDraft, setThresholdDraft] = useState("50");
  const [isLoading, setIsLoading] = useState(Boolean(adminSecret));
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [applicationSearch, setApplicationSearch] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("all");
  const [referralSearch, setReferralSearch] = useState("");
  const [referralStatus, setReferralStatus] = useState("all");
  const [payoutSearch, setPayoutSearch] = useState("");
  const [expandedAccountId, setExpandedAccountId] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [rateDrafts, setRateDrafts] = useState({});
  const [rateSavingId, setRateSavingId] = useState("");
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [payoutPartner, setPayoutPartner] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [payoutForm, setPayoutForm] = useState({
    payoutType: "cash",
    paymentMethod: "",
    referenceNumber: "",
    paidAt: getLocalDateTimeValue(),
    partnerNote: "",
    adminNotes: "",
  });
  const [isCreatingPayout, setIsCreatingPayout] = useState(false);
  const [leaderboardPeriodType, setLeaderboardPeriodType] = useState("monthly");
  const [leaderboardPeriodKey, setLeaderboardPeriodKey] = useState(
    getCurrentMonthlyPeriodKey
  );
  const [leaderboardPeriod, setLeaderboardPeriod] = useState(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [leaderboardReward, setLeaderboardReward] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [leaderboardSettings, setLeaderboardSettings] = useState(
    EMPTY_LEADERBOARD_SETTINGS
  );
  const [leaderboardDraft, setLeaderboardDraft] = useState({
    ...EMPTY_LEADERBOARD_SETTINGS,
    monthlyRewardAmountDollars: "50",
    quarterlyRewardAmountDollars: "0",
  });
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [isSavingLeaderboardSettings, setIsSavingLeaderboardSettings] =
    useState(false);
  const [isAwardingReward, setIsAwardingReward] = useState(false);
  const [awardPartnerNote, setAwardPartnerNote] = useState("");
  const [awardAdminNotes, setAwardAdminNotes] = useState("");
  const [rewardToIssue, setRewardToIssue] = useState(null);
  const [issueForm, setIssueForm] = useState({
    deliveryMethod: "",
    referenceNumber: "",
    issuedAt: getLocalDateTimeValue(),
    partnerNote: "",
    adminNotes: "",
  });
  const [isIssuingReward, setIsIssuingReward] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatus, setCampaignStatus] = useState("all");
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN_FORM);
  const [isEditingCampaign, setIsEditingCampaign] = useState(false);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [campaignStatusSavingId, setCampaignStatusSavingId] = useState("");
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS_REPORT);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("30");
  const [analyticsPartnerCode, setAnalyticsPartnerCode] = useState("");
  const [analyticsCampaignSlug, setAnalyticsCampaignSlug] = useState("");
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

  const loadPartnerData = useCallback(
    async (secret = adminSecret) => {
      const cleanedSecret = String(secret || "").trim();
      if (!cleanedSecret) return;
      setIsLoading(true);
      setLoadError("");
      setActionError("");
      try {
        const headers = {
          Accept: "application/json",
          Authorization: `Bearer ${cleanedSecret}`,
        };
        const currentMonthlyPeriod = getCurrentMonthlyPeriodKey();
        const [
          applicationResponse,
          referralResponse,
          riskResponse,
          payoutResponse,
          leaderboardResponse,
          rewardResponse,
          campaignResponse,
          analyticsResponse,
        ] = await Promise.all([
          fetch("/api/admin/partner-applications", {
            method: "GET",
            headers,
            credentials: "same-origin",
            cache: "no-store",
          }),
          fetch("/api/admin/partner-referrals", {
            method: "GET",
            headers,
            credentials: "same-origin",
            cache: "no-store",
          }),          fetch("/api/admin/partner-risk-flags", {
            method: "GET",
            headers,
            credentials: "same-origin",
            cache: "no-store",
          }),
          fetch("/api/admin/partner-payouts", {
            method: "GET",
            headers,
            credentials: "same-origin",
            cache: "no-store",
          }),
          fetch(
            `/api/admin/partner-leaderboard?periodType=monthly&periodKey=${encodeURIComponent(
              currentMonthlyPeriod
            )}`,
            {
              method: "GET",
              headers,
              credentials: "same-origin",
              cache: "no-store",
            }
          ),
          fetch("/api/admin/partner-rewards", {
            method: "GET",
            headers,
            credentials: "same-origin",
            cache: "no-store",
          }),
          fetch("/api/admin/partner-campaigns", {
            method: "GET",
            headers,
            credentials: "same-origin",
            cache: "no-store",
          }),
          fetch("/api/admin/partner-analytics?period=30", {
            method: "GET",
            headers,
            credentials: "same-origin",
            cache: "no-store",
          }),
        ]);
        const [
          applicationResult,
          referralResult,
          riskResult,
          payoutResult,
          leaderboardResult,
          rewardResult,
          campaignResult,
          analyticsResult,
        ] = await Promise.all([
          readJson(applicationResponse),
          readJson(referralResponse),
          readJson(riskResponse),
          readJson(payoutResponse),
          readJson(leaderboardResponse),
          readJson(rewardResponse),
          readJson(campaignResponse),
          readJson(analyticsResponse),
        ]);
        const nextApplications = normalizeApplications(
          applicationResult.applications || applicationResult.records || []
        );
        const nextSettings = {
          ...EMPTY_SETTINGS,
          ...(payoutResult.settings || {}),
          minimumPayoutCents: Number(
            payoutResult.settings?.minimumPayoutCents ?? 5000
          ),
        };
        setApplications(nextApplications);
        setReferrals(
          normalizeReferrals(referralResult.referrals || referralResult.records || [])
        );

        const nextRiskFlags = normalizeRiskFlags(
          riskResult.flags ||
          riskResult.records ||
          []
        );

        setRiskFlags(nextRiskFlags);
        setRiskStatusCounts(
          normalizeRiskCounts(
            riskResult.statusCounts
          )
        );
        setRiskDrafts(
          Object.fromEntries(
            nextRiskFlags.map((flag) => [
              flag.flagId,
              {
                status: flag.status,
                severity: flag.severity,
                privateNotes:
                  flag.privateNotes || "",
                note: "",
              },
            ])
          )
        );
        setPayouts(
          normalizePayouts(payoutResult.payouts || payoutResult.records || [])
        );
        const nextLeaderboardSettings = normalizeLeaderboardSettings(
          rewardResult.settings || leaderboardResult.settings
        );
        setLeaderboardPeriodType("monthly");
        setLeaderboardPeriodKey(currentMonthlyPeriod);
        setLeaderboardPeriod(leaderboardResult.period || null);
        setLeaderboardEntries(
          normalizeLeaderboardEntries(leaderboardResult.entries || [])
        );
        setLeaderboardReward(leaderboardResult.reward || null);
        setRewards(
          normalizeRewards(rewardResult.rewards || rewardResult.records || [])
        );
        setCampaigns(
          normalizeCampaigns(
            campaignResult.campaigns || campaignResult.records || []
          )
        );
        setAnalytics(normalizeAnalyticsReport(analyticsResult.analytics));
        setAnalyticsPeriod("30");
        setAnalyticsPartnerCode("");
        setAnalyticsCampaignSlug("");
        setAnalyticsError("");
        setLeaderboardSettings(nextLeaderboardSettings);
        setLeaderboardDraft({
          ...nextLeaderboardSettings,
          monthlyRewardAmountDollars: String(
            nextLeaderboardSettings.monthlyRewardAmountCents / 100
          ),
          quarterlyRewardAmountDollars: String(
            nextLeaderboardSettings.quarterlyRewardAmountCents / 100
          ),
        });
        setSettings(nextSettings);
        setThresholdDraft(String(nextSettings.minimumPayoutCents / 100));
        setRateDrafts(
          Object.fromEntries(
            nextApplications.map((application) => [
              application.accountId,
              String(Number(application.commissionRateBps || 0) / 100),
            ])
          )
        );
        setIsReady(true);
      } catch (error) {
        setApplications([]);
        setReferrals([]);
        setRiskFlags([]);
        setRiskStatusCounts(
          EMPTY_RISK_COUNTS
        );
        setRiskDrafts({});
        setPayouts([]);
        setLeaderboardEntries([]);
        setRewards([]);
        setCampaigns([]);
        setAnalytics(EMPTY_ANALYTICS_REPORT);
        setAnalyticsError("");
        setLeaderboardReward(null);
        setIsReady(false);
        setLoadError(error.message || "Partner records could not be loaded.");
      } finally {
        setIsLoading(false);
      }
    },
    [adminSecret]
  );

  useEffect(() => {
    if (adminSecret) loadPartnerData(adminSecret);
  }, [adminSecret, loadPartnerData]);

  const applicationStats = useMemo(
    () =>
      applications.reduce(
        (totals, application) => {
          totals.total += 1;
          totals[application.status] = Number(totals[application.status] || 0) + 1;
          return totals;
        },
        { total: 0, pending: 0, approved: 0, suspended: 0, denied: 0 }
      ),
    [applications]
  );

  const referralStats = useMemo(
    () =>
      referrals.reduce(
        (totals, referral) => {
          if (
            referral.tierProgressEligible &&
            referral.referralStatus === "earned"
          ) {
            totals.tierProgressCount += 1;

            if (referral.isSelfUse) {
              totals.selfUseTierCount += 1;
            }
          }

          if (referral.isSelfUse) {
            return totals;
          }

          totals.total += 1;
          totals[referral.referralStatus] =
            Number(totals[referral.referralStatus] || 0) + 1;
          if (referral.referralStatus === "pending") {
            totals.pendingCommissionCents += referral.commissionAmountCents;
          }
          if (referral.referralStatus === "earned") {
            totals.earnedCommissionCents += referral.commissionAmountCents;
            totals.earnedRevenueCents += referral.orderSubtotalCents;
          }
          if (referral.commissionStatus === "paid") {
            totals.paidCommissionCents += referral.commissionAmountCents;
            totals.paidCount += 1;
          } else if (
            referral.referralStatus === "earned" &&
            !referral.payoutHold
          ) {
            totals.availableCommissionCents += referral.commissionAmountCents;
            totals.availableCount += 1;
          }
          if (referral.requiresAdjustment) totals.adjustmentCount += 1;
          return totals;
        },
        {
          total: 0,
          pending: 0,
          earned: 0,
          voided: 0,
          paidCount: 0,
          availableCount: 0,
          pendingCommissionCents: 0,
          earnedCommissionCents: 0,
          earnedRevenueCents: 0,
          availableCommissionCents: 0,
          paidCommissionCents: 0,
          adjustmentCount: 0,
          tierProgressCount: 0,
          selfUseTierCount: 0,
        }
      ),
    [referrals]
  );

  const payoutStats = useMemo(
    () =>
      payouts.reduce(
        (totals, payout) => {
          totals.count += 1;
          totals.amountCents += payout.amountCents;
          if (payout.payoutType === "store_credit") {
            totals.storeCreditCents += payout.amountCents;
          } else {
            totals.cashCents += payout.amountCents;
          }
          return totals;
        },
        { count: 0, amountCents: 0, cashCents: 0, storeCreditCents: 0 }
      ),
    [payouts]
  );

  const partnerBalances = useMemo(() => {
    const balances = new Map();
    for (const application of applications) {
      balances.set(application.accountId, {
        application,
        availableCommissionCents: 0,
        availableReferralCount: 0,
        pendingCommissionCents: 0,
        pendingReferralCount: 0,
        paidCommissionCents: 0,
        paidReferralCount: 0,
        adjustmentCount: 0,
      });
    }
    for (const referral of referrals) {
      if (referral.isSelfUse) {
        continue;
      }

      const current = balances.get(referral.partnerAccountId) || {
        application: {
          accountId: referral.partnerAccountId,
          code: referral.partnerCode,
          firstName: referral.partnerFirstName || "",
          lastName: referral.partnerLastName || "",
          email: referral.partnerEmail || "",
          status: "unknown",
        },
        availableCommissionCents: 0,
        availableReferralCount: 0,
        pendingCommissionCents: 0,
        pendingReferralCount: 0,
        paidCommissionCents: 0,
        paidReferralCount: 0,
        adjustmentCount: 0,
      };
      if (referral.commissionStatus === "paid") {
        current.paidCommissionCents += referral.commissionAmountCents;
        current.paidReferralCount += 1;
      } else if (
        referral.referralStatus === "earned" &&
        !referral.payoutHold
      ) {
        current.availableCommissionCents += referral.commissionAmountCents;
        current.availableReferralCount += 1;
      } else if (referral.referralStatus === "pending") {
        current.pendingCommissionCents += referral.commissionAmountCents;
        current.pendingReferralCount += 1;
      }
      if (referral.requiresAdjustment) current.adjustmentCount += 1;
      balances.set(referral.partnerAccountId, current);
    }
    return Array.from(balances.values()).sort((left, right) =>
      right.availableCommissionCents - left.availableCommissionCents ||
      String(left.application.code || "").localeCompare(
        String(right.application.code || "")
      )
    );
  }, [applications, referrals]);

  const filteredApplications = useMemo(() => {
    const search = applicationSearch.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesStatus =
        applicationStatus === "all" || application.status === applicationStatus;
      const searchableText = [
        application.firstName,
        application.lastName,
        application.email,
        application.code,
        application.primaryPlatform,
        application.profileUrl,
        application.audienceSize,
        application.promotionPlan,
        application.experience,
        application.customerMessage,
        application.adminNotes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!search || searchableText.includes(search));
    });
  }, [applications, applicationSearch, applicationStatus]);

  const filteredReferrals = useMemo(() => {
    const search = referralSearch.trim().toLowerCase();
    return referrals.filter((referral) => {
      const statusValue =
        referral.commissionStatus === "paid"
          ? "paid"
          : referral.referralStatus;
      const matchesStatus =
        referralStatus === "all" || statusValue === referralStatus;
      const searchableText = [
        referral.orderId,
        referral.partnerCode,
        referral.partnerFirstName,
        referral.partnerLastName,
        referral.partnerEmail,
        referral.customerEmail,
        referral.orderStatus,
        referral.payoutId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!search || searchableText.includes(search));
    });
  }, [referrals, referralSearch, referralStatus]);

  const filteredRiskFlags = useMemo(() => {
    const search =
      riskSearch.trim().toLowerCase();

    return riskFlags.filter((flag) => {
      const matchesStatus =
        riskStatus === "all" ||
        flag.status === riskStatus;

      const searchableText = [
        flag.flagId,
        flag.orderId,
        flag.partnerCode,
        flag.customerEmail,
        flag.flagType,
        flag.severity,
        flag.title,
        flag.summary,
        flag.privateNotes,
        flag.createdBy,
        flag.updatedBy,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (
          !search ||
          searchableText.includes(search)
        )
      );
    });
  }, [
    riskFlags,
    riskSearch,
    riskStatus,
  ]);

  const referralByOrderId = useMemo(
    () =>
      new Map(
        referrals.map((referral) => [
          referral.orderId,
          referral,
        ])
      ),
    [referrals]
  );

  const heldReferralStats = useMemo(
    () =>
      referrals.reduce(
        (totals, referral) => {
          if (
            referral.payoutHold &&
            referral.referralStatus ===
              "earned" &&
            referral.commissionStatus !==
              "paid"
          ) {
            totals.count += 1;
            totals.amountCents +=
              referral.commissionAmountCents;
          }

          return totals;
        },
        {
          count: 0,
          amountCents: 0,
        }
      ),
    [referrals]
  );
  const filteredPayouts = useMemo(() => {
    const search = payoutSearch.trim().toLowerCase();
    if (!search) return payouts;
    return payouts.filter((payout) =>
      [
        payout.payoutId,
        payout.partnerCode,
        payout.partnerFirstName,
        payout.partnerLastName,
        payout.partnerEmail,
        payout.paymentMethod,
        payout.referenceNumber,
        payout.createdBy,
        ...(payout.orderIds || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [payouts, payoutSearch]);

  const filteredCampaigns = useMemo(() => {
    const search = campaignSearch.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      const matchesStatus =
        campaignStatus === "all" || campaign.status === campaignStatus;
      const searchableText = [
        campaign.title,
        campaign.slug,
        campaign.headline,
        campaign.summary,
        campaign.facebookCopy,
        campaign.instagramCopy,
        campaign.tiktokCopy,
        campaign.smsCopy,
        campaign.emailSubject,
        campaign.emailCopy,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!search || searchableText.includes(search));
    });
  }, [campaigns, campaignSearch, campaignStatus]);

  const payoutEligibleReferrals = useMemo(() => {
    if (!payoutPartner) return [];
    return referrals.filter(
      (referral) =>
        referral.partnerAccountId === payoutPartner.application.accountId &&
        !referral.isSelfUse &&
        referral.commissionAmountCents > 0 &&
        referral.referralStatus === "earned" &&
        referral.commissionStatus !== "paid" &&
        !referral.payoutId &&
        !referral.payoutHold
    );
  }, [payoutPartner, referrals]);

  const selectedPayoutTotal = useMemo(() => {
    const selected = new Set(selectedOrderIds);
    return payoutEligibleReferrals.reduce(
      (total, referral) =>
        selected.has(referral.orderId)
          ? total + referral.commissionAmountCents
          : total,
      0
    );
  }, [payoutEligibleReferrals, selectedOrderIds]);

  function setRiskDraftField(
    flagId,
    field,
    value
  ) {
    setRiskDrafts((current) => ({
      ...current,
      [flagId]: {
        status:
          current[flagId]?.status || "new",
        severity:
          current[flagId]?.severity ||
          "medium",
        privateNotes:
          current[flagId]?.privateNotes ||
          "",
        note:
          current[flagId]?.note || "",
        [field]: value,
      },
    }));
  }

  async function reloadRiskFlags() {
    const response = await fetch(
      "/api/admin/partner-risk-flags",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization:
            `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        cache: "no-store",
      }
    );

    const result = await readJson(response);
    const nextFlags = normalizeRiskFlags(
      result.flags ||
      result.records ||
      []
    );

    setRiskFlags(nextFlags);
    setRiskStatusCounts(
      normalizeRiskCounts(
        result.statusCounts
      )
    );

    setRiskDrafts((current) =>
      Object.fromEntries(
        nextFlags.map((flag) => [
          flag.flagId,
          {
            status:
              current[flag.flagId]?.status ||
              flag.status,
            severity:
              current[flag.flagId]
                ?.severity ||
              flag.severity,
            privateNotes:
              current[flag.flagId]
                ?.privateNotes ??
              flag.privateNotes ??
              "",
            note:
              current[flag.flagId]?.note ||
              "",
          },
        ])
      )
    );

    return nextFlags;
  }

  async function createManualRiskFlag(
    referral
  ) {
    if (!referral || riskSavingId) {
      return;
    }

    const privateNotes = window.prompt(
      `Enter the private reason for opening a review on order ${referral.orderId}.`
    );

    if (privateNotes == null) {
      return;
    }

    if (!privateNotes.trim()) {
      setActionError(
        "Enter a private review reason."
      );
      return;
    }

    setRiskSavingId(
      `create-${referral.orderId}`
    );
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        "/api/admin/partner-risk-flags/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
            Authorization:
              `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          body: JSON.stringify({
            orderId: referral.orderId,
            flagType: "manual_review",
            severity: "medium",
            title:
              `Manual review for order ${referral.orderId}`,
            summary:
              "An administrator opened a manual review for this referral order.",
            privateNotes:
              privateNotes.trim(),
            payoutHoldRecommended:
              false,
          }),
        }
      );

      const result = await readJson(response);
      await reloadRiskFlags();

      setExpandedRiskFlagId(
        result.flag?.flagId || ""
      );
      setActionMessage(
        result.message ||
        "The manual review was opened."
      );
    } catch (error) {
      setActionError(
        error.message ||
        "The manual review could not be opened."
      );
    } finally {
      setRiskSavingId("");
    }
  }

  async function saveRiskFlag(flag) {
    if (!flag || riskSavingId) {
      return;
    }

    const draft =
      riskDrafts[flag.flagId] || {};

    setRiskSavingId(flag.flagId);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        "/api/admin/partner-risk-flags/update",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
            Authorization:
              `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          body: JSON.stringify({
            flagId: flag.flagId,
            status:
              draft.status || flag.status,
            severity:
              draft.severity ||
              flag.severity,
            privateNotes:
              draft.privateNotes ?? "",
            note: draft.note || "",
          }),
        }
      );

      const result = await readJson(response);
      const updatedFlag = result.flag;

      setRiskFlags((current) =>
        normalizeRiskFlags(
          current.map((record) =>
            record.flagId ===
            updatedFlag.flagId
              ? updatedFlag
              : record
          )
        )
      );

      setRiskDrafts((current) => ({
        ...current,
        [updatedFlag.flagId]: {
          status: updatedFlag.status,
          severity:
            updatedFlag.severity,
          privateNotes:
            updatedFlag.privateNotes ||
            "",
          note: "",
        },
      }));

      await reloadRiskFlags();

      setActionMessage(
        result.message ||
        "The review record was updated."
      );
    } catch (error) {
      setActionError(
        error.message ||
        "The review record could not be updated."
      );
    } finally {
      setRiskSavingId("");
    }
  }

  async function toggleReferralPayoutHold(
    referral,
    flagId = ""
  ) {
    if (
      !referral ||
      holdSavingOrderId
    ) {
      return;
    }

    const nextHold =
      !referral.payoutHold;

    let reason = "";

    if (nextHold) {
      const enteredReason = window.prompt(
        `Enter the private reason for holding commission on order ${referral.orderId}.`
      );

      if (enteredReason == null) {
        return;
      }

      reason = enteredReason.trim();

      if (!reason) {
        setActionError(
          "A private payout-hold reason is required."
        );
        return;
      }
    } else {
      const enteredReason = window.prompt(
        `Enter the private reason for clearing the payout hold on order ${referral.orderId}.`,
        "Review completed; payout hold cleared."
      );

      if (enteredReason == null) {
        return;
      }

      reason = enteredReason.trim();

      if (!reason) {
        setActionError(
          "A private reason is required before clearing a payout hold."
        );
        return;
      }
    }

    const actionLabel = nextHold
      ? "place this commission on payout hold"
      : "clear this commission payout hold";

    if (
      !window.confirm(
        `Confirm that you want to ${actionLabel}.`
      )
    ) {
      return;
    }

    setHoldSavingOrderId(
      referral.orderId
    );
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        "/api/admin/partner-referral-payout-hold",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
            Authorization:
              `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          body: JSON.stringify({
            orderId: referral.orderId,
            hold: nextHold,
            reason,
            flagId,
          }),
        }
      );

      const result = await readJson(response);
      const updatedReferral =
        result.referral;

      setReferrals((current) =>
        normalizeReferrals(
          current.map((record) =>
            record.orderId ===
            updatedReferral.orderId
              ? updatedReferral
              : record
          )
        )
      );

      await reloadRiskFlags();

      setActionMessage(
        result.message ||
        "The payout-hold status was updated."
      );
    } catch (error) {
      setActionError(
        error.message ||
        "The payout-hold status could not be updated."
      );
    } finally {
      setHoldSavingOrderId("");
    }
  }
  async function loadAnalytics(event) {
    event?.preventDefault?.();
    if (!adminSecret || isLoadingAnalytics) return;

    setIsLoadingAnalytics(true);
    setAnalyticsError("");

    try {
      const search = new URLSearchParams({ period: analyticsPeriod });
      if (analyticsPartnerCode) {
        search.set("partnerCode", analyticsPartnerCode);
      }
      if (analyticsCampaignSlug) {
        search.set("campaign", analyticsCampaignSlug);
      }

      const response = await fetch(
        `/api/admin/partner-analytics?${search.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          cache: "no-store",
        }
      );
      const result = await readJson(response);
      setAnalytics(normalizeAnalyticsReport(result.analytics));
    } catch (error) {
      setAnalyticsError(
        error.message || "Referral analytics could not be loaded."
      );
    } finally {
      setIsLoadingAnalytics(false);
    }
  }

  function handleUnlock(event) {
    event.preventDefault();
    const cleanedSecret = secretInput.trim();
    if (!cleanedSecret) {
      setLoadError("Enter the administrator secret.");
      return;
    }
    storeSecret(cleanedSecret);
    setAdminSecret(cleanedSecret);
    setSecretInput("");
  }

  function clearAdminSession() {
    removeStoredSecret();
    setAdminSecret("");
    setSecretInput("");
    setApplications([]);
    setReferrals([]);
    setRiskFlags([]);
    setRiskStatusCounts(
      EMPTY_RISK_COUNTS
    );
    setRiskDrafts({});
    setRiskSearch("");
    setRiskStatus("all");
    setExpandedRiskFlagId("");
    setPayouts([]);
    setLeaderboardEntries([]);
    setRewards([]);
    setCampaigns([]);
    setAnalytics(EMPTY_ANALYTICS_REPORT);
    setAnalyticsPeriod("30");
    setAnalyticsPartnerCode("");
    setAnalyticsCampaignSlug("");
    setAnalyticsError("");
    setLeaderboardReward(null);
    setRewardToIssue(null);
    setIsReady(false);
    setLoadError("");
    setActionError("");
    setActionMessage("");
    closeActionPanel();
    closePayoutPanel();
  }

  function openActionPanel(application, action) {
    setSelectedApplication(application);
    setSelectedAction(action);
    setCustomerMessage("");
    setAdminNotes(application.adminNotes || "");
    setActionError("");
    setActionMessage("");
    window.setTimeout(() => {
      document.getElementById("partner-action-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }

  function closeActionPanel() {
    setSelectedApplication(null);
    setSelectedAction("");
    setCustomerMessage("");
    setAdminNotes("");
    setIsActing(false);
  }

  async function submitAction(event) {
    event.preventDefault();
    if (!selectedApplication || !selectedAction || isActing) return;
    if (["deny", "suspend"].includes(selectedAction) && !customerMessage.trim()) {
      setActionError(
        selectedAction === "deny"
          ? "Enter the reason the customer will see before denying the application."
          : "Enter the reason the customer will see before suspending the partner."
      );
      return;
    }
    if (!window.confirm(getConfirmationText(selectedAction, selectedApplication))) {
      return;
    }
    setIsActing(true);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch("/api/admin/partner-applications/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          action: selectedAction,
          accountId: selectedApplication.accountId,
          customerMessage: customerMessage.trim(),
          adminNotes: adminNotes.trim(),
        }),
      });
      const result = await readJson(response);
      const updatedApplication = result.application;
      setApplications((current) =>
        normalizeApplications(
          current.map((record) =>
            record.accountId === updatedApplication.accountId
              ? updatedApplication
              : record
          )
        )
      );
      setActionMessage(result.message || "The Partner Program record was updated.");
      closeActionPanel();
    } catch (error) {
      setActionError(error.message || "The Partner Program action failed.");
      setIsActing(false);
    }
  }

  async function saveCommissionRate(application) {
    if (!application || rateSavingId) return;
    const rawPercentage = String(rateDrafts[application.accountId] ?? "").trim();
    const percentage = Number(rawPercentage);
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(rawPercentage) ||
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 50
    ) {
      setActionError(
        "Commission rate must be between 0% and 50%, using no more than two decimal places."
      );
      return;
    }
    if (
      !window.confirm(
        `Set ${application.code} to a ${percentage}% commission rate for future referrals?`
      )
    ) {
      return;
    }
    setRateSavingId(application.accountId);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch(
        "/api/admin/partner-applications/commission-rate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          body: JSON.stringify({
            accountId: application.accountId,
            commissionRatePercent: percentage,
          }),
        }
      );
      const result = await readJson(response);
      const updatedApplication = result.application;
      setApplications((current) =>
        normalizeApplications(
          current.map((record) =>
            record.accountId === updatedApplication.accountId
              ? updatedApplication
              : record
          )
        )
      );
      setRateDrafts((current) => ({
        ...current,
        [updatedApplication.accountId]: String(
          Number(updatedApplication.commissionRateBps || 0) / 100
        ),
      }));
      setActionMessage(
        result.message || "The commission rate was updated for future referrals."
      );
    } catch (error) {
      setActionError(error.message || "The commission rate could not be updated.");
    } finally {
      setRateSavingId("");
    }
  }

  async function saveThreshold(event) {
    event.preventDefault();
    if (isSavingThreshold) return;
    const raw = thresholdDraft.trim();
    const dollars = Number(raw);
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(raw) ||
      !Number.isFinite(dollars) ||
      dollars < 0 ||
      dollars > 10000
    ) {
      setActionError(
        "The payout threshold must be between $0 and $10,000, using no more than two decimal places."
      );
      return;
    }
    if (!window.confirm(`Change the minimum payout threshold to ${formatMoneyFromCents(Math.round(dollars * 100))}?`)) {
      return;
    }
    setIsSavingThreshold(true);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch("/api/admin/partner-payout-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        body: JSON.stringify({ minimumPayoutDollars: dollars }),
      });
      const result = await readJson(response);
      const nextSettings = { ...EMPTY_SETTINGS, ...(result.settings || {}) };
      setSettings(nextSettings);
      setThresholdDraft(String(Number(nextSettings.minimumPayoutCents || 0) / 100));
      setActionMessage(result.message || "The payout threshold was updated.");
    } catch (error) {
      setActionError(error.message || "The payout threshold could not be updated.");
    } finally {
      setIsSavingThreshold(false);
    }
  }

  function openPayoutPanel(balance) {
    const eligible = referrals.filter(
      (referral) =>
        referral.partnerAccountId === balance.application.accountId &&
        referral.referralStatus === "earned" &&
        referral.commissionStatus !== "paid" &&
        !referral.payoutId &&
        !referral.payoutHold
    );
    setPayoutPartner(balance);
    setSelectedOrderIds(eligible.map((referral) => referral.orderId));
    setPayoutForm({
      payoutType: "cash",
      paymentMethod: "",
      referenceNumber: "",
      paidAt: getLocalDateTimeValue(),
      partnerNote: "",
      adminNotes: "",
    });
    setActionError("");
    setActionMessage("");
    window.setTimeout(() => {
      document.getElementById("partner-payout-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function closePayoutPanel() {
    setPayoutPartner(null);
    setSelectedOrderIds([]);
    setIsCreatingPayout(false);
  }

  function togglePayoutOrder(orderId) {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId]
    );
  }

  function toggleAllPayoutOrders() {
    setSelectedOrderIds((current) =>
      current.length === payoutEligibleReferrals.length
        ? []
        : payoutEligibleReferrals.map((referral) => referral.orderId)
    );
  }

  async function createPayout(event) {
    event.preventDefault();
    if (!payoutPartner || isCreatingPayout) return;
    if (selectedOrderIds.length === 0) {
      setActionError("Select at least one earned referral for this payout.");
      return;
    }
    if (selectedPayoutTotal < settings.minimumPayoutCents) {
      setActionError(
        `The selected payout is below the current ${formatMoneyFromCents(
          settings.minimumPayoutCents
        )} minimum.`
      );
      return;
    }
    if (!payoutForm.paymentMethod.trim()) {
      setActionError("Enter the payout method or store-credit description.");
      return;
    }
    const partnerName = `${payoutPartner.application.firstName || ""} ${
      payoutPartner.application.lastName || ""
    }`.trim() || payoutPartner.application.code;
    if (
      !window.confirm(
        `Record a ${formatMoneyFromCents(selectedPayoutTotal)} payout for ${partnerName}? This permanently marks ${selectedOrderIds.length} referral(s) as paid.`
      )
    ) {
      return;
    }
    setIsCreatingPayout(true);
    setActionError("");
    setActionMessage("");
    try {
      const paidAt = payoutForm.paidAt
        ? new Date(payoutForm.paidAt).toISOString()
        : undefined;
      const response = await fetch("/api/admin/partner-payouts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          accountId: payoutPartner.application.accountId,
          payoutType: payoutForm.payoutType,
          paymentMethod: payoutForm.paymentMethod.trim(),
          referenceNumber: payoutForm.referenceNumber.trim(),
          paidAt,
          partnerNote: payoutForm.partnerNote.trim(),
          adminNotes: payoutForm.adminNotes.trim(),
          orderIds: selectedOrderIds,
        }),
      });
      const result = await readJson(response);
      setActionMessage(result.message || "The partner payout was recorded.");
      closePayoutPanel();
      await loadPartnerData(adminSecret);
    } catch (error) {
      setActionError(error.message || "The partner payout could not be recorded.");
      setIsCreatingPayout(false);
    }
  }

  async function loadLeaderboardPeriod(event) {
    event?.preventDefault?.();
    if (isLoadingLeaderboard) return;

    const type = leaderboardPeriodType;
    const key = String(leaderboardPeriodKey || "").trim().toUpperCase();
    const valid =
      type === "monthly"
        ? /^\d{4}-(0[1-9]|1[0-2])$/.test(key)
        : /^\d{4}-Q[1-4]$/.test(key);

    if (!valid) {
      setActionError(
        type === "monthly"
          ? "Enter the monthly period as YYYY-MM."
          : "Enter the quarterly period as YYYY-Q1 through YYYY-Q4."
      );
      return;
    }

    setIsLoadingLeaderboard(true);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        `/api/admin/partner-leaderboard?periodType=${encodeURIComponent(
          type
        )}&periodKey=${encodeURIComponent(key)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${adminSecret}`,
          },
          credentials: "same-origin",
          cache: "no-store",
        }
      );
      const result = await readJson(response);
      setLeaderboardPeriod(result.period || null);
      setLeaderboardEntries(normalizeLeaderboardEntries(result.entries || []));
      setLeaderboardReward(result.reward || null);
      const nextSettings = normalizeLeaderboardSettings(result.settings);
      setLeaderboardSettings(nextSettings);
      setLeaderboardPeriodKey(key);
    } catch (error) {
      setActionError(error.message || "The leaderboard period could not be loaded.");
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }

  async function saveLeaderboardSettings(event) {
    event.preventDefault();
    if (isSavingLeaderboardSettings) return;

    const monthlyDollars = Number(leaderboardDraft.monthlyRewardAmountDollars);
    const quarterlyDollars = Number(
      leaderboardDraft.quarterlyRewardAmountDollars
    );
    const monthlyMinimum = Number(leaderboardDraft.monthlyMinimumReferrals);
    const quarterlyMinimum = Number(leaderboardDraft.quarterlyMinimumReferrals);

    if (
      !Number.isFinite(monthlyDollars) ||
      monthlyDollars < 0 ||
      monthlyDollars > 10000 ||
      !Number.isFinite(quarterlyDollars) ||
      quarterlyDollars < 0 ||
      quarterlyDollars > 10000
    ) {
      setActionError("Reward amounts must be between $0 and $10,000.");
      return;
    }

    if (
      !Number.isInteger(monthlyMinimum) ||
      monthlyMinimum < 1 ||
      monthlyMinimum > 1000 ||
      !Number.isInteger(quarterlyMinimum) ||
      quarterlyMinimum < 1 ||
      quarterlyMinimum > 1000
    ) {
      setActionError("Minimum referrals must be whole numbers from 1 to 1,000.");
      return;
    }

    if (
      leaderboardDraft.quarterlyRewardType === "swag" &&
      !String(leaderboardDraft.quarterlyRewardDescription || "").trim()
    ) {
      setActionError("Enter a description for the quarterly swag reward.");
      return;
    }

    if (!window.confirm("Save the leaderboard and reward rules?")) return;

    setIsSavingLeaderboardSettings(true);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/admin/partner-leaderboard-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          leaderboardMetric: leaderboardDraft.leaderboardMetric,
          monthlyRewardEnabled: Boolean(leaderboardDraft.monthlyRewardEnabled),
          monthlyRewardType: leaderboardDraft.monthlyRewardType,
          monthlyRewardAmountDollars: monthlyDollars,
          monthlyMinimumReferrals: monthlyMinimum,
          quarterlyRewardEnabled: Boolean(
            leaderboardDraft.quarterlyRewardEnabled
          ),
          quarterlyRewardType: leaderboardDraft.quarterlyRewardType,
          quarterlyRewardAmountDollars: quarterlyDollars,
          quarterlyRewardDescription: String(
            leaderboardDraft.quarterlyRewardDescription || ""
          ).trim(),
          quarterlyMinimumReferrals: quarterlyMinimum,
        }),
      });
      const result = await readJson(response);
      const nextSettings = normalizeLeaderboardSettings(result.settings);
      setLeaderboardSettings(nextSettings);
      setLeaderboardDraft({
        ...nextSettings,
        monthlyRewardAmountDollars: String(
          nextSettings.monthlyRewardAmountCents / 100
        ),
        quarterlyRewardAmountDollars: String(
          nextSettings.quarterlyRewardAmountCents / 100
        ),
      });
      setActionMessage(
        result.message || "The leaderboard and reward rules were updated."
      );
      await loadLeaderboardPeriod();
    } catch (error) {
      setActionError(error.message || "The leaderboard settings could not be saved.");
    } finally {
      setIsSavingLeaderboardSettings(false);
    }
  }

  async function awardLeaderboardWinner() {
    if (isAwardingReward || leaderboardReward) return;
    const winner = leaderboardEntries.find((entry) => entry.eligible);
    if (!winner) {
      setActionError("No partner currently meets the referral minimum for this period.");
      return;
    }

    if (
      !window.confirm(
        `Record ${winner.partnerCode} as the ${leaderboardPeriodKey} ${leaderboardPeriodType} leaderboard winner?`
      )
    ) {
      return;
    }

    setIsAwardingReward(true);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/admin/partner-rewards/award", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          periodType: leaderboardPeriodType,
          periodKey: leaderboardPeriodKey,
          partnerNote: awardPartnerNote.trim(),
          adminNotes: awardAdminNotes.trim(),
        }),
      });
      const result = await readJson(response);
      setLeaderboardReward(result.reward || null);
      setRewards((current) =>
        normalizeRewards([result.reward, ...current.filter((reward) => reward.rewardId !== result.reward?.rewardId)])
      );
      setAwardPartnerNote("");
      setAwardAdminNotes("");
      setActionMessage(result.message || "The leaderboard winner was recorded.");
    } catch (error) {
      setActionError(error.message || "The leaderboard winner could not be recorded.");
    } finally {
      setIsAwardingReward(false);
    }
  }

  function openIssueRewardPanel(reward) {
    setRewardToIssue(reward);
    setIssueForm({
      deliveryMethod: reward.deliveryMethod || "",
      referenceNumber: reward.referenceNumber || "",
      issuedAt: getLocalDateTimeValue(),
      partnerNote: reward.partnerNote || "",
      adminNotes: reward.adminNotes || "",
    });
    setActionError("");
    setActionMessage("");
    window.setTimeout(() => {
      document.getElementById("partner-reward-issue-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }

  function closeIssueRewardPanel() {
    setRewardToIssue(null);
    setIsIssuingReward(false);
  }

  async function issueReward(event) {
    event.preventDefault();
    if (!rewardToIssue || isIssuingReward) return;
    if (!issueForm.deliveryMethod.trim()) {
      setActionError("Enter how the reward was delivered or issued.");
      return;
    }

    if (
      !window.confirm(
        `Mark the ${rewardToIssue.periodKey} reward for ${rewardToIssue.partnerCode} as issued?`
      )
    ) {
      return;
    }

    setIsIssuingReward(true);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/admin/partner-rewards/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          rewardId: rewardToIssue.rewardId,
          deliveryMethod: issueForm.deliveryMethod.trim(),
          referenceNumber: issueForm.referenceNumber.trim(),
          issuedAt: issueForm.issuedAt
            ? new Date(issueForm.issuedAt).toISOString()
            : undefined,
          partnerNote: issueForm.partnerNote.trim(),
          adminNotes: issueForm.adminNotes.trim(),
        }),
      });
      const result = await readJson(response);
      setRewards((current) =>
        normalizeRewards(
          current.map((reward) =>
            reward.rewardId === result.reward.rewardId ? result.reward : reward
          )
        )
      );
      if (leaderboardReward?.rewardId === result.reward.rewardId) {
        setLeaderboardReward(result.reward);
      }
      closeIssueRewardPanel();
      setActionMessage(result.message || "The leaderboard reward was marked as issued.");
    } catch (error) {
      setActionError(error.message || "The reward could not be marked as issued.");
      setIsIssuingReward(false);
    }
  }

  function startNewCampaign() {
    setCampaignForm(EMPTY_CAMPAIGN_FORM);
    setIsEditingCampaign(true);
    setActionError("");
    setActionMessage("");
    window.setTimeout(() => {
      document.getElementById("partner-campaign-editor")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function editCampaign(campaign) {
    setCampaignForm({
      campaignId: campaign.campaignId || "",
      slug: campaign.slug || "",
      title: campaign.title || "",
      summary: campaign.summary || "",
      headline: campaign.headline || "",
      facebookCopy: campaign.facebookCopy || "",
      instagramCopy: campaign.instagramCopy || "",
      tiktokCopy: campaign.tiktokCopy || "",
      smsCopy: campaign.smsCopy || "",
      emailSubject: campaign.emailSubject || "",
      emailCopy: campaign.emailCopy || "",
      imageUrl: campaign.imageUrl || "",
      downloadUrl: campaign.downloadUrl || "",
      disclaimer:
        campaign.disclaimer ||
        "For laboratory research use only. Not for human consumption.",
      ctaLabel: campaign.ctaLabel || "Research Catalog",
      destinationPath: campaign.destinationPath || "/checkout",
      startsAt: toLocalDateTimeInput(campaign.startsAt),
      endsAt: toLocalDateTimeInput(campaign.endsAt),
      displayOrder: String(campaign.displayOrder || 0),
    });
    setIsEditingCampaign(true);
    setActionError("");
    setActionMessage("");
    window.setTimeout(() => {
      document.getElementById("partner-campaign-editor")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function closeCampaignEditor() {
    setCampaignForm(EMPTY_CAMPAIGN_FORM);
    setIsEditingCampaign(false);
    setIsSavingCampaign(false);
  }

  function updateCampaignForm(field, value) {
    setCampaignForm((current) => ({ ...current, [field]: value }));
  }

  async function saveCampaign(event) {
    event.preventDefault();
    if (isSavingCampaign) return;

    const slug = campaignForm.slug.trim().toLowerCase();
    const title = campaignForm.title.trim();
    const destinationPath = campaignForm.destinationPath.trim();

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3) {
      setActionError(
        "Campaign slugs must contain at least 3 lowercase letters, numbers, or single hyphens."
      );
      return;
    }
    if (!title) {
      setActionError("Enter a campaign title.");
      return;
    }
    if (!destinationPath.startsWith("/") || destinationPath.startsWith("//")) {
      setActionError("The campaign destination must begin with one slash.");
      return;
    }

    setIsSavingCampaign(true);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/admin/partner-campaigns/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          ...campaignForm,
          slug,
          title,
          destinationPath,
          displayOrder: Number(campaignForm.displayOrder || 0),
          startsAt: campaignForm.startsAt
            ? new Date(campaignForm.startsAt).toISOString()
            : "",
          endsAt: campaignForm.endsAt
            ? new Date(campaignForm.endsAt).toISOString()
            : "",
        }),
      });
      const result = await readJson(response);
      const savedCampaign = result.campaign;
      setCampaigns((current) =>
        normalizeCampaigns([
          savedCampaign,
          ...current.filter(
            (campaign) => campaign.campaignId !== savedCampaign.campaignId
          ),
        ])
      );
      setActionMessage(result.message || "The marketing campaign draft was saved.");
      closeCampaignEditor();
    } catch (error) {
      setActionError(error.message || "The marketing campaign could not be saved.");
      setIsSavingCampaign(false);
    }
  }

  async function changeCampaignStatus(campaign, status) {
    if (!campaign || campaignStatusSavingId) return;
    const actionText =
      status === "published"
        ? "publish this campaign to approved partners"
        : status === "archived"
        ? "archive and remove this campaign from the Partner Marketing Center"
        : "return this campaign to draft status";

    if (!window.confirm(`Are you sure you want to ${actionText}?`)) return;

    setCampaignStatusSavingId(campaign.campaignId);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/admin/partner-campaigns/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        credentials: "same-origin",
        body: JSON.stringify({ campaignId: campaign.campaignId, status }),
      });
      const result = await readJson(response);
      const updatedCampaign = result.campaign;
      setCampaigns((current) =>
        normalizeCampaigns(
          current.map((record) =>
            record.campaignId === updatedCampaign.campaignId
              ? updatedCampaign
              : record
          )
        )
      );
      setActionMessage(result.message || "The marketing campaign status was updated.");
    } catch (error) {
      setActionError(error.message || "The campaign status could not be updated.");
    } finally {
      setCampaignStatusSavingId("");
    }
  }

  if (!adminSecret) {
    return (
      <>
        <style>{partnerHqCss}</style>
        <main className="partner-hq-page">
          <section className="partner-hq-login-card">
            <p className="eyebrow">PROTECTED ADMIN AREA</p>
            <h1>Partner HQ</h1>
            <p>
              Cloudflare Access protects this route. Enter the same administrator
              secret used by Customer Manager.
            </p>
            <form onSubmit={handleUnlock}>
              <label className="partner-hq-field">
                <span>Administrator Secret</span>
                <input
                  type="password"
                  value={secretInput}
                  onChange={(event) => setSecretInput(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter administrator secret"
                />
              </label>
              {loadError && <Notice type="error">{loadError}</Notice>}
              <button type="submit" className="primary-btn partner-hq-full-button">
                Unlock Partner HQ
              </button>
            </form>
            <button
              type="button"
              className="secondary-btn partner-hq-full-button"
              onClick={() => onNavigate("missionControl")}
            >
              Back To Mission Control
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{partnerHqCss}</style>
      <main className="partner-hq-page">
        <section className="partner-hq-inner">
          <div className="partner-hq-topbar">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("missionControl")}
            >
              â† Mission Control
            </button>
            <div className="partner-hq-topbar-actions">
              <span className="partner-hq-source-pill">
                {isReady ? "Live Partner Registry" : "Registry Locked"}
              </span>
              <button
                type="button"
                className="partner-hq-link-button"
                onClick={clearAdminSession}
              >
                Clear Admin Session
              </button>
            </div>
          </div>

          <header className="partner-hq-hero">
            <div>
              <p className="eyebrow">304 PEPTIDES ADMIN</p>
              <h1>Partner HQ</h1>
              <p>
                Review applications, control partner access, set commission rates,
                audit referrals, measure referral traffic and conversion, record payouts,
                and manage monthly and quarterly partner rewards.
              </p>
            </div>
            <button
              type="button"
              className="primary-btn"
              disabled={isLoading}
              onClick={() => loadPartnerData(adminSecret)}
            >
              {isLoading ? "Refreshing..." : "Refresh Partner Data"}
            </button>
          </header>

          <section className="partner-hq-stats">
            <StatCard label="Partners" value={applicationStats.total} detail="All applications" />
            <StatCard label="Pending Review" value={applicationStats.pending} detail="Need a decision" />
            <StatCard label="Available To Pay" value={formatMoneyFromCents(referralStats.availableCommissionCents)} detail={`${referralStats.availableCount} earned referral(s)`} />
            <StatCard label="Paid Out" value={formatMoneyFromCents(payoutStats.amountCents)} detail={`${payoutStats.count} payout batch(es)`} />
            <StatCard label="Payout Minimum" value={formatMoneyFromCents(settings.minimumPayoutCents)} detail="Adjustable below" />
          </section>

          {loadError && <Notice type="error">{loadError}</Notice>}
          {actionError && <Notice type="error">{actionError}</Notice>}
          {actionMessage && <Notice type="success">{actionMessage}</Notice>}

          <section className="partner-hq-panel partner-hq-analytics-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">REFERRAL ANALYTICS</p>
                <h2>Clicks, Visitors And Conversion</h2>
                <p>
                  Compare partner links, campaigns, channels and QR scans. Visitors are
                  counted with anonymous first-party IDs; customer IP addresses are not stored.
                </p>
              </div>
              <span className="partner-hq-source-pill">
                {analytics.period.label || "Last 30 Days"}
              </span>
            </div>

            <form className="partner-hq-analytics-filters" onSubmit={loadAnalytics}>
              <label className="partner-hq-field">
                <span>Reporting Period</span>
                <select
                  value={analyticsPeriod}
                  disabled={isLoadingAnalytics}
                  onChange={(event) => setAnalyticsPeriod(event.target.value)}
                >
                  {ANALYTICS_PERIOD_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="partner-hq-field">
                <span>Partner</span>
                <select
                  value={analyticsPartnerCode}
                  disabled={isLoadingAnalytics}
                  onChange={(event) => setAnalyticsPartnerCode(event.target.value)}
                >
                  <option value="">All Partners</option>
                  {applications
                    .filter((application) =>
                      ["approved", "suspended"].includes(application.status)
                    )
                    .map((application) => (
                      <option key={application.accountId} value={application.code}>
                        {application.code} â€” {application.firstName} {application.lastName}
                      </option>
                    ))}
                </select>
              </label>

              <label className="partner-hq-field">
                <span>Campaign</span>
                <select
                  value={analyticsCampaignSlug}
                  disabled={isLoadingAnalytics}
                  onChange={(event) => setAnalyticsCampaignSlug(event.target.value)}
                >
                  <option value="">All Campaigns And General Links</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.campaignId} value={campaign.slug}>
                      {campaign.title} ({campaign.slug})
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className="primary-btn" disabled={isLoadingAnalytics}>
                {isLoadingAnalytics ? "Loading Analytics..." : "Apply Analytics Filters"}
              </button>
            </form>

            {analyticsError && <Notice type="error">{analyticsError}</Notice>}

            <section className="partner-hq-analytics-stats">
              <StatCard
                label="Total Clicks"
                value={analytics.summary.totalClicks.toLocaleString("en-US")}
                detail="Every tracked link opening"
              />
              <StatCard
                label="Unique Visitors"
                value={analytics.summary.uniqueVisitors.toLocaleString("en-US")}
                detail="Anonymous first-party visitors"
              />
              <StatCard
                label="Attributed Orders"
                value={analytics.summary.attributedOrders.toLocaleString("en-US")}
                detail={`${analytics.summary.earnedOrders} earned Â· ${analytics.summary.voidedOrders} voided`}
              />
              <StatCard
                label="Conversion Rate"
                value={formatPercentFromBasisPoints(analytics.summary.conversionRateBps)}
                detail="Attributed orders per unique visitor"
              />
              <StatCard
                label="Earned Revenue"
                value={formatMoneyFromCents(analytics.summary.earnedRevenueCents)}
                detail="Paid or later referral statuses"
              />
              <StatCard
                label="Earned Commission"
                value={formatMoneyFromCents(analytics.summary.earnedCommissionCents)}
                detail="Partner commission generated"
              />
            </section>

            <div className="partner-hq-analytics-grid">
              <AnalyticsTable
                eyebrow="PARTNER PERFORMANCE"
                title="Partners"
                emptyText="Tracked partner traffic will appear after referral links are opened."
                rows={analytics.byPartner}
                columns={[
                  { label: "Partner", render: (row) => row.partnerCode || "Unknown" },
                  { label: "Clicks", render: (row) => row.totalClicks.toLocaleString("en-US") },
                  { label: "Visitors", render: (row) => row.uniqueVisitors.toLocaleString("en-US") },
                  { label: "Orders", render: (row) => row.attributedOrders.toLocaleString("en-US") },
                  { label: "Conversion", render: (row) => formatPercentFromBasisPoints(row.conversionRateBps) },
                  { label: "Revenue", render: (row) => formatMoneyFromCents(row.earnedRevenueCents) },
                  { label: "Commission", render: (row) => formatMoneyFromCents(row.earnedCommissionCents) },
                ]}
              />

              <AnalyticsTable
                eyebrow="CAMPAIGN PERFORMANCE"
                title="Campaigns"
                emptyText="Campaign results will appear after campaign links receive traffic."
                rows={analytics.byCampaign}
                columns={[
                  {
                    label: "Campaign",
                    render: (row) => (
                      <span>
                        <strong>{row.campaignTitle || "General Referral Link"}</strong>
                        <small>{row.campaignSlug || "general-referral-link"}</small>
                      </span>
                    ),
                  },
                  { label: "Clicks", render: (row) => row.totalClicks.toLocaleString("en-US") },
                  { label: "Visitors", render: (row) => row.uniqueVisitors.toLocaleString("en-US") },
                  { label: "Orders", render: (row) => row.attributedOrders.toLocaleString("en-US") },
                  { label: "Conversion", render: (row) => formatPercentFromBasisPoints(row.conversionRateBps) },
                  { label: "Revenue", render: (row) => formatMoneyFromCents(row.earnedRevenueCents) },
                ]}
              />

              <AnalyticsTable
                eyebrow="CHANNEL PERFORMANCE"
                title="Where Traffic Came From"
                emptyText="Channel results will appear after tracked platform or QR links are opened."
                rows={analytics.byChannel}
                columns={[
                  { label: "Channel", render: (row) => formatAnalyticsChannel(row.channel) },
                  { label: "Clicks", render: (row) => row.totalClicks.toLocaleString("en-US") },
                  { label: "Visitors", render: (row) => row.uniqueVisitors.toLocaleString("en-US") },
                  { label: "Orders", render: (row) => row.attributedOrders.toLocaleString("en-US") },
                  { label: "Conversion", render: (row) => formatPercentFromBasisPoints(row.conversionRateBps) },
                  { label: "Revenue", render: (row) => formatMoneyFromCents(row.earnedRevenueCents) },
                ]}
              />

              <AnalyticsTable
                eyebrow="DAILY TREND"
                title="Traffic And Orders By Day"
                emptyText="Daily analytics will appear after the first tracked visit."
                rows={analytics.daily}
                columns={[
                  { label: "Date", render: (row) => formatAnalyticsDate(row.day) },
                  { label: "Clicks", render: (row) => row.totalClicks.toLocaleString("en-US") },
                  { label: "Visitors", render: (row) => row.uniqueVisitors.toLocaleString("en-US") },
                  { label: "Orders", render: (row) => row.attributedOrders.toLocaleString("en-US") },
                  { label: "Conversion", render: (row) => formatPercentFromBasisPoints(row.conversionRateBps) },
                  { label: "Revenue", render: (row) => formatMoneyFromCents(row.earnedRevenueCents) },
                ]}
              />
            </div>
          </section>

          <section className="partner-hq-panel partner-hq-settings-panel">
            <div>
              <p className="eyebrow">PAYOUT SETTINGS</p>
              <h2>Minimum Payout Threshold</h2>
              <p>
                Partners continue earning below the threshold. This only controls when
                a payout can be recorded. Set it to $0 to remove the minimum.
              </p>
              {settings.updatedAt && (
                <small>
                  Last updated {formatDate(settings.updatedAt)}
                  {settings.updatedBy ? ` by ${settings.updatedBy}` : ""}
                </small>
              )}
            </div>
            <form className="partner-hq-threshold-form" onSubmit={saveThreshold}>
              <label className="partner-hq-field">
                <span>Minimum Dollars</span>
                <div className="partner-hq-money-input">
                  <b>$</b>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    value={thresholdDraft}
                    disabled={isSavingThreshold}
                    onChange={(event) => setThresholdDraft(event.target.value)}
                  />
                </div>
              </label>
              <button type="submit" className="primary-btn" disabled={isSavingThreshold}>
                {isSavingThreshold ? "Saving..." : "Save Threshold"}
              </button>
            </form>
          </section>

          <form
            className="partner-hq-panel partner-hq-leaderboard-settings"
            onSubmit={saveLeaderboardSettings}
          >
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">LEADERBOARD SETTINGS</p>
                <h2>Ranking And Reward Rules</h2>
                <p>
                  Choose how partners are ranked and set the monthly and quarterly
                  qualification rules. Existing recorded winners are never recalculated.
                </p>
              </div>
              {leaderboardSettings.updatedAt && (
                <small>
                  Last updated {formatDate(leaderboardSettings.updatedAt)}
                  {leaderboardSettings.updatedBy
                    ? ` by ${leaderboardSettings.updatedBy}`
                    : ""}
                </small>
              )}
            </div>

            <div className="partner-hq-leaderboard-settings-grid">
              <label className="partner-hq-field">
                <span>Ranking Metric</span>
                <select
                  value={leaderboardDraft.leaderboardMetric}
                  disabled={isSavingLeaderboardSettings}
                  onChange={(event) =>
                    setLeaderboardDraft((current) => ({
                      ...current,
                      leaderboardMetric: event.target.value,
                    }))
                  }
                >
                  <option value="commission">Commission Earned</option>
                  <option value="revenue">Referral Revenue</option>
                  <option value="referrals">Earned Referrals</option>
                </select>
              </label>

              <section className="partner-hq-rule-card">
                <label className="partner-hq-checkbox-row">
                  <input
                    type="checkbox"
                    checked={Boolean(leaderboardDraft.monthlyRewardEnabled)}
                    disabled={isSavingLeaderboardSettings}
                    onChange={(event) =>
                      setLeaderboardDraft((current) => ({
                        ...current,
                        monthlyRewardEnabled: event.target.checked,
                      }))
                    }
                  />
                  <span>Monthly reward enabled</span>
                </label>
                <div className="partner-hq-rule-grid">
                  <label className="partner-hq-field">
                    <span>Reward Type</span>
                    <select
                      value={leaderboardDraft.monthlyRewardType}
                      disabled={isSavingLeaderboardSettings}
                      onChange={(event) =>
                        setLeaderboardDraft((current) => ({
                          ...current,
                          monthlyRewardType: event.target.value,
                        }))
                      }
                    >
                      <option value="store_credit">Store Credit</option>
                      <option value="cash">Cash</option>
                      <option value="swag">Swag</option>
                    </select>
                  </label>
                  <label className="partner-hq-field">
                    <span>Reward Dollars</span>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      step="0.01"
                      value={leaderboardDraft.monthlyRewardAmountDollars}
                      disabled={isSavingLeaderboardSettings}
                      onChange={(event) =>
                        setLeaderboardDraft((current) => ({
                          ...current,
                          monthlyRewardAmountDollars: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="partner-hq-field">
                    <span>Minimum Earned Referrals</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={leaderboardDraft.monthlyMinimumReferrals}
                      disabled={isSavingLeaderboardSettings}
                      onChange={(event) =>
                        setLeaderboardDraft((current) => ({
                          ...current,
                          monthlyMinimumReferrals: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="partner-hq-rule-card">
                <label className="partner-hq-checkbox-row">
                  <input
                    type="checkbox"
                    checked={Boolean(leaderboardDraft.quarterlyRewardEnabled)}
                    disabled={isSavingLeaderboardSettings}
                    onChange={(event) =>
                      setLeaderboardDraft((current) => ({
                        ...current,
                        quarterlyRewardEnabled: event.target.checked,
                      }))
                    }
                  />
                  <span>Quarterly reward enabled</span>
                </label>
                <div className="partner-hq-rule-grid">
                  <label className="partner-hq-field">
                    <span>Reward Type</span>
                    <select
                      value={leaderboardDraft.quarterlyRewardType}
                      disabled={isSavingLeaderboardSettings}
                      onChange={(event) =>
                        setLeaderboardDraft((current) => ({
                          ...current,
                          quarterlyRewardType: event.target.value,
                        }))
                      }
                    >
                      <option value="swag">Swag</option>
                      <option value="store_credit">Store Credit</option>
                      <option value="cash">Cash</option>
                    </select>
                  </label>
                  <label className="partner-hq-field">
                    <span>Reward Dollars</span>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      step="0.01"
                      value={leaderboardDraft.quarterlyRewardAmountDollars}
                      disabled={isSavingLeaderboardSettings}
                      onChange={(event) =>
                        setLeaderboardDraft((current) => ({
                          ...current,
                          quarterlyRewardAmountDollars: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="partner-hq-field">
                    <span>Minimum Earned Referrals</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={leaderboardDraft.quarterlyMinimumReferrals}
                      disabled={isSavingLeaderboardSettings}
                      onChange={(event) =>
                        setLeaderboardDraft((current) => ({
                          ...current,
                          quarterlyMinimumReferrals: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label className="partner-hq-field">
                  <span>Quarterly Reward Description</span>
                  <input
                    type="text"
                    maxLength="300"
                    value={leaderboardDraft.quarterlyRewardDescription}
                    disabled={isSavingLeaderboardSettings}
                    onChange={(event) =>
                      setLeaderboardDraft((current) => ({
                        ...current,
                        quarterlyRewardDescription: event.target.value,
                      }))
                    }
                    placeholder="304 Peptides swag package"
                  />
                </label>
              </section>
            </div>

            <div className="partner-hq-button-row">
              <button
                type="submit"
                className="primary-btn"
                disabled={isSavingLeaderboardSettings}
              >
                {isSavingLeaderboardSettings ? "Saving Rules..." : "Save Leaderboard Rules"}
              </button>
            </div>
          </form>

          {selectedApplication && selectedAction && (
            <form
              id="partner-action-panel"
              className="partner-hq-panel partner-hq-action-panel"
              onSubmit={submitAction}
            >
              <div className="partner-hq-section-heading">
                <div>
                  <p className="eyebrow">CONFIRM PARTNER ACTION</p>
                  <h2>{getActionTitle(selectedAction)}</h2>
                  <p>
                    {selectedApplication.firstName} {selectedApplication.lastName} â€”{" "}
                    <strong>{selectedApplication.code}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="partner-hq-link-button"
                  onClick={closeActionPanel}
                  disabled={isActing}
                >
                  Close
                </button>
              </div>
              <div className="partner-hq-form-grid">
                <label className="partner-hq-field">
                  <span>
                    Customer Message
                    {["deny", "suspend"].includes(selectedAction)
                      ? " â€” Required"
                      : " â€” Optional"}
                  </span>
                  <textarea
                    rows="5"
                    value={customerMessage}
                    onChange={(event) => setCustomerMessage(event.target.value)}
                    maxLength="1000"
                    disabled={isActing}
                    placeholder={getCustomerMessagePlaceholder(selectedAction)}
                  />
                  <small>{customerMessage.length}/1000 characters</small>
                </label>
                <label className="partner-hq-field">
                  <span>Private Admin Notes â€” Optional</span>
                  <textarea
                    rows="5"
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    maxLength="2000"
                    disabled={isActing}
                    placeholder="Visible only inside protected Partner HQ."
                  />
                  <small>{adminNotes.length}/2000 characters</small>
                </label>
              </div>
              <div className="partner-hq-button-row">
                <button
                  type="submit"
                  className={
                    ["deny", "suspend"].includes(selectedAction)
                      ? "partner-hq-danger-button"
                      : "primary-btn"
                  }
                  disabled={isActing}
                >
                  {isActing ? "Saving..." : getActionButtonLabel(selectedAction)}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeActionPanel}
                  disabled={isActing}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {rewardToIssue && (
            <form
              id="partner-reward-issue-panel"
              className="partner-hq-panel partner-hq-reward-issue-panel"
              onSubmit={issueReward}
            >
              <div className="partner-hq-section-heading">
                <div>
                  <p className="eyebrow">ISSUE LEADERBOARD REWARD</p>
                  <h2>{rewardToIssue.partnerCode} â€” {rewardToIssue.periodKey}</h2>
                  <p>
                    Record how the {rewardTypeLabel(rewardToIssue.rewardType).toLowerCase()}
                    reward was delivered. This becomes visible in the partnerâ€™s reward history,
                    except for the private administrator fields.
                  </p>
                </div>
                <button
                  type="button"
                  className="partner-hq-link-button"
                  onClick={closeIssueRewardPanel}
                  disabled={isIssuingReward}
                >
                  Close
                </button>
              </div>
              <div className="partner-hq-payout-form-grid">
                <label className="partner-hq-field">
                  <span>Delivery Method</span>
                  <input
                    type="text"
                    maxLength="100"
                    value={issueForm.deliveryMethod}
                    disabled={isIssuingReward}
                    placeholder="Store credit, mailed swag, Zelle, etc."
                    onChange={(event) =>
                      setIssueForm((current) => ({
                        ...current,
                        deliveryMethod: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="partner-hq-field">
                  <span>Issued Date</span>
                  <input
                    type="datetime-local"
                    value={issueForm.issuedAt}
                    disabled={isIssuingReward}
                    onChange={(event) =>
                      setIssueForm((current) => ({
                        ...current,
                        issuedAt: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="partner-hq-field">
                  <span>Reference Number â€” Optional</span>
                  <input
                    type="text"
                    maxLength="150"
                    value={issueForm.referenceNumber}
                    disabled={isIssuingReward}
                    onChange={(event) =>
                      setIssueForm((current) => ({
                        ...current,
                        referenceNumber: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="partner-hq-field">
                  <span>Partner Note â€” Optional</span>
                  <textarea
                    rows="4"
                    maxLength="1000"
                    value={issueForm.partnerNote}
                    disabled={isIssuingReward}
                    placeholder="Visible to the partner."
                    onChange={(event) =>
                      setIssueForm((current) => ({
                        ...current,
                        partnerNote: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="partner-hq-field">
                  <span>Private Admin Notes â€” Optional</span>
                  <textarea
                    rows="4"
                    maxLength="2000"
                    value={issueForm.adminNotes}
                    disabled={isIssuingReward}
                    placeholder="Visible only in Partner HQ."
                    onChange={(event) =>
                      setIssueForm((current) => ({
                        ...current,
                        adminNotes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="partner-hq-button-row">
                <button type="submit" className="primary-btn" disabled={isIssuingReward}>
                  {isIssuingReward ? "Recording..." : "Mark Reward Issued"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeIssueRewardPanel}
                  disabled={isIssuingReward}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {payoutPartner && (
            <form
              id="partner-payout-panel"
              className="partner-hq-panel partner-hq-payout-panel"
              onSubmit={createPayout}
            >
              <div className="partner-hq-section-heading">
                <div>
                  <p className="eyebrow">RECORD PARTNER PAYOUT</p>
                  <h2>
                    {payoutPartner.application.firstName}{" "}
                    {payoutPartner.application.lastName} â€”{" "}
                    {payoutPartner.application.code}
                  </h2>
                  <p>
                    Select earned referrals, choose cash or store credit, and record
                    the payment details. A referral can only be paid once.
                  </p>
                </div>
                <button
                  type="button"
                  className="partner-hq-link-button"
                  onClick={closePayoutPanel}
                  disabled={isCreatingPayout}
                >
                  Close
                </button>
              </div>

              <section className="partner-hq-payout-summary">
                <StatCard label="Selected Amount" value={formatMoneyFromCents(selectedPayoutTotal)} detail={`${selectedOrderIds.length} selected referral(s)`} />
                <StatCard label="Available Balance" value={formatMoneyFromCents(payoutPartner.availableCommissionCents)} detail={`${payoutPartner.availableReferralCount} unpaid earned referral(s)`} />
                <StatCard label="Required Minimum" value={formatMoneyFromCents(settings.minimumPayoutCents)} detail={selectedPayoutTotal >= settings.minimumPayoutCents ? "Threshold met" : "Below threshold"} />
              </section>

              <div className="partner-hq-select-all-row">
                <strong>Earned Referrals</strong>
                <button type="button" className="secondary-btn" onClick={toggleAllPayoutOrders}>
                  {selectedOrderIds.length === payoutEligibleReferrals.length
                    ? "Clear All"
                    : "Select All"}
                </button>
              </div>

              <div className="partner-hq-payout-referrals">
                {payoutEligibleReferrals.map((referral) => (
                  <label key={referral.orderId} className="partner-hq-payout-referral-row">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(referral.orderId)}
                      disabled={isCreatingPayout}
                      onChange={() => togglePayoutOrder(referral.orderId)}
                    />
                    <span>
                      <strong>Order #{referral.orderId}</strong>
                      <small>
                        {formatDate(referral.earnedAt || referral.createdAt)} Â·{" "}
                        {referral.orderStatus}
                      </small>
                    </span>
                    <b>{formatMoneyFromCents(referral.commissionAmountCents)}</b>
                  </label>
                ))}
              </div>

              <div className="partner-hq-payout-form-grid">
                <label className="partner-hq-field">
                  <span>Payout Type</span>
                  <select
                    value={payoutForm.payoutType}
                    disabled={isCreatingPayout}
                    onChange={(event) =>
                      setPayoutForm((current) => ({
                        ...current,
                        payoutType: event.target.value,
                      }))
                    }
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="store_credit">Store Credit</option>
                  </select>
                </label>
                <label className="partner-hq-field">
                  <span>Payment Method</span>
                  <input
                    type="text"
                    maxLength="100"
                    value={payoutForm.paymentMethod}
                    disabled={isCreatingPayout}
                    placeholder={
                      payoutForm.payoutType === "store_credit"
                        ? "Store credit issued"
                        : "Zelle, Venmo, Cash App, check, etc."
                    }
                    onChange={(event) =>
                      setPayoutForm((current) => ({
                        ...current,
                        paymentMethod: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="partner-hq-field">
                  <span>Payment Date</span>
                  <input
                    type="datetime-local"
                    value={payoutForm.paidAt}
                    disabled={isCreatingPayout}
                    onChange={(event) =>
                      setPayoutForm((current) => ({
                        ...current,
                        paidAt: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="partner-hq-field">
                  <span>Reference Number â€” Optional</span>
                  <input
                    type="text"
                    maxLength="150"
                    value={payoutForm.referenceNumber}
                    disabled={isCreatingPayout}
                    placeholder="Transaction, confirmation, or credit reference"
                    onChange={(event) =>
                      setPayoutForm((current) => ({
                        ...current,
                        referenceNumber: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="partner-hq-field">
                  <span>Partner Note â€” Optional</span>
                  <textarea
                    rows="4"
                    maxLength="1000"
                    value={payoutForm.partnerNote}
                    disabled={isCreatingPayout}
                    placeholder="Visible to the partner in their payout history."
                    onChange={(event) =>
                      setPayoutForm((current) => ({
                        ...current,
                        partnerNote: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="partner-hq-field">
                  <span>Private Admin Notes â€” Optional</span>
                  <textarea
                    rows="4"
                    maxLength="2000"
                    value={payoutForm.adminNotes}
                    disabled={isCreatingPayout}
                    placeholder="Visible only inside protected Partner HQ."
                    onChange={(event) =>
                      setPayoutForm((current) => ({
                        ...current,
                        adminNotes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="partner-hq-button-row">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    isCreatingPayout ||
                    selectedOrderIds.length === 0 ||
                    selectedPayoutTotal < settings.minimumPayoutCents
                  }
                >
                  {isCreatingPayout
                    ? "Recording Payout..."
                    : `Record ${formatMoneyFromCents(selectedPayoutTotal)} Payout`}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closePayoutPanel}
                  disabled={isCreatingPayout}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <section className="partner-hq-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">PAYOUT ELIGIBILITY</p>
                <h2>Partner Balances</h2>
              </div>
              <span>
                Current minimum: <strong>{formatMoneyFromCents(settings.minimumPayoutCents)}</strong>
              </span>
            </div>
            <div className="partner-hq-stack">
              {partnerBalances.map((balance) => {
                const application = balance.application;
                const eligible =
                  balance.availableReferralCount > 0 &&
                  balance.availableCommissionCents >= settings.minimumPayoutCents;
                return (
                  <article key={application.accountId} className="partner-hq-balance-card">
                    <div>
                      <p className="eyebrow">{application.code || "NO CODE"}</p>
                      <h3>
                        {`${application.firstName || ""} ${application.lastName || ""}`.trim() ||
                          application.email ||
                          "Partner unavailable"}
                      </h3>
                      <p className="partner-hq-muted">{application.email}</p>
                    </div>
                    <div className="partner-hq-balance-metrics">
                      <QuickDetail label="Available" value={formatMoneyFromCents(balance.availableCommissionCents)} />
                      <QuickDetail label="Pending" value={formatMoneyFromCents(balance.pendingCommissionCents)} />
                      <QuickDetail label="Previously Paid" value={formatMoneyFromCents(balance.paidCommissionCents)} />
                      <QuickDetail label="Status" value={eligible ? "Eligible" : balance.availableReferralCount ? "Below Minimum" : "No Balance"} />
                    </div>
                    <div className="partner-hq-balance-action">
                      {balance.adjustmentCount > 0 && (
                        <span className="partner-hq-adjustment-warning">
                          {balance.adjustmentCount} paid referral adjustment(s) need review
                        </span>
                      )}
                      <button
                        type="button"
                        className="primary-btn"
                        disabled={!eligible}
                        onClick={() => openPayoutPanel(balance)}
                      >
                        Record Payout
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="partner-hq-panel partner-hq-leaderboard-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">PARTNER LEADERBOARD</p>
                <h2>Monthly And Quarterly Rankings</h2>
                <p>
                  Only earned referrals count. Pending and voided orders do not affect the rankings.
                </p>
              </div>
              <span>
                Ranked by <strong>{leaderboardSettings.leaderboardMetric}</strong>
              </span>
            </div>

            <form className="partner-hq-period-form" onSubmit={loadLeaderboardPeriod}>
              <label className="partner-hq-field">
                <span>Period Type</span>
                <select
                  value={leaderboardPeriodType}
                  disabled={isLoadingLeaderboard}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    setLeaderboardPeriodType(nextType);
                    setLeaderboardPeriodKey(getDefaultPeriodKey(nextType));
                  }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </label>
              <label className="partner-hq-field">
                <span>{leaderboardPeriodType === "monthly" ? "Month" : "Quarter"}</span>
                <input
                  type={leaderboardPeriodType === "monthly" ? "month" : "text"}
                  value={leaderboardPeriodKey}
                  disabled={isLoadingLeaderboard}
                  placeholder={leaderboardPeriodType === "monthly" ? "2026-07" : "2026-Q3"}
                  onChange={(event) => setLeaderboardPeriodKey(event.target.value.toUpperCase())}
                />
              </label>
              <button type="submit" className="primary-btn" disabled={isLoadingLeaderboard}>
                {isLoadingLeaderboard ? "Loading..." : "Load Rankings"}
              </button>
            </form>

            <section className="partner-hq-leaderboard-summary">
              <StatCard
                label="Period"
                value={leaderboardPeriod?.periodKey || leaderboardPeriodKey}
                detail={leaderboardPeriodType === "monthly" ? "Monthly ranking" : "Quarterly ranking"}
              />
              <StatCard
                label="Qualified Partners"
                value={leaderboardEntries.filter((entry) => entry.eligible).length}
                detail={`${leaderboardPeriod?.minimumReferrals || 0} earned referral minimum`}
              />
              <StatCard
                label="Winner Status"
                value={leaderboardReward ? leaderboardReward.status.toUpperCase() : "NOT RECORDED"}
                detail={leaderboardReward ? leaderboardReward.partnerCode : "Review and record after period closes"}
              />
            </section>

            {leaderboardEntries.length === 0 ? (
              <EmptyState
                title="No Earned Referrals"
                text="No partners have earned referrals during this leaderboard period."
              />
            ) : (
              <div className="partner-hq-leaderboard-table-wrap">
                <table className="partner-hq-leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Partner</th>
                      <th>Earned Referrals</th>
                      <th>Revenue</th>
                      <th>Commission</th>
                      <th>Score</th>
                      <th>Qualified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardEntries.map((entry) => (
                      <tr key={`${entry.accountId}-${entry.rank}`}>
                        <td><strong>#{entry.rank}</strong></td>
                        <td>
                          <strong>{entry.partnerCode}</strong>
                          <small>
                            {`${entry.partnerFirstName || ""} ${entry.partnerLastName || ""}`.trim() || entry.partnerEmail || "Partner"}
                          </small>
                        </td>
                        <td>{entry.referralCount}</td>
                        <td>{formatMoneyFromCents(entry.revenueCents)}</td>
                        <td>{formatMoneyFromCents(entry.commissionCents)}</td>
                        <td><strong>{formatLeaderboardScore(entry, leaderboardSettings.leaderboardMetric)}</strong></td>
                        <td>{entry.eligible ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {leaderboardReward ? (
              <article className="partner-hq-current-reward-card">
                <div>
                  <p className="eyebrow">RECORDED WINNER</p>
                  <h3>{leaderboardReward.partnerCode}</h3>
                  <p>
                    {rewardTypeLabel(leaderboardReward.rewardType)} Â· {formatRewardValue(leaderboardReward)}
                  </p>
                </div>
                <StatusPill status={leaderboardReward.status} />
              </article>
            ) : (
              <section className="partner-hq-award-panel">
                <div>
                  <strong>Record The Period Winner</strong>
                  <p>
                    The registry selects the highest-ranked eligible partner and prevents a second winner from being recorded for the same period.
                  </p>
                </div>
                <div className="partner-hq-form-grid">
                  <label className="partner-hq-field">
                    <span>Partner Note â€” Optional</span>
                    <textarea
                      rows="3"
                      maxLength="1000"
                      value={awardPartnerNote}
                      disabled={isAwardingReward}
                      placeholder="Visible to the winning partner."
                      onChange={(event) => setAwardPartnerNote(event.target.value)}
                    />
                  </label>
                  <label className="partner-hq-field">
                    <span>Private Admin Notes â€” Optional</span>
                    <textarea
                      rows="3"
                      maxLength="2000"
                      value={awardAdminNotes}
                      disabled={isAwardingReward}
                      placeholder="Visible only in Partner HQ."
                      onChange={(event) => setAwardAdminNotes(event.target.value)}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={
                    isAwardingReward ||
                    !leaderboardEntries.some((entry) => entry.eligible)
                  }
                  onClick={awardLeaderboardWinner}
                >
                  {isAwardingReward ? "Recording Winner..." : "Record Leaderboard Winner"}
                </button>
              </section>
            )}
          </section>

          <section className="partner-hq-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">REWARD HISTORY</p>
                <h2>Leaderboard Winners And Delivery</h2>
              </div>
              <span><strong>{rewards.length}</strong> reward record(s)</span>
            </div>
            {rewards.length === 0 ? (
              <EmptyState
                title="No Rewards Recorded"
                text="Monthly and quarterly winner records will appear here."
              />
            ) : (
              <div className="partner-hq-stack">
                {rewards.map((reward) => (
                  <article key={reward.rewardId} className="partner-hq-reward-card">
                    <div className="partner-hq-card-title-row">
                      <div>
                        <p className="eyebrow">{reward.periodKey} Â· {reward.periodType}</p>
                        <h3>{reward.partnerCode}</h3>
                        <p className="partner-hq-muted">
                          {`${reward.partnerFirstName || ""} ${reward.partnerLastName || ""}`.trim() || reward.partnerEmail || "Partner"}
                        </p>
                      </div>
                      <StatusPill status={reward.status} />
                    </div>
                    <div className="partner-hq-referral-grid">
                      <QuickDetail label="Reward" value={`${rewardTypeLabel(reward.rewardType)} â€” ${formatRewardValue(reward)}`} />
                      <QuickDetail label="Rank" value={`#${reward.rank}`} />
                      <QuickDetail label="Earned Referrals" value={reward.referralCount} />
                      <QuickDetail label="Commission" value={formatMoneyFromCents(reward.commissionCents)} />
                      <QuickDetail label="Awarded" value={formatDate(reward.awardedAt)} />
                      <QuickDetail label="Issued" value={formatDate(reward.issuedAt)} />
                      <QuickDetail label="Delivery" value={reward.deliveryMethod || "Not issued"} />
                      <QuickDetail label="Reference" value={reward.referenceNumber || "Not supplied"} />
                    </div>
                    {reward.partnerNote && <DetailBlock title="Partner Note" text={reward.partnerNote} highlighted />}
                    {reward.adminNotes && <DetailBlock title="Private Admin Notes" text={reward.adminNotes} privateNote />}
                    {reward.status !== "issued" && (
                      <div className="partner-hq-button-row">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => openIssueRewardPanel(reward)}
                        >
                          Mark Reward Issued
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          {isEditingCampaign && (
            <form
              id="partner-campaign-editor"
              className="partner-hq-panel partner-hq-campaign-editor"
              onSubmit={saveCampaign}
            >
              <div className="partner-hq-section-heading">
                <div>
                  <p className="eyebrow">CAMPAIGN EDITOR</p>
                  <h2>{campaignForm.campaignId ? "Edit Marketing Campaign" : "Create Marketing Campaign"}</h2>
                  <p>
                    Save the campaign as a draft first. Publish it only after the copy,
                    links, dates, and research-use disclaimer are ready.
                  </p>
                </div>
                <button
                  type="button"
                  className="partner-hq-link-button"
                  disabled={isSavingCampaign}
                  onClick={closeCampaignEditor}
                >
                  Close
                </button>
              </div>

              <div className="partner-hq-campaign-form-grid">
                <label className="partner-hq-field">
                  <span>Campaign Slug</span>
                  <input
                    type="text"
                    maxLength="60"
                    value={campaignForm.slug}
                    disabled={isSavingCampaign}
                    placeholder="summer-research"
                    onChange={(event) =>
                      updateCampaignForm(
                        "slug",
                        event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                  />
                  <small>Used in tracked partner links. Lowercase letters, numbers, and single hyphens.</small>
                </label>
                <label className="partner-hq-field">
                  <span>Campaign Title</span>
                  <input
                    type="text"
                    maxLength="150"
                    value={campaignForm.title}
                    disabled={isSavingCampaign}
                    placeholder="Summer Research Spotlight"
                    onChange={(event) => updateCampaignForm("title", event.target.value)}
                  />
                </label>
                <label className="partner-hq-field partner-hq-campaign-wide">
                  <span>Summary</span>
                  <textarea
                    rows="3"
                    maxLength="500"
                    value={campaignForm.summary}
                    disabled={isSavingCampaign}
                    placeholder="Short internal and partner-facing summary of the campaign."
                    onChange={(event) => updateCampaignForm("summary", event.target.value)}
                  />
                </label>
                <label className="partner-hq-field partner-hq-campaign-wide">
                  <span>Headline</span>
                  <input
                    type="text"
                    maxLength="200"
                    value={campaignForm.headline}
                    disabled={isSavingCampaign}
                    placeholder="Explore the latest 304 Peptides research catalog"
                    onChange={(event) => updateCampaignForm("headline", event.target.value)}
                  />
                </label>

                <label className="partner-hq-field">
                  <span>Facebook Copy</span>
                  <textarea rows="7" maxLength="3000" value={campaignForm.facebookCopy} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("facebookCopy", event.target.value)} />
                </label>
                <label className="partner-hq-field">
                  <span>Instagram Copy</span>
                  <textarea rows="7" maxLength="3000" value={campaignForm.instagramCopy} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("instagramCopy", event.target.value)} />
                </label>
                <label className="partner-hq-field">
                  <span>TikTok Copy</span>
                  <textarea rows="7" maxLength="3000" value={campaignForm.tiktokCopy} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("tiktokCopy", event.target.value)} />
                </label>
                <label className="partner-hq-field">
                  <span>Text Message Copy</span>
                  <textarea rows="7" maxLength="500" value={campaignForm.smsCopy} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("smsCopy", event.target.value)} />
                </label>
                <label className="partner-hq-field">
                  <span>Email Subject</span>
                  <input type="text" maxLength="200" value={campaignForm.emailSubject} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("emailSubject", event.target.value)} />
                </label>
                <label className="partner-hq-field partner-hq-campaign-wide">
                  <span>Email Copy</span>
                  <textarea rows="8" maxLength="3000" value={campaignForm.emailCopy} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("emailCopy", event.target.value)} />
                </label>

                <label className="partner-hq-field">
                  <span>Campaign Image URL â€” Optional</span>
                  <input type="url" maxLength="1000" value={campaignForm.imageUrl} disabled={isSavingCampaign} placeholder="https://..." onChange={(event) => updateCampaignForm("imageUrl", event.target.value)} />
                </label>
                <label className="partner-hq-field">
                  <span>Downloadable Graphic URL â€” Optional</span>
                  <input type="url" maxLength="1000" value={campaignForm.downloadUrl} disabled={isSavingCampaign} placeholder="https://..." onChange={(event) => updateCampaignForm("downloadUrl", event.target.value)} />
                </label>
                <label className="partner-hq-field">
                  <span>Button Label</span>
                  <input type="text" maxLength="80" value={campaignForm.ctaLabel} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("ctaLabel", event.target.value)} />
                </label>
                <label className="partner-hq-field">
                  <span>Internal Destination Path</span>
                  <input type="text" maxLength="200" value={campaignForm.destinationPath} disabled={isSavingCampaign} placeholder="/checkout" onChange={(event) => updateCampaignForm("destinationPath", event.target.value)} />
                </label>
                <label className="partner-hq-field">
                  <span>Starts â€” Optional</span>
                  <input type="datetime-local" value={campaignForm.startsAt} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("startsAt", event.target.value)} />
                </label>
                <label className="partner-hq-field">
                  <span>Ends â€” Optional</span>
                  <input type="datetime-local" value={campaignForm.endsAt} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("endsAt", event.target.value)} />
                </label>
                <label className="partner-hq-field">
                  <span>Display Order</span>
                  <input type="number" min="-1000" max="1000" step="1" value={campaignForm.displayOrder} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("displayOrder", event.target.value)} />
                </label>
                <label className="partner-hq-field partner-hq-campaign-wide">
                  <span>Required Research-Use Disclaimer</span>
                  <textarea rows="4" maxLength="1000" value={campaignForm.disclaimer} disabled={isSavingCampaign} onChange={(event) => updateCampaignForm("disclaimer", event.target.value)} />
                </label>
              </div>

              <div className="partner-hq-button-row">
                <button type="submit" className="primary-btn" disabled={isSavingCampaign}>
                  {isSavingCampaign ? "Saving Campaign..." : "Save Campaign Draft"}
                </button>
                <button type="button" className="secondary-btn" disabled={isSavingCampaign} onClick={closeCampaignEditor}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <section className="partner-hq-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">PARTNER MARKETING CENTER</p>
                <h2>Campaigns And Approved Creative</h2>
                <p>
                  Publish copy and assets to approved partners. Every shared campaign link
                  keeps the partner code and campaign attribution attached to the order.
                </p>
              </div>
              <button type="button" className="primary-btn" onClick={startNewCampaign}>
                Create Campaign
              </button>
            </div>

            <section className="partner-hq-referral-stats">
              <StatCard label="Campaigns" value={campaigns.length} detail="All campaign records" />
              <StatCard label="Published" value={campaigns.filter((campaign) => campaign.status === "published").length} detail="Visible when active" />
              <StatCard label="Campaign Referrals" value={campaigns.reduce((total, campaign) => total + campaign.referralCount, 0)} detail="Attributed orders" />
              <StatCard label="Earned Revenue" value={formatMoneyFromCents(campaigns.reduce((total, campaign) => total + campaign.earnedRevenueCents, 0))} detail="Campaign-attributed earned revenue" />
            </section>

            <div className="partner-hq-filters">
              <label className="partner-hq-field">
                <span>Search Campaigns</span>
                <input type="search" value={campaignSearch} onChange={(event) => setCampaignSearch(event.target.value)} placeholder="Title, slug, headline, or copy" />
              </label>
              <label className="partner-hq-field">
                <span>Status</span>
                <select value={campaignStatus} onChange={(event) => setCampaignStatus(event.target.value)}>
                  {CAMPAIGN_FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            {filteredCampaigns.length === 0 ? (
              <EmptyState title="No Marketing Campaigns" text="Create a draft campaign, add approved copy and assets, then publish it to partners." />
            ) : (
              <div className="partner-hq-stack">
                {filteredCampaigns.map((campaign) => (
                  <article key={campaign.campaignId} className={`partner-hq-campaign-card partner-hq-campaign-${campaign.status}`}>
                    <div className="partner-hq-card-title-row">
                      <div>
                        <p className="eyebrow">{campaign.slug}</p>
                        <h3>{campaign.title}</h3>
                        <p className="partner-hq-muted">{campaign.headline || campaign.summary || "No campaign headline yet."}</p>
                      </div>
                      <span className={`partner-hq-status partner-hq-status-${campaign.status}`}>
                        {campaignStatusLabel(campaign)}
                      </span>
                    </div>

                    <div className="partner-hq-referral-grid">
                      <QuickDetail label="Attributed Orders" value={campaign.referralCount} />
                      <QuickDetail label="Earned Referrals" value={campaign.earnedReferralCount} />
                      <QuickDetail label="Earned Revenue" value={formatMoneyFromCents(campaign.earnedRevenueCents)} />
                      <QuickDetail label="Earned Commission" value={formatMoneyFromCents(campaign.earnedCommissionCents)} />
                      <QuickDetail label="Starts" value={formatDate(campaign.startsAt)} />
                      <QuickDetail label="Ends" value={formatDate(campaign.endsAt)} />
                      <QuickDetail label="Destination" value={campaign.destinationPath || "/checkout"} />
                      <QuickDetail label="Updated" value={formatDate(campaign.updatedAt)} />
                    </div>

                    {campaign.summary && <DetailBlock title="Campaign Summary" text={campaign.summary} />}
                    <div className="partner-hq-campaign-channel-grid">
                      {campaign.facebookCopy && <DetailBlock title="Facebook Copy" text={campaign.facebookCopy} />}
                      {campaign.instagramCopy && <DetailBlock title="Instagram Copy" text={campaign.instagramCopy} />}
                      {campaign.tiktokCopy && <DetailBlock title="TikTok Copy" text={campaign.tiktokCopy} />}
                      {campaign.smsCopy && <DetailBlock title="Text Message Copy" text={campaign.smsCopy} />}
                      {campaign.emailCopy && <DetailBlock title={`Email Copy${campaign.emailSubject ? ` â€” ${campaign.emailSubject}` : ""}`} text={campaign.emailCopy} />}
                    </div>
                    {campaign.disclaimer && <DetailBlock title="Required Disclaimer" text={campaign.disclaimer} highlighted />}

                    <div className="partner-hq-campaign-links">
                      {campaign.imageUrl && <a href={campaign.imageUrl} target="_blank" rel="noreferrer">Open Campaign Image</a>}
                      {campaign.downloadUrl && <a href={campaign.downloadUrl} target="_blank" rel="noreferrer">Open Downloadable Asset</a>}
                    </div>

                    <div className="partner-hq-button-row">
                      <button type="button" className="secondary-btn" onClick={() => editCampaign(campaign)}>
                        Edit Campaign
                      </button>
                      {campaign.status !== "published" && (
                        <button type="button" className="primary-btn" disabled={campaignStatusSavingId === campaign.campaignId} onClick={() => changeCampaignStatus(campaign, "published")}>
                          {campaignStatusSavingId === campaign.campaignId ? "Saving..." : "Publish"}
                        </button>
                      )}
                      {campaign.status === "published" && (
                        <button type="button" className="secondary-btn" disabled={campaignStatusSavingId === campaign.campaignId} onClick={() => changeCampaignStatus(campaign, "draft")}>
                          Return To Draft
                        </button>
                      )}
                      {campaign.status !== "archived" && (
                        <button type="button" className="partner-hq-danger-button" disabled={campaignStatusSavingId === campaign.campaignId} onClick={() => changeCampaignStatus(campaign, "archived")}>
                          Archive
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="partner-hq-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">APPLICATION DIRECTORY</p>
                <h2>Partner Records</h2>
              </div>
              <span>
                Showing <strong>{filteredApplications.length}</strong> of{" "}
                <strong>{applications.length}</strong>
              </span>
            </div>
            <div className="partner-hq-filters">
              <label className="partner-hq-field">
                <span>Search Applications</span>
                <input
                  type="search"
                  value={applicationSearch}
                  onChange={(event) => setApplicationSearch(event.target.value)}
                  placeholder="Name, email, code, platform, or notes"
                />
              </label>
              <label className="partner-hq-field">
                <span>Status</span>
                <select
                  value={applicationStatus}
                  onChange={(event) => setApplicationStatus(event.target.value)}
                >
                  {APPLICATION_FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            {isLoading ? (
              <EmptyState title="Loading Applications" text="Retrieving protected Partner Program records." />
            ) : filteredApplications.length === 0 ? (
              <EmptyState title="No Matching Applications" text="No applications match the current filters." />
            ) : (
              <div className="partner-hq-stack">
                {filteredApplications.map((application) => {
                  const expanded = expandedAccountId === application.accountId;
                  return (
                    <article
                      key={application.accountId}
                      className={`partner-hq-card partner-hq-card-${application.status}`}
                    >
                      <div className="partner-hq-card-summary">
                        <div className="partner-hq-card-main">
                          <div className="partner-hq-card-title-row">
                            <div>
                              <p className="eyebrow">{application.code}</p>
                              <h3>
                                {`${application.firstName || ""} ${application.lastName || ""}`.trim() || "Name unavailable"}
                              </h3>
                              <p className="partner-hq-muted">{application.email}</p>
                            </div>
                            <StatusPill status={application.status} />
                          </div>
                          <div className="partner-hq-detail-grid">
                            <QuickDetail label="Platform" value={application.primaryPlatform || "Unavailable"} />
                            <QuickDetail label="Audience" value={application.audienceSize || "Unavailable"} />
                            <QuickDetail label="Commission Rate" value={formatPercentFromBasisPoints(application.commissionRateBps)} />
                            <QuickDetail label="Submitted" value={formatDate(application.submittedAt)} />
                          </div>
                        </div>
                        <div className="partner-hq-card-buttons">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => setExpandedAccountId(expanded ? "" : application.accountId)}
                          >
                            {expanded ? "Hide Details" : "View Details"}
                          </button>
                          {application.status === "pending" && (
                            <>
                              <button type="button" className="primary-btn" onClick={() => openActionPanel(application, "approve")}>Approve</button>
                              <button type="button" className="partner-hq-danger-button" onClick={() => openActionPanel(application, "deny")}>Deny</button>
                            </>
                          )}
                          {application.status === "approved" && (
                            <button type="button" className="partner-hq-danger-button" onClick={() => openActionPanel(application, "suspend")}>Suspend</button>
                          )}
                          {application.status === "suspended" && (
                            <button type="button" className="primary-btn" onClick={() => openActionPanel(application, "reactivate")}>Reactivate</button>
                          )}
                        </div>
                      </div>
                      {expanded && (
                        <div className="partner-hq-card-details">
                          <DetailBlock title="Promotion Plan" text={application.promotionPlan || "Not supplied."} />
                          <DetailBlock title="Relevant Experience" text={application.experience || "Not supplied."} />
                          <div className="partner-hq-detail-grid">
                            <QuickDetail label="Profile URL" value={application.profileUrl || "Not supplied"} />
                            <QuickDetail label="Agreement Accepted" value={formatDate(application.agreementAcceptedAt)} />
                            <QuickDetail label="Reviewed" value={formatDate(application.reviewedAt)} />
                            <QuickDetail label="Reviewed By" value={application.reviewedBy || "Not reviewed"} />
                          </div>
                          {["approved", "suspended"].includes(application.status) && (
                            <section className="partner-hq-rate-panel">
                              <div>
                                <strong>Commission Rate For Future Referrals</strong>
                                <p>Existing referrals keep the rate captured when the order was submitted.</p>
                              </div>
                              <label>
                                <span>Percent</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  step="0.01"
                                  value={rateDrafts[application.accountId] ?? ""}
                                  disabled={rateSavingId === application.accountId}
                                  onChange={(event) =>
                                    setRateDrafts((current) => ({
                                      ...current,
                                      [application.accountId]: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                className="primary-btn"
                                disabled={rateSavingId === application.accountId}
                                onClick={() => saveCommissionRate(application)}
                              >
                                {rateSavingId === application.accountId ? "Saving..." : "Save Rate"}
                              </button>
                            </section>
                          )}
                          {application.customerMessage && <DetailBlock title="Customer Message" text={application.customerMessage} highlighted />}
                          {application.adminNotes && <DetailBlock title="Private Admin Notes" text={application.adminNotes} privateNote />}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="partner-hq-panel partner-hq-risk-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">FRAUD & ABUSE REVIEW</p>
                <h2>Partner Risk Review Queue</h2>
                <p className="partner-hq-muted">
                  Automated signals identify patterns that may need human review.
                  A flag does not prove abuse, cancel commission, or place a payout
                  hold automatically. Approved own-code tier orders are treated
                  separately and are not considered self-referral abuse.
                </p>
              </div>

              <button
                type="button"
                className="secondary-btn"
                disabled={Boolean(riskSavingId)}
                onClick={() => {
                  const enteredOrderId = window.prompt(
                    "Enter the referral order number to open a manual review."
                  );

                  if (enteredOrderId == null) {
                    return;
                  }

                  const orderId = enteredOrderId
                    .trim()
                    .toUpperCase();

                  const referral =
                    referralByOrderId.get(orderId);

                  if (!referral) {
                    setActionError(
                      "That referral order could not be found."
                    );
                    return;
                  }

                  createManualRiskFlag(referral);
                }}
              >
                Open Manual Review
              </button>
            </div>

            <section className="partner-hq-risk-stats">
              <StatCard
                label="New Flags"
                value={riskStatusCounts.new}
                detail="Awaiting initial review"
              />
              <StatCard
                label="Reviewing"
                value={riskStatusCounts.reviewing}
                detail="Currently being investigated"
              />
              <StatCard
                label="Commission Held"
                value={formatMoneyFromCents(
                  heldReferralStats.amountCents
                )}
                detail={`${heldReferralStats.count} referral(s)`}
              />
              <StatCard
                label="Confirmed Abuse"
                value={riskStatusCounts.confirmedAbuse}
                detail="Administrator-confirmed cases"
              />
            </section>

            <div className="partner-hq-filters">
              <label className="partner-hq-field">
                <span>Search Reviews</span>
                <input
                  type="search"
                  value={riskSearch}
                  onChange={(event) =>
                    setRiskSearch(event.target.value)
                  }
                  placeholder="Order, code, customer, type, title, or notes"
                />
              </label>

              <label className="partner-hq-field">
                <span>Review Status</span>
                <select
                  value={riskStatus}
                  onChange={(event) =>
                    setRiskStatus(event.target.value)
                  }
                >
                  {RISK_FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {isLoading ? (
              <EmptyState
                title="Loading Review Queue"
                text="Retrieving protected risk-review records."
              />
            ) : filteredRiskFlags.length === 0 ? (
              <EmptyState
                title="No Matching Review Flags"
                text="No risk flags match the selected filters. Automated signals and manual reviews will appear here."
              />
            ) : (
              <div className="partner-hq-stack">
                {filteredRiskFlags.map((flag) => {
                  const referral =
                    referralByOrderId.get(flag.orderId);

                  const draft =
                    riskDrafts[flag.flagId] || {
                      status: flag.status,
                      severity: flag.severity,
                      privateNotes:
                        flag.privateNotes || "",
                      note: "",
                    };

                  const expanded =
                    expandedRiskFlagId === flag.flagId;

                  const canControlHold =
                    referral &&
                    !referral.isSelfUse &&
                    !referral.payoutId &&
                    referral.referralStatus === "earned";

                  return (
                    <article
                      key={flag.flagId}
                      className={`partner-hq-risk-card partner-hq-risk-card-${flag.severity}`}
                    >
                      <div className="partner-hq-card-title-row">
                        <div>
                          <p className="eyebrow">
                            {flag.partnerCode ||
                              "PARTNER REVIEW"}
                          </p>
                          <h3>{flag.title}</h3>
                          <p className="partner-hq-muted">
                            {flag.orderId
                              ? `Order #${flag.orderId}`
                              : flag.flagId}
                          </p>
                        </div>

                        <div className="partner-hq-risk-badges">
                          <RiskSeverityPill
                            severity={flag.severity}
                          />
                          <RiskStatusPill
                            status={flag.status}
                          />
                        </div>
                      </div>

                      <div className="partner-hq-referral-grid">
                        <QuickDetail
                          label="Signal Type"
                          value={formatRiskLabel(
                            flag.flagType
                          )}
                        />
                        <QuickDetail
                          label="Source"
                          value={formatRiskLabel(
                            flag.source
                          )}
                        />
                        <QuickDetail
                          label="Customer"
                          value={
                            flag.customerEmail ||
                            flag.customerAccountId ||
                            "Unavailable"
                          }
                        />
                        <QuickDetail
                          label="Created"
                          value={formatDate(flag.createdAt)}
                        />
                        <QuickDetail
                          label="Updated"
                          value={formatDate(flag.updatedAt)}
                        />
                        <QuickDetail
                          label="Created By"
                          value={
                            flag.createdBy ||
                            "Unavailable"
                          }
                        />
                        <QuickDetail
                          label="Payout Hold"
                          value={
                            referral?.payoutHold
                              ? "ACTIVE"
                              : "Not active"
                          }
                        />
                        <QuickDetail
                          label="Commission"
                          value={
                            referral
                              ? formatMoneyFromCents(
                                  referral.commissionAmountCents
                                )
                              : "Unavailable"
                          }
                        />
                      </div>

                      <DetailBlock
                        title="Review Signal"
                        text={
                          flag.summary ||
                          "No summary was supplied."
                        }
                        highlighted
                      />

                      {referral?.payoutHold && (
                        <div className="partner-hq-hold-notice">
                          <strong>
                            Commission payout hold is active.
                          </strong>
                          <span>
                            {referral.payoutHoldReason ||
                              "A private hold reason is recorded."}
                          </span>
                          <small>
                            Applied by{" "}
                            {referral.payoutHoldBy ||
                              "an administrator"}{" "}
                            {referral.payoutHoldAt
                              ? `on ${formatDate(
                                  referral.payoutHoldAt
                                )}`
                              : ""}
                          </small>
                        </div>
                      )}

                      <div className="partner-hq-button-row">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            setExpandedRiskFlagId(
                              expanded ? "" : flag.flagId
                            )
                          }
                        >
                          {expanded
                            ? "Hide Review Details"
                            : "Review Flag"}
                        </button>

                        {canControlHold && (
                          <button
                            type="button"
                            className={
                              referral.payoutHold
                                ? "secondary-btn"
                                : "partner-hq-danger-button"
                            }
                            disabled={
                              holdSavingOrderId ===
                              referral.orderId
                            }
                            onClick={() =>
                              toggleReferralPayoutHold(
                                referral,
                                flag.flagId
                              )
                            }
                          >
                            {holdSavingOrderId ===
                            referral.orderId
                              ? "Saving..."
                              : referral.payoutHold
                              ? "Clear Payout Hold"
                              : "Place Payout Hold"}
                          </button>
                        )}
                      </div>

                      {expanded && (
                        <div className="partner-hq-risk-review-details">
                          <div className="partner-hq-risk-controls">
                            <label className="partner-hq-field">
                              <span>Status</span>
                              <select
                                value={draft.status}
                                onChange={(event) =>
                                  setRiskDraftField(
                                    flag.flagId,
                                    "status",
                                    event.target.value
                                  )
                                }
                              >
                                {RISK_FILTERS.filter(
                                  ([value]) =>
                                    value !== "all"
                                ).map(([value, label]) => (
                                  <option
                                    key={value}
                                    value={value}
                                  >
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="partner-hq-field">
                              <span>Severity</span>
                              <select
                                value={draft.severity}
                                onChange={(event) =>
                                  setRiskDraftField(
                                    flag.flagId,
                                    "severity",
                                    event.target.value
                                  )
                                }
                              >
                                {RISK_SEVERITIES.map(
                                  ([value, label]) => (
                                    <option
                                      key={value}
                                      value={value}
                                    >
                                      {label}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>
                          </div>

                          <label className="partner-hq-field">
                            <span>Private Investigation Notes</span>
                            <textarea
                              rows="5"
                              value={draft.privateNotes}
                              onChange={(event) =>
                                setRiskDraftField(
                                  flag.flagId,
                                  "privateNotes",
                                  event.target.value
                                )
                              }
                              placeholder="Document evidence, contacts, reasoning, and follow-up items. These notes are administrator-only."
                            />
                          </label>

                          <label className="partner-hq-field">
                            <span>History Note For This Update</span>
                            <textarea
                              rows="3"
                              value={draft.note}
                              onChange={(event) =>
                                setRiskDraftField(
                                  flag.flagId,
                                  "note",
                                  event.target.value
                                )
                              }
                              placeholder="Optional note explaining this status or severity change."
                            />
                          </label>

                          <div className="partner-hq-button-row">
                            <button
                              type="button"
                              className="primary-btn"
                              disabled={
                                riskSavingId === flag.flagId
                              }
                              onClick={() =>
                                saveRiskFlag(flag)
                              }
                            >
                              {riskSavingId === flag.flagId
                                ? "Saving..."
                                : "Save Review"}
                            </button>
                          </div>

                          <section className="partner-hq-risk-history">
                            <strong>Permanent Review History</strong>

                            {flag.history.length === 0 ? (
                              <p className="partner-hq-muted">
                                No history entries are available.
                              </p>
                            ) : (
                              <div>
                                {flag.history.map((entry) => (
                                  <article
                                    key={entry.historyId}
                                  >
                                    <strong>
                                      {formatRiskLabel(
                                        entry.action
                                      )}
                                    </strong>
                                    <span>
                                      {entry.previousStatus &&
                                      entry.nextStatus
                                        ? `${formatRiskLabel(
                                            entry.previousStatus
                                          )} → ${formatRiskLabel(
                                            entry.nextStatus
                                          )}`
                                        : formatRiskLabel(
                                            entry.nextStatus
                                          )}
                                    </span>
                                    {entry.note && (
                                      <p>{entry.note}</p>
                                    )}
                                    <small>
                                      {formatDate(
                                        entry.createdAt
                                      )}{" "}
                                      ·{" "}
                                      {entry.createdBy ||
                                        "Unavailable"}
                                    </small>
                                  </article>
                                ))}
                              </div>
                            )}
                          </section>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          <section className="partner-hq-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">REFERRAL LEDGER</p>
                <h2>Attributed Orders And Commissions</h2>
              </div>
              <span>
                Showing <strong>{filteredReferrals.length}</strong> of{" "}
                <strong>{referrals.length}</strong>
              </span>
            </div>
            <section className="partner-hq-referral-stats">
              <StatCard label="Pending Commission" value={formatMoneyFromCents(referralStats.pendingCommissionCents)} detail={`${referralStats.pending} awaiting payment`} />
              <StatCard label="Available To Pay" value={formatMoneyFromCents(referralStats.availableCommissionCents)} detail={`${referralStats.availableCount} unpaid earned`} />              <StatCard
                label="Held For Review"
                value={formatMoneyFromCents(
                  heldReferralStats.amountCents
                )}
                detail={`${heldReferralStats.count} referral(s) excluded from payout`}
              />
              <StatCard label="Paid Commission" value={formatMoneyFromCents(referralStats.paidCommissionCents)} detail={`${referralStats.paidCount} paid referral(s)`} />
              <StatCard
                label="Tier Progress Orders"
                value={referralStats.tierProgressCount}
                detail={`${referralStats.selfUseTierCount} own-code order(s)`}
              />

              <StatCard label="Adjustments" value={referralStats.adjustmentCount} detail="Paid referrals later voided" />
            </section>
            <div className="partner-hq-filters">
              <label className="partner-hq-field">
                <span>Search Referrals</span>
                <input
                  type="search"
                  value={referralSearch}
                  onChange={(event) => setReferralSearch(event.target.value)}
                  placeholder="Order, partner code, partner, customer, or payout"
                />
              </label>
              <label className="partner-hq-field">
                <span>Commission Status</span>
                <select value={referralStatus} onChange={(event) => setReferralStatus(event.target.value)}>
                  {REFERRAL_FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            {isLoading ? (
              <EmptyState title="Loading Referral Ledger" text="Retrieving protected referral records." />
            ) : filteredReferrals.length === 0 ? (
              <EmptyState title="No Matching Referrals" text="Referrals appear after a customer submits an order with an active partner code." />
            ) : (
              <div className="partner-hq-stack">
                {filteredReferrals.map((referral) => (
                  <article
                    key={referral.orderId}
                    className={`partner-hq-referral-card partner-hq-referral-${referral.commissionStatus}`}
                  >
                    <div className="partner-hq-card-title-row">
                      <div>
                        <p className="eyebrow">{referral.partnerCode}</p>
                        <h3>Order #{referral.orderId}</h3>
                        <p className="partner-hq-muted">
                          {`${referral.partnerFirstName || ""} ${referral.partnerLastName || ""}`.trim() || referral.partnerEmail || "Partner unavailable"}
                        </p>
                      </div>
                      <ReferralStatusPill status={referral.commissionStatus} />
                    </div>
                    {referral.requiresAdjustment && (
                      <div className="partner-hq-adjustment-notice">
                        This referral was already paid but the order is now voided. Review it manually before the next payout.
                      </div>
                    )}
                    {referral.isSelfUse && (
                      <div className="partner-hq-adjustment-notice">
                        Own-code order: counts toward tier progression only. It earns
                        no commission, payout, leaderboard, or reward credit.
                      </div>
                    )}
                    {referral.payoutHold && (
                      <div className="partner-hq-hold-notice">
                        <strong>
                          Commission is excluded from payouts while this review hold is active.
                        </strong>
                        <span>
                          {referral.payoutHoldReason ||
                            "A private administrator reason is recorded."}
                        </span>
                      </div>
                    )}

                    <div className="partner-hq-button-row">
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={
                          Boolean(riskSavingId) ||
                          riskFlags.some(
                            (flag) =>
                              flag.orderId ===
                                referral.orderId &&
                              ["new", "reviewing"].includes(
                                flag.status
                              )
                          )
                        }
                        onClick={() =>
                          createManualRiskFlag(referral)
                        }
                      >
                        {riskFlags.some(
                          (flag) =>
                            flag.orderId ===
                              referral.orderId &&
                            ["new", "reviewing"].includes(
                              flag.status
                            )
                        )
                          ? "Review Open"
                          : "Open Manual Review"}
                      </button>

                      {!referral.isSelfUse &&
                        !referral.payoutId &&
                        referral.referralStatus ===
                          "earned" && (
                          <button
                            type="button"
                            className={
                              referral.payoutHold
                                ? "secondary-btn"
                                : "partner-hq-danger-button"
                            }
                            disabled={
                              holdSavingOrderId ===
                              referral.orderId
                            }
                            onClick={() =>
                              toggleReferralPayoutHold(
                                referral
                              )
                            }
                          >
                            {holdSavingOrderId ===
                            referral.orderId
                              ? "Saving..."
                              : referral.payoutHold
                              ? "Clear Payout Hold"
                              : "Place Payout Hold"}
                          </button>
                        )}
                    </div>
                    <div className="partner-hq-referral-grid">
                      <QuickDetail label="Customer" value={referral.customerEmail || "Unavailable"} />
                      <QuickDetail
                        label="Credit Type"
                        value={
                          referral.isSelfUse
                            ? "Tier progression only"
                            : "Commission referral"
                        }
                      />

                      <QuickDetail label="Order Subtotal" value={formatMoneyFromCents(referral.orderSubtotalCents)} />
                      <QuickDetail label="Captured Rate" value={formatPercentFromBasisPoints(referral.commissionRateBps)} />
                      <QuickDetail label="Commission" value={formatMoneyFromCents(referral.commissionAmountCents)} />
                      <QuickDetail label="Order Status" value={referral.orderStatus || "Unavailable"} />
                      <QuickDetail label="Referral Created" value={formatDate(referral.createdAt)} />
                      <QuickDetail label="Payout" value={referral.payoutId || "Not paid"} />
                      <QuickDetail label="Paid Date" value={formatDate(referral.payoutPaidAt)} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="partner-hq-panel">
            <div className="partner-hq-section-heading">
              <div>
                <p className="eyebrow">PAYOUT LEDGER</p>
                <h2>Recorded Partner Payouts</h2>
              </div>
              <span>
                <strong>{payouts.length}</strong> payout batch(es)
              </span>
            </div>
            <label className="partner-hq-field partner-hq-payout-search">
              <span>Search Payouts</span>
              <input
                type="search"
                value={payoutSearch}
                onChange={(event) => setPayoutSearch(event.target.value)}
                placeholder="Payout ID, partner, method, reference, or order"
              />
            </label>
            {filteredPayouts.length === 0 ? (
              <EmptyState title="No Payouts Recorded" text="Completed cash and store-credit payouts will appear here." />
            ) : (
              <div className="partner-hq-stack">
                {filteredPayouts.map((payout) => (
                  <article key={payout.payoutId} className="partner-hq-payout-history-card">
                    <div className="partner-hq-card-title-row">
                      <div>
                        <p className="eyebrow">{payout.partnerCode}</p>
                        <h3>{formatMoneyFromCents(payout.amountCents)}</h3>
                        <p className="partner-hq-muted">{payout.payoutId}</p>
                      </div>
                      <span className="partner-hq-status partner-hq-status-paid">
                        {payout.payoutType === "store_credit" ? "STORE CREDIT" : "CASH"}
                      </span>
                    </div>
                    <div className="partner-hq-referral-grid">
                      <QuickDetail label="Partner" value={`${payout.partnerFirstName || ""} ${payout.partnerLastName || ""}`.trim() || payout.partnerEmail || payout.partnerCode} />
                      <QuickDetail label="Paid" value={formatDate(payout.paidAt)} />
                      <QuickDetail label="Method" value={payout.paymentMethod || "Unavailable"} />
                      <QuickDetail label="Reference" value={payout.referenceNumber || "Not supplied"} />
                      <QuickDetail label="Referrals" value={payout.referralCount} />
                      <QuickDetail label="Orders" value={(payout.orderIds || []).join(", ") || "Unavailable"} />
                      <QuickDetail label="Recorded By" value={payout.createdBy || "Unavailable"} />
                      <QuickDetail label="Recorded" value={formatDate(payout.createdAt)} />
                    </div>
                    {payout.partnerNote && <DetailBlock title="Partner Note" text={payout.partnerNote} highlighted />}
                    {payout.adminNotes && <DetailBlock title="Private Admin Notes" text={payout.adminNotes} privateNote />}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="partner-hq-panel partner-hq-security-note">
            <p className="eyebrow">PROGRAM SECURITY</p>
            <h2>Financial Records And Campaign Attribution Are Protected</h2>
            <p>
              Each referral can enter only one payout, each leaderboard period can have one
              recorded winner, and archived campaign records remain available for historical
              attribution without being shown as active partner creative.
            </p>
          </section>
        </section>
      </main>
    </>
  );
}

function Notice({ type, children }) {
  return <div className={`partner-hq-notice partner-hq-notice-${type}`} role={type === "error" ? "alert" : undefined}>{children}</div>;
}

function StatCard({ label, value, detail }) {
  return <div className="partner-hq-stat-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function StatusPill({ status }) {
  return <span className={`partner-hq-status partner-hq-status-${status}`}>{String(status || "pending").toUpperCase()}</span>;
}

function AnalyticsTable({ eyebrow, title, rows, columns, emptyText }) {
  return (
    <section className="partner-hq-analytics-table-card">
      <div className="partner-hq-analytics-table-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span>{rows.length} row(s)</span>
      </div>

      {rows.length === 0 ? (
        <div className="partner-hq-analytics-empty">{emptyText}</div>
      ) : (
        <div className="partner-hq-analytics-table-wrap">
          <table className="partner-hq-analytics-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.label}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${row.partnerCode || row.campaignSlug || row.channel || row.day || rowIndex}`}>
                  {columns.map((column) => (
                    <td key={column.label}>{column.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatRiskLabel(value) {
  return String(value || "Unavailable")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function RiskStatusPill({ status }) {
  return (
    <span
      className={`partner-hq-status partner-hq-risk-status-${status}`}
    >
      {formatRiskLabel(status)}
    </span>
  );
}

function RiskSeverityPill({ severity }) {
  return (
    <span
      className={`partner-hq-status partner-hq-risk-severity-${severity}`}
    >
      {formatRiskLabel(severity)}
    </span>
  );
}
function ReferralStatusPill({ status }) {
  return <span className={`partner-hq-status partner-hq-referral-status-${status}`}>{String(status || "pending").toUpperCase()}</span>;
}

function QuickDetail({ label, value }) {
  return <div className="partner-hq-quick-detail"><span>{label}</span><strong>{value || "Unavailable"}</strong></div>;
}

function DetailBlock({ title, text, highlighted = false, privateNote = false }) {
  const classes = [
    "partner-hq-detail-block",
    highlighted ? "partner-hq-detail-highlighted" : "",
    privateNote ? "partner-hq-detail-private" : "",
  ].filter(Boolean).join(" ");
  return <section className={classes}><strong>{title}</strong><p>{text}</p></section>;
}

function EmptyState({ title, text }) {
  return <div className="partner-hq-empty"><h3>{title}</h3><p>{text}</p></div>;
}

function getActionTitle(action) {
  return ({ approve: "Approve Partner Application", deny: "Deny Partner Application", suspend: "Suspend Partner Access", reactivate: "Reactivate Partner Access" }[action] || "Update Partner Record");
}

function getActionButtonLabel(action) {
  return ({ approve: "Approve Application", deny: "Deny Application", suspend: "Suspend Partner", reactivate: "Reactivate Partner" }[action] || "Save Action");
}

function getCustomerMessagePlaceholder(action) {
  if (action === "deny") return "Explain why the application was not approved and what may be changed before reapplying.";
  if (action === "suspend") return "Explain why Partner Program access was suspended and how the partner may contact support.";
  return action === "approve" ? "Optional welcome or approval message shown to the partner." : "Optional reactivation message shown to the partner.";
}

function getConfirmationText(action, application) {
  const code = application.code || "this code";
  if (action === "approve") return `Approve ${code}? The customer-selected code will become active.`;
  if (action === "deny") return `Deny ${code}? The code reservation will be released and may be claimed again.`;
  if (action === "suspend") return `Suspend ${code}? The code will become inactive but remain reserved to this account.`;
  return `Reactivate ${code}? The existing code will become active again.`;
}

const partnerHqCss = `
.partner-hq-page,
.partner-hq-page *,
.partner-hq-page *::before,
.partner-hq-page *::after { box-sizing: border-box; }
.partner-hq-page { width: 100%; padding: 72px 28px; }
.partner-hq-inner { width: 100%; max-width: 1280px; margin: 0 auto; }
.partner-hq-login-card,
.partner-hq-hero,
.partner-hq-panel {
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 24px;
  background: radial-gradient(circle at top left, rgba(61,165,255,.12), transparent 38%), rgba(255,255,255,.04);
  box-shadow: 0 24px 65px rgba(0,0,0,.35);
}
.partner-hq-login-card { width: 100%; max-width: 680px; margin: 0 auto; padding: 42px; text-align: center; }
.partner-hq-login-card h1,
.partner-hq-hero h1 { margin: 8px 0 16px; font-size: clamp(38px,7vw,62px); line-height: 1.03; }
.partner-hq-login-card > p:not(.eyebrow),
.partner-hq-hero p,
.partner-hq-security-note p,
.partner-hq-settings-panel p { color: #b6c0c8; line-height: 1.7; }
.partner-hq-topbar,
.partner-hq-topbar-actions,
.partner-hq-hero,
.partner-hq-section-heading,
.partner-hq-card-summary,
.partner-hq-card-title-row,
.partner-hq-button-row,
.partner-hq-select-all-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.partner-hq-topbar { margin-bottom: 20px; }
.partner-hq-topbar-actions { justify-content: flex-end; }
.partner-hq-hero { padding: 40px; margin-bottom: 20px; }
.partner-hq-hero > div { max-width: 780px; }
.partner-hq-panel { padding: 28px; margin-top: 20px; }
.partner-hq-section-heading h2,
.partner-hq-panel h2 { margin: 6px 0 8px; font-size: clamp(28px,4vw,38px); }
.partner-hq-source-pill,
.partner-hq-status { display: inline-flex; align-items: center; justify-content: center; padding: 8px 12px; border-radius: 999px; font-size: 11px; font-weight: 900; letter-spacing: .7px; text-transform: uppercase; }
.partner-hq-source-pill { border: 1px solid rgba(72,214,151,.3); background: rgba(72,214,151,.09); color: #b8f3d8; }
.partner-hq-link-button { padding: 8px 0; border: 0; background: transparent; color: #9ca8b0; cursor: pointer; font: inherit; font-size: 12px; text-decoration: underline; }
.partner-hq-full-button { width: 100%; margin-top: 16px; }
.partner-hq-stats,
.partner-hq-referral-stats,
.partner-hq-payout-summary { display: grid; gap: 12px; }
.partner-hq-stats { grid-template-columns: repeat(5,minmax(0,1fr)); margin-bottom: 20px; }
.partner-hq-referral-stats { grid-template-columns: repeat(4,minmax(0,1fr)); margin-top: 18px; }
.partner-hq-payout-summary { grid-template-columns: repeat(3,minmax(0,1fr)); margin: 20px 0; }
.partner-hq-stat-card,
.partner-hq-quick-detail { min-width: 0; display: grid; gap: 6px; padding: 16px; border: 1px solid rgba(255,255,255,.09); border-radius: 14px; background: rgba(255,255,255,.035); }
.partner-hq-stat-card span,
.partner-hq-quick-detail span,
.partner-hq-field > span,
.partner-hq-rate-panel label span { color: #9ed8ff; font-size: 11px; font-weight: 900; letter-spacing: .7px; text-transform: uppercase; }
.partner-hq-stat-card strong { font-size: 27px; overflow-wrap: anywhere; }
.partner-hq-stat-card small,
.partner-hq-field small,
.partner-hq-settings-panel small { color: #8f9aa2; }
.partner-hq-quick-detail strong { overflow-wrap: anywhere; font-size: 14px; }
.partner-hq-filters,
.partner-hq-form-grid,
.partner-hq-payout-form-grid { display: grid; grid-template-columns: minmax(0,1.6fr) minmax(220px,.7fr); gap: 14px; margin-top: 20px; }
.partner-hq-form-grid,
.partner-hq-payout-form-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
.partner-hq-field { display: grid; gap: 8px; margin-top: 16px; text-align: left; }
.partner-hq-field input,
.partner-hq-field select,
.partner-hq-field textarea,
.partner-hq-rate-panel input { width: 100%; padding: 14px; border: 1px solid rgba(255,255,255,.14); border-radius: 12px; outline: none; background: #151b22; color: #fff; font: inherit; }
.partner-hq-field input:focus,
.partner-hq-field select:focus,
.partner-hq-field textarea:focus,
.partner-hq-rate-panel input:focus { border-color: rgba(61,165,255,.65); box-shadow: 0 0 0 3px rgba(61,165,255,.12); }
.partner-hq-field select option { background: #151b22; color: #fff; }
.partner-hq-field textarea { resize: vertical; }
.partner-hq-notice { margin: 16px 0; padding: 15px; border-radius: 14px; line-height: 1.55; }
.partner-hq-notice-error { border: 1px solid rgba(255,95,95,.34); background: rgba(255,70,70,.1); color: #ffd0d0; }
.partner-hq-notice-success { border: 1px solid rgba(72,214,151,.3); background: rgba(72,214,151,.09); color: #b8f3d8; }
.partner-hq-danger-button { padding: 12px 18px; border: 1px solid rgba(255,95,95,.45); border-radius: 10px; background: rgba(255,70,70,.12); color: #ffd0d0; cursor: pointer; font: inherit; font-weight: 800; }
.partner-hq-button-row { justify-content: flex-start; margin-top: 20px; }
.partner-hq-stack { display: grid; gap: 14px; margin-top: 22px; }
.partner-hq-card,
.partner-hq-referral-card,
.partner-hq-payout-history-card,
.partner-hq-balance-card { overflow: hidden; padding: 20px; border: 1px solid rgba(255,255,255,.1); border-radius: 18px; background: rgba(0,0,0,.17); }
.partner-hq-card-pending,
.partner-hq-referral-pending { border-color: rgba(255,190,80,.28); }
.partner-hq-card-approved,
.partner-hq-referral-earned,
.partner-hq-referral-paid { border-color: rgba(72,214,151,.25); }
.partner-hq-card-suspended,
.partner-hq-card-denied,
.partner-hq-referral-voided { border-color: rgba(255,95,95,.25); }
.partner-hq-card-summary { align-items: stretch; }
.partner-hq-card-main { flex: 1 1 720px; min-width: 0; }
.partner-hq-card-title-row { align-items: flex-start; }
.partner-hq-card-title-row h3,
.partner-hq-balance-card h3 { margin: 4px 0; font-size: 25px; }
.partner-hq-muted { color: #aab5bd; overflow-wrap: anywhere; }
.partner-hq-card-buttons { flex: 0 0 170px; display: grid; align-content: center; gap: 10px; }
.partner-hq-card-buttons button { width: 100%; }
.partner-hq-card-details { display: grid; gap: 13px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.07); margin-top: 18px; }
.partner-hq-detail-grid,
.partner-hq-referral-grid,
.partner-hq-balance-metrics { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; margin-top: 16px; }
.partner-hq-detail-block { padding: 16px; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; background: rgba(255,255,255,.025); margin-top: 14px; }
.partner-hq-detail-block p { margin-top: 8px; color: #b0bac1; line-height: 1.65; white-space: pre-wrap; }
.partner-hq-detail-highlighted { border-color: rgba(61,165,255,.28); background: rgba(61,165,255,.07); }
.partner-hq-detail-private { border-color: rgba(185,130,255,.3); background: rgba(185,130,255,.07); }
.partner-hq-rate-panel { display: grid; grid-template-columns: minmax(0,1fr) 130px auto; gap: 14px; align-items: end; padding: 16px; border: 1px solid rgba(72,214,151,.22); border-radius: 15px; background: rgba(72,214,151,.06); }
.partner-hq-rate-panel > div { display: grid; gap: 6px; }
.partner-hq-rate-panel p { color: #9ca8b0; font-size: 13px; line-height: 1.5; }
.partner-hq-rate-panel label { display: grid; gap: 7px; }
.partner-hq-status-pending,
.partner-hq-referral-status-pending { border: 1px solid rgba(255,190,80,.35); background: rgba(255,170,50,.1); color: #ffe0a8; }
.partner-hq-status-approved,
.partner-hq-referral-status-earned,
.partner-hq-referral-status-paid,
.partner-hq-status-paid { border: 1px solid rgba(72,214,151,.35); background: rgba(72,214,151,.1); color: #b8f3d8; }
.partner-hq-status-suspended,
.partner-hq-status-denied,
.partner-hq-referral-status-voided { border: 1px solid rgba(255,95,95,.38); background: rgba(255,70,70,.11); color: #ffcaca; }
.partner-hq-empty { padding: 48px 20px; text-align: center; color: #aab5bd; }
.partner-hq-empty h3 { margin-bottom: 8px; color: #fff; font-size: 26px; }
.partner-hq-security-note { text-align: center; }
.partner-hq-security-note p { max-width: 820px; margin: 0 auto; }
.partner-hq-settings-panel { display: grid; grid-template-columns: minmax(0,1fr) minmax(280px,360px); gap: 24px; align-items: end; }
.partner-hq-threshold-form { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: end; }
.partner-hq-money-input { display: grid; grid-template-columns: auto minmax(0,1fr); align-items: center; border: 1px solid rgba(255,255,255,.14); border-radius: 12px; background: #151b22; overflow: hidden; }
.partner-hq-money-input b { padding-left: 14px; color: #9ed8ff; }
.partner-hq-money-input input { border: 0; }
.partner-hq-balance-card { display: grid; grid-template-columns: minmax(220px,.7fr) minmax(0,1.6fr) minmax(150px,.45fr); gap: 16px; align-items: center; }
.partner-hq-balance-metrics { margin-top: 0; }
.partner-hq-balance-action { display: grid; gap: 10px; }
.partner-hq-adjustment-warning,
.partner-hq-adjustment-notice { padding: 10px 12px; border: 1px solid rgba(255,190,80,.32); border-radius: 12px; background: rgba(255,170,50,.09); color: #ffe0a8; font-size: 12px; line-height: 1.5; }
.partner-hq-adjustment-notice { margin-top: 14px; }
.partner-hq-payout-panel { border-color: rgba(72,214,151,.3); }
.partner-hq-select-all-row { margin: 18px 0 10px; }
.partner-hq-payout-referrals { display: grid; gap: 8px; max-height: 360px; overflow-y: auto; padding-right: 4px; }
.partner-hq-payout-referral-row { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 12px; padding: 13px; border: 1px solid rgba(255,255,255,.09); border-radius: 13px; background: rgba(255,255,255,.03); cursor: pointer; }
.partner-hq-payout-referral-row input { width: 19px; height: 19px; accent-color: #3da5ff; }
.partner-hq-payout-referral-row span { display: grid; gap: 3px; }
.partner-hq-payout-referral-row small { color: #8f9aa2; }
.partner-hq-payout-search { max-width: 640px; }
.partner-hq-leaderboard-settings-grid { display: grid; gap: 16px; margin-top: 20px; }
.partner-hq-rule-card { padding: 18px; border: 1px solid rgba(61,165,255,.2); border-radius: 16px; background: rgba(61,165,255,.045); }
.partner-hq-rule-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; }
.partner-hq-checkbox-row { display: flex; align-items: center; gap: 10px; font-weight: 800; }
.partner-hq-checkbox-row input { width: 19px; height: 19px; accent-color: #3da5ff; }
.partner-hq-period-form { display: grid; grid-template-columns: minmax(180px,.5fr) minmax(220px,.8fr) auto; gap: 12px; align-items: end; margin-top: 18px; }
.partner-hq-leaderboard-summary { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; margin-top: 18px; }
.partner-hq-leaderboard-table-wrap { margin-top: 18px; overflow-x: auto; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; }
.partner-hq-leaderboard-table { width: 100%; min-width: 860px; border-collapse: collapse; }
.partner-hq-leaderboard-table th,
.partner-hq-leaderboard-table td { padding: 14px; border-bottom: 1px solid rgba(255,255,255,.07); text-align: left; }
.partner-hq-leaderboard-table th { color: #9ed8ff; font-size: 11px; letter-spacing: .7px; text-transform: uppercase; background: rgba(255,255,255,.035); }
.partner-hq-leaderboard-table td small { display: block; margin-top: 4px; color: #8f9aa2; }
.partner-hq-current-reward-card,
.partner-hq-reward-card { margin-top: 18px; padding: 20px; border: 1px solid rgba(185,130,255,.28); border-radius: 18px; background: rgba(185,130,255,.065); }
.partner-hq-current-reward-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.partner-hq-current-reward-card h3 { margin: 4px 0; font-size: 28px; }
.partner-hq-award-panel { display: grid; gap: 14px; margin-top: 18px; padding: 18px; border: 1px solid rgba(72,214,151,.24); border-radius: 16px; background: rgba(72,214,151,.055); }
.partner-hq-award-panel p { color: #9ca8b0; line-height: 1.55; }
.partner-hq-reward-issue-panel { border-color: rgba(185,130,255,.32); }
.partner-hq-status-awarded { border: 1px solid rgba(255,190,80,.35); background: rgba(255,170,50,.1); color: #ffe0a8; }
.partner-hq-status-issued { border: 1px solid rgba(72,214,151,.35); background: rgba(72,214,151,.1); color: #b8f3d8; }
.partner-hq-campaign-editor { border-color: rgba(61,165,255,.32); }
.partner-hq-campaign-form-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; margin-top: 18px; }
.partner-hq-campaign-wide { grid-column: 1 / -1; }
.partner-hq-campaign-card { padding: 20px; border: 1px solid rgba(255,255,255,.1); border-radius: 18px; background: rgba(0,0,0,.17); }
.partner-hq-campaign-draft { border-color: rgba(255,190,80,.24); }
.partner-hq-campaign-published { border-color: rgba(72,214,151,.27); }
.partner-hq-campaign-archived { border-color: rgba(255,95,95,.23); opacity: .88; }
.partner-hq-campaign-channel-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin-top: 14px; }
.partner-hq-campaign-links { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
.partner-hq-campaign-links a { display: inline-flex; padding: 10px 13px; border: 1px solid rgba(61,165,255,.28); border-radius: 10px; color: #9ed8ff; text-decoration: none; font-weight: 800; }
.partner-hq-status-draft { border: 1px solid rgba(255,190,80,.35); background: rgba(255,170,50,.1); color: #ffe0a8; }
.partner-hq-status-published { border: 1px solid rgba(72,214,151,.35); background: rgba(72,214,151,.1); color: #b8f3d8; }
.partner-hq-status-archived { border: 1px solid rgba(255,95,95,.38); background: rgba(255,70,70,.11); color: #ffcaca; }
.partner-hq-analytics-panel { border-color: rgba(61,165,255,.3); }
.partner-hq-analytics-panel > .partner-hq-section-heading p:not(.eyebrow) { max-width: 820px; color: #b6c0c8; line-height: 1.65; }
.partner-hq-analytics-filters { display: grid; grid-template-columns: minmax(150px,.45fr) minmax(220px,.8fr) minmax(240px,1fr) auto; gap: 12px; align-items: end; margin-top: 20px; }
.partner-hq-analytics-stats { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; margin-top: 20px; }
.partner-hq-analytics-grid { display: grid; gap: 16px; margin-top: 20px; }
.partner-hq-analytics-table-card { overflow: hidden; border: 1px solid rgba(255,255,255,.09); border-radius: 17px; background: rgba(0,0,0,.16); }
.partner-hq-analytics-table-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 18px; flex-wrap: wrap; }
.partner-hq-analytics-table-heading h3 { margin: 4px 0 0; font-size: 24px; }
.partner-hq-analytics-table-heading > span { color: #8f9aa2; font-size: 12px; font-weight: 800; }
.partner-hq-analytics-table-wrap { overflow-x: auto; border-top: 1px solid rgba(255,255,255,.07); }
.partner-hq-analytics-table { width: 100%; min-width: 850px; border-collapse: collapse; }
.partner-hq-analytics-table th,
.partner-hq-analytics-table td { padding: 13px 15px; border-bottom: 1px solid rgba(255,255,255,.065); text-align: left; vertical-align: top; }
.partner-hq-analytics-table th { color: #9ed8ff; background: rgba(255,255,255,.03); font-size: 11px; letter-spacing: .7px; text-transform: uppercase; }
.partner-hq-analytics-table td { color: #e8edf0; }
.partner-hq-analytics-table td small { display: block; margin-top: 4px; color: #8f9aa2; }
.partner-hq-analytics-empty { padding: 30px 18px; border-top: 1px solid rgba(255,255,255,.07); color: #aab5bd; text-align: center; line-height: 1.55; }
.partner-hq-risk-panel {
  border-color: rgba(255,190,80,.3);
  background:
    radial-gradient(
      circle at top left,
      rgba(255,170,50,.11),
      transparent 38%
    ),
    rgba(255,255,255,.04);
}

.partner-hq-risk-stats {
  display: grid;
  grid-template-columns:
    repeat(4,minmax(0,1fr));
  gap: 12px;
  margin-top: 20px;
}

.partner-hq-risk-card {
  overflow: hidden;
  padding: 20px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 18px;
  background: rgba(0,0,0,.18);
}

.partner-hq-risk-card-low {
  border-color: rgba(61,165,255,.25);
}

.partner-hq-risk-card-medium {
  border-color: rgba(255,190,80,.3);
}

.partner-hq-risk-card-high,
.partner-hq-risk-card-critical {
  border-color: rgba(255,95,95,.42);
}

.partner-hq-risk-badges {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.partner-hq-risk-status-new {
  border: 1px solid rgba(255,190,80,.38);
  background: rgba(255,170,50,.11);
  color: #ffe0a8;
}

.partner-hq-risk-status-reviewing {
  border: 1px solid rgba(61,165,255,.38);
  background: rgba(61,165,255,.11);
  color: #b9e4ff;
}

.partner-hq-risk-status-cleared {
  border: 1px solid rgba(72,214,151,.36);
  background: rgba(72,214,151,.1);
  color: #b8f3d8;
}

.partner-hq-risk-status-confirmed_abuse {
  border: 1px solid rgba(255,95,95,.44);
  background: rgba(255,70,70,.13);
  color: #ffcaca;
}

.partner-hq-risk-severity-low {
  border: 1px solid rgba(61,165,255,.3);
  color: #b9e4ff;
}

.partner-hq-risk-severity-medium {
  border: 1px solid rgba(255,190,80,.34);
  color: #ffe0a8;
}

.partner-hq-risk-severity-high,
.partner-hq-risk-severity-critical {
  border: 1px solid rgba(255,95,95,.42);
  color: #ffcaca;
}

.partner-hq-risk-review-details {
  display: grid;
  gap: 14px;
  padding-top: 18px;
  margin-top: 18px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.partner-hq-risk-controls {
  display: grid;
  grid-template-columns:
    repeat(2,minmax(0,1fr));
  gap: 14px;
}

.partner-hq-hold-notice {
  display: grid;
  gap: 5px;
  margin-top: 14px;
  padding: 14px;
  border: 1px solid rgba(255,95,95,.4);
  border-radius: 13px;
  background: rgba(255,70,70,.1);
  color: #ffd0d0;
  line-height: 1.5;
}

.partner-hq-hold-notice span,
.partner-hq-hold-notice small {
  color: #e8bebe;
}

.partner-hq-risk-history {
  padding: 16px;
  border: 1px solid rgba(185,130,255,.28);
  border-radius: 14px;
  background: rgba(185,130,255,.06);
}

.partner-hq-risk-history > div {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}

.partner-hq-risk-history article {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 11px;
  background: rgba(0,0,0,.15);
}

.partner-hq-risk-history article span,
.partner-hq-risk-history article small {
  color: #aeb8c0;
}

.partner-hq-risk-history article p {
  margin: 0;
  color: #d3dae0;
  white-space: pre-wrap;
}
button:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 1080px) {
  .partner-hq-stats { grid-template-columns: repeat(3,minmax(0,1fr)); }
  .partner-hq-risk-stats,
  .partner-hq-referral-stats,
  .partner-hq-detail-grid,
  .partner-hq-referral-grid,
  .partner-hq-balance-metrics { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .partner-hq-balance-card { grid-template-columns: minmax(0,1fr); }
  .partner-hq-rule-grid { grid-template-columns: minmax(0,1fr); }
  .partner-hq-analytics-filters { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .partner-hq-analytics-stats { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 760px) {
  .partner-hq-page { padding: 48px 12px; }
  .partner-hq-login-card,
  .partner-hq-hero,
  .partner-hq-panel { padding: 20px; border-radius: 19px; }
  .partner-hq-stats,
  .partner-hq-risk-stats,
  .partner-hq-referral-stats,
  .partner-hq-payout-summary,
  .partner-hq-filters,
  .partner-hq-form-grid,
  .partner-hq-payout-form-grid,
  .partner-hq-detail-grid,
  .partner-hq-referral-grid,
  .partner-hq-balance-metrics,
  .partner-hq-risk-controls,
  .partner-hq-rate-panel,
  .partner-hq-settings-panel,
  .partner-hq-threshold-form,
  .partner-hq-period-form,
  .partner-hq-leaderboard-summary,
  .partner-hq-campaign-form-grid,
  .partner-hq-campaign-channel-grid,
  .partner-hq-analytics-filters,
  .partner-hq-analytics-stats { grid-template-columns: minmax(0,1fr); }
  .partner-hq-campaign-wide { grid-column: auto; }
  .partner-hq-card-buttons { flex: 1 1 100%; }
  .partner-hq-hero > button,
  .partner-hq-button-row button,
  .partner-hq-threshold-form button,
  .partner-hq-balance-action button { width: 100%; }
}
`;

export default PartnerHQ;
