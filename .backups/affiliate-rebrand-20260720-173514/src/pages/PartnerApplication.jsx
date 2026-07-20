import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

const platformOptions = [
  "Facebook",
  "TikTok",
  "Instagram",
  "YouTube",
  "Telegram",
  "Website or Blog",
  "Email Newsletter",
  "Other",
];

const audienceOptions = [
  "Under 500",
  "500â€“1,999",
  "2,000â€“4,999",
  "5,000â€“9,999",
  "10,000â€“24,999",
  "25,000â€“49,999",
  "50,000â€“99,999",
  "100,000+",
];

const initialForm = {
  code: "",
  primaryPlatform: "",
  profileUrl: "",
  audienceSize: "",
  promotionPlan: "",
  experience: "",
  agreementAccepted: false,
};

const emptySummary = {
  totalCount: 0,
  pendingCount: 0,
  earnedCount: 0,
  voidedCount: 0,
  pendingCommissionCents: 0,
  earnedCommissionCents: 0,
  voidedCommissionCents: 0,
  earnedRevenueCents: 0,
  availableReferralCount: 0,
  availableCommissionCents: 0,
  paidReferralCount: 0,
  paidCommissionCents: 0,
  adjustmentRequiredCount: 0,
  minimumPayoutCents: 5000,
  payoutEligible: false,
  amountUntilEligibleCents: 5000,
};

const emptyPayoutSettings = {
  minimumPayoutCents: 5000,
  updatedAt: "",
};

const emptyLeaderboardSettings = {
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
};

const emptyLeaderboardData = {
  period: null,
  settings: emptyLeaderboardSettings,
  entries: [],
  currentPartner: null,
  reward: null,
  rewards: [],
};


const CAMPAIGN_CHANNELS = [
  ["facebookCopy", "Facebook"],
  ["instagramCopy", "Instagram"],
  ["tiktokCopy", "TikTok"],
  ["smsCopy", "Text Message"],
  ["emailCopy", "Email"],
];

const CAMPAIGN_FIELD_CHANNELS = {
  facebookCopy: "facebook",
  instagramCopy: "instagram",
  tiktokCopy: "tiktok",
  smsCopy: "sms",
  emailCopy: "email",
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
  summary: EMPTY_ANALYTICS_METRICS,
  byCampaign: [],
  byChannel: [],
  daily: [],
};

function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 20);
}

function getLocalCodeError(code) {
  if (!code) return "Choose your affiliate code.";
  if (code.length < 4 || code.length > 20) return "Use 4â€“20 characters.";
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)) {
    return "Use letters, numbers, and single hyphens only.";
  }
  if (!/[A-Z]/.test(code)) return "Include at least one letter.";
  return "";
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
    summary: normalizeAnalyticsMetrics(source.summary),
    byCampaign: normalizeRows(source.byCampaign, (row) => ({
      campaignSlug: String(row.campaignSlug || "").toLowerCase(),
      campaignTitle: String(row.campaignTitle || "General Referral Link"),
    })).sort(
      (left, right) =>
        right.totalClicks - left.totalClicks ||
        left.campaignTitle.localeCompare(right.campaignTitle)
    ),
    byChannel: normalizeRows(source.byChannel, (row) => ({
      channel: String(row.channel || "untracked").toLowerCase(),
    })).sort(
      (left, right) =>
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

function formatPayoutType(value) {
  return String(value || "cash").toLowerCase() === "store_credit"
    ? "Store Credit"
    : "Cash Payment";
}

function formatRewardType(value) {
  const normalized = String(value || "store_credit").toLowerCase();

  if (normalized === "cash") return "Cash Reward";
  if (normalized === "swag") return "Swag Reward";
  return "Store Credit";
}

function formatMetricLabel(value) {
  const normalized = String(value || "commission").toLowerCase();

  if (normalized === "revenue") return "Earned Referral Revenue";
  if (normalized === "referrals") return "Earned Referrals";
  return "Earned Commission";
}

function formatLeaderboardScore(entry) {
  if (!entry) return "No earned referrals yet";

  if (entry.metric === "referrals") {
    return `${Number(entry.referralCount || 0)} earned referral(s)`;
  }

  if (entry.metric === "revenue") {
    return formatMoneyFromCents(entry.revenueCents);
  }

  return formatMoneyFromCents(entry.commissionCents);
}

function formatPeriodLabel(period) {
  if (!period?.periodKey) return "Current period";

  if (period.periodType === "quarterly") {
    const match = /^(\d{4})-Q([1-4])$/.exec(period.periodKey);
    return match ? `Q${match[2]} ${match[1]}` : period.periodKey;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(period.periodKey);

  if (!match) return period.periodKey;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function describeReward(settings, periodType) {
  const isQuarterly = periodType === "quarterly";
  const enabled = isQuarterly
    ? settings.quarterlyRewardEnabled
    : settings.monthlyRewardEnabled;
  const rewardType = isQuarterly
    ? settings.quarterlyRewardType
    : settings.monthlyRewardType;
  const rewardAmountCents = isQuarterly
    ? settings.quarterlyRewardAmountCents
    : settings.monthlyRewardAmountCents;
  const rewardDescription = isQuarterly
    ? settings.quarterlyRewardDescription
    : "";

  if (!enabled) return "Reward currently disabled";
  if (rewardType === "swag") return rewardDescription || "304 Peptides swag reward";
  return `${formatMoneyFromCents(rewardAmountCents)} ${formatRewardType(rewardType).toLowerCase()}`;
}

async function readApiJson(response) {
  const text = await response.text();
  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("The Partner Program service returned an invalid response.");
  }

  if (!response.ok || !result.success) {
    const error = new Error(
      result.error || "The Partner Program request could not be completed."
    );

    error.status = response.status;
    error.requiresPasswordChange = Boolean(result.requiresPasswordChange);
    throw error;
  }

  return result;
}

function buildReferralLink(code, channel = "general") {
  if (!code || typeof window === "undefined") return "";

  const url = new URL("/r", window.location.origin);
  url.searchParams.set("ref", code);
  url.searchParams.set("channel", channel || "general");
  return url.toString();
}

function buildCampaignReferralLink(code, campaign, channel = "general") {
  if (!code || !campaign?.slug || typeof window === "undefined") return "";

  const url = new URL("/r", window.location.origin);
  url.searchParams.set("ref", code);
  url.searchParams.set("campaign", campaign.slug);
  url.searchParams.set("channel", channel || "general");
  return url.toString();
}

function personalizeCampaignCopy(campaign, field, referralLink, partnerCode) {
  const source = String(campaign?.[field] || "").trim();
  if (!source) return "";

  const disclaimer = String(campaign?.disclaimer || "").trim();
  let result = source
    .replace(/\{\{?REFERRAL_LINK\}?\}|\[REFERRAL_LINK\]/gi, referralLink)
    .replace(/\{\{?PARTNER_CODE\}?\}|\[PARTNER_CODE\]/gi, partnerCode)
    .replace(/\{\{?DISCLAIMER\}?\}|\[DISCLAIMER\]/gi, disclaimer);

  if (referralLink && !result.includes(referralLink)) {
    result = `${result}

${referralLink}`;
  }

  if (disclaimer && !result.toLowerCase().includes(disclaimer.toLowerCase())) {
    result = `${result}

${disclaimer}`;
  }

  if (field === "emailCopy" && campaign.emailSubject) {
    result = `Subject: ${campaign.emailSubject}

${result}`;
  }

  return result.trim();
}

function formatCampaignAvailability(campaign) {
  if (campaign?.startsAt && campaign?.endsAt) {
    return `${formatDate(campaign.startsAt)} through ${formatDate(campaign.endsAt)}`;
  }

  if (campaign?.startsAt) return `Starts ${formatDate(campaign.startsAt)}`;
  if (campaign?.endsAt) return `Available through ${formatDate(campaign.endsAt)}`;
  return "Available while published";
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

function PartnerApplication({
  onNavigate = () => {},
  onSubmitApplication = null,
}) {
  const [formData, setFormData] = useState(initialForm);
  const [application, setApplication] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [summary, setSummary] = useState(emptySummary);
  const [referrals, setReferrals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutSettings, setPayoutSettings] = useState(emptyPayoutSettings);
  const [leaderboardPeriodType, setLeaderboardPeriodType] = useState("monthly");
  const [leaderboardData, setLeaderboardData] = useState(emptyLeaderboardData);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(false);
  const [campaignError, setCampaignError] = useState("");
  const [analyticsPeriod, setAnalyticsPeriod] = useState("30");
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS_REPORT);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeState, setCodeState] = useState("idle");
  const [codeMessage, setCodeMessage] = useState("");
  const availabilityRequest = useRef(0);

  const isDenied = application?.status === "denied";
  const isApproved = application?.status === "approved";
  const isSuspended = application?.status === "suspended";
  const lockedApplication = Boolean(
    application && ["pending", "approved", "suspended"].includes(application.status)
  );

  const referralLink = useMemo(
    () => buildReferralLink(application?.code),
    [application?.code]
  );

  const localCodeError = useMemo(
    () => getLocalCodeError(formData.code),
    [formData.code]
  );

  const formComplete = Boolean(
    eligibility?.eligible &&
      !lockedApplication &&
      !localCodeError &&
      codeState === "available" &&
      formData.primaryPlatform &&
      formData.audienceSize &&
      formData.promotionPlan.trim() &&
      formData.agreementAccepted
  );

  async function loadLeaderboard(periodType = leaderboardPeriodType) {
    setIsLeaderboardLoading(true);
    setLeaderboardError("");

    try {
      const response = await fetch(
        `/api/partner/leaderboard?periodType=${encodeURIComponent(periodType)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await readApiJson(response);

      setLeaderboardData({
        ...emptyLeaderboardData,
        ...result,
        settings: {
          ...emptyLeaderboardSettings,
          ...(result.settings || {}),
        },
        entries: Array.isArray(result.entries) ? result.entries : [],
        rewards: Array.isArray(result.rewards) ? result.rewards : [],
      });
    } catch (error) {
      setLeaderboardError(
        error.message || "Partner leaderboard data could not be loaded."
      );
    } finally {
      setIsLeaderboardLoading(false);
    }
  }

  async function loadCampaigns() {
    if (!isApproved) {
      setCampaigns([]);
      return;
    }

    setIsCampaignsLoading(true);
    setCampaignError("");

    try {
      const response = await fetch("/api/partner/campaigns", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await readApiJson(response);
      setCampaigns(Array.isArray(result.campaigns) ? result.campaigns : []);
    } catch (error) {
      setCampaignError(
        error.message || "Partner marketing campaigns could not be loaded."
      );
    } finally {
      setIsCampaignsLoading(false);
    }
  }

  async function loadAnalytics(period = analyticsPeriod) {
    if (!isApproved && !isSuspended) {
      setAnalytics(EMPTY_ANALYTICS_REPORT);
      return;
    }

    setIsAnalyticsLoading(true);
    setAnalyticsError("");

    try {
      const response = await fetch(
        `/api/partner/analytics?period=${encodeURIComponent(period)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await readApiJson(response);
      setApplication((current) => result.application || current);
      setAnalytics(normalizeAnalyticsReport(result.analytics));
    } catch (error) {
      setAnalyticsError(
        error.message || "Referral analytics could not be loaded."
      );
    } finally {
      setIsAnalyticsLoading(false);
    }
  }

  async function loadPartnerSummary() {
    setIsSummaryLoading(true);
    setSummaryError("");

    try {
      const response = await fetch("/api/partner/summary", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await readApiJson(response);

      setApplication((current) => result.application || current);
      setSummary({ ...emptySummary, ...(result.summary || {}) });
      setReferrals(Array.isArray(result.referrals) ? result.referrals : []);
      setPayouts(Array.isArray(result.payouts) ? result.payouts : []);
      setPayoutSettings({
        ...emptyPayoutSettings,
        ...(result.payoutSettings || {}),
      });
    } catch (error) {
      setSummaryError(
        error.message || "Partner referral history could not be loaded."
      );
    } finally {
      setIsSummaryLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadApplication() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/partner/application", {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        });

        const result = await readApiJson(response);

        if (!active) return;

        const savedApplication = result.application || null;

        setApplication(savedApplication);
        setEligibility(result.eligibility || null);

        if (savedApplication?.status === "denied") {
          setFormData({
            code: savedApplication.code || "",
            primaryPlatform: savedApplication.primaryPlatform || "",
            profileUrl: savedApplication.profileUrl || "",
            audienceSize: savedApplication.audienceSize || "",
            promotionPlan: savedApplication.promotionPlan || "",
            experience: savedApplication.experience || "",
            agreementAccepted: false,
          });
        }

        if (["approved", "suspended"].includes(savedApplication?.status)) {
          setIsSummaryLoading(true);

          try {
            const summaryResponse = await fetch("/api/partner/summary", {
              method: "GET",
              headers: { Accept: "application/json" },
              credentials: "same-origin",
              cache: "no-store",
            });

            const summaryResult = await readApiJson(summaryResponse);

            if (!active) return;

            setApplication(summaryResult.application || savedApplication);
            setSummary({ ...emptySummary, ...(summaryResult.summary || {}) });
            setReferrals(
              Array.isArray(summaryResult.referrals)
                ? summaryResult.referrals
                : []
            );
            setPayouts(
              Array.isArray(summaryResult.payouts)
                ? summaryResult.payouts
                : []
            );
            setPayoutSettings({
              ...emptyPayoutSettings,
              ...(summaryResult.payoutSettings || {}),
            });
          } catch (error) {
            if (active) {
              setSummaryError(
                error.message || "Partner referral history could not be loaded."
              );
            }
          } finally {
            if (active) setIsSummaryLoading(false);
          }
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error.message || "Partner Program access could not be loaded."
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadApplication();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isApproved && !isSuspended) return;

    loadLeaderboard(leaderboardPeriodType);
  }, [isApproved, isSuspended, leaderboardPeriodType]);


  useEffect(() => {
    if (!isApproved) {
      setCampaigns([]);
      return;
    }

    loadCampaigns();
  }, [isApproved]);

  useEffect(() => {
    if (!isApproved && !isSuspended) {
      setAnalytics(EMPTY_ANALYTICS_REPORT);
      return;
    }

    loadAnalytics(analyticsPeriod);
  }, [isApproved, isSuspended, analyticsPeriod]);

  useEffect(() => {
    if (lockedApplication) return undefined;

    const code = formData.code;
    const error = getLocalCodeError(code);

    if (!code) {
      setCodeState("idle");
      setCodeMessage("");
      return undefined;
    }

    if (error) {
      setCodeState("invalid");
      setCodeMessage(error);
      return undefined;
    }

    const requestNumber = availabilityRequest.current + 1;
    availabilityRequest.current = requestNumber;
    setCodeState("checking");
    setCodeMessage("Checking availability...");

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/partner/code-availability?code=${encodeURIComponent(code)}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            cache: "no-store",
          }
        );

        const result = await readApiJson(response);

        if (availabilityRequest.current !== requestNumber) return;

        setCodeState(result.available ? "available" : "unavailable");
        setCodeMessage(
          result.message ||
            (result.available
              ? "This affiliate code is available."
              : "That affiliate code has already been claimed.")
        );
      } catch (error) {
        if (availabilityRequest.current !== requestNumber) return;

        setCodeState("error");
        setCodeMessage(
          error.message || "Code availability could not be checked."
        );
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [formData.code, lockedApplication]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setSubmitError("");
    setSuccessMessage("");

    setFormData((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : name === "code"
          ? normalizeCode(value)
          : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formComplete || isSubmitting) {
      setSubmitError(
        "Complete the required fields and confirm that your affiliate code is available."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/partner/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          code: formData.code,
          primaryPlatform: formData.primaryPlatform,
          profileUrl: formData.profileUrl.trim(),
          audienceSize: formData.audienceSize,
          promotionPlan: formData.promotionPlan.trim(),
          experience: formData.experience.trim(),
          agreementAccepted: formData.agreementAccepted,
        }),
      });

      const result = await readApiJson(response);
      const savedApplication = result.application || null;

      setApplication(savedApplication);
      setSuccessMessage(
        result.message || "Your Partner Program application was submitted."
      );

      if (typeof onSubmitApplication === "function") {
        onSubmitApplication(savedApplication?.code || formData.code);
      } else {
        window.setTimeout(() => onNavigate("dashboard"), 700);
      }
    } catch (error) {
      setSubmitError(error.message || "The application could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyReferralLink() {
    if (!referralLink) return;

    setCopyMessage("");

    try {
      await copyText(referralLink);
      setCopyMessage("Referral link copied.");
    } catch {
      setCopyMessage("The link could not be copied. Select and copy it manually.");
    }
  }

  if (isLoading) {
    return (
      <PageShell>
        <StateCard
          eyebrow="PARTNER PROGRAM"
          title="Loading Partner Center"
          text="Checking your secure account eligibility, application, and referral record."
        />
      </PageShell>
    );
  }

  if (loadError) {
    return (
      <PageShell>
        <StateCard
          eyebrow="PARTNER PROGRAM"
          title="Partner Center Unavailable"
          text={loadError}
        >
          <div className="partner-button-row">
            <button
              type="button"
              className="primary-btn"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("dashboard")}
            >
              Return To Dashboard
            </button>
          </div>
        </StateCard>
      </PageShell>
    );
  }

  function changeLeaderboardPeriod(periodType) {
    if (periodType === leaderboardPeriodType || isLeaderboardLoading) return;

    setLeaderboardPeriodType(periodType);
  }

  if (isApproved || isSuspended) {
    return (
      <PageShell>
        <section className="partner-application-inner">
          <div className="partner-topbar">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("dashboard")}
            >
              â† Account
            </button>

            <StatusPill status={application.status} />
          </div>

          <header className="partner-hero">
            <p className="eyebrow">304 PEPTIDES PARTNER CENTER</p>
            <h1>{isApproved ? "Referral Dashboard" : "Partner Access Suspended"}</h1>
            <p>
              {isApproved
                ? "Share your secure referral link and review attributed orders, pending commissions, and earned commissions."
                : "Your code remains reserved, but it is not active for new referrals. Your existing referral history remains available below."}
            </p>
          </header>

          {application.customerMessage && (
            <div className="partner-message-box">
              <strong>Message from 304 Peptides</strong>
              <p>{application.customerMessage}</p>
            </div>
          )}

          {summaryError && (
            <div className="partner-error" role="alert">
              {summaryError}
            </div>
          )}

          <section className="partner-dashboard-grid">
            <MetricCard
              label="Affiliate Code"
              value={application.code}
              detail={isApproved ? "Active" : "Inactive"}
            />

            <MetricCard
              label="Commission Rate"
              value={formatPercentFromBasisPoints(application.commissionRateBps)}
              detail="Captured when an order is submitted"
            />

            <MetricCard
              label="Pending Commission"
              value={formatMoneyFromCents(summary.pendingCommissionCents)}
              detail={`${summary.pendingCount} pending referral(s)`}
            />

            <MetricCard
              label="Available To Pay"
              value={formatMoneyFromCents(summary.availableCommissionCents)}
              detail={`${summary.availableReferralCount} unpaid earned referral(s)`}
            />

            <MetricCard
              label="Paid Commission"
              value={formatMoneyFromCents(summary.paidCommissionCents)}
              detail={`${summary.paidReferralCount} paid referral(s)`}
            />

            <MetricCard
              label="Tier Progress Orders"
              value={summary.tierProgressOrderCount || 0}
              detail={`${summary.selfUseTierOrderCount || 0} own-code order(s)`}
            />

            <MetricCard
              label="Attributed Orders"
              value={summary.totalCount}
              detail={`${summary.voidedCount} voided referral(s)`}
            />

            <MetricCard
              label="Earned Referral Revenue"
              value={formatMoneyFromCents(summary.earnedRevenueCents)}
              detail="Paid or later order statuses"
            />
          </section>

          <section className={`partner-payout-status-panel ${summary.payoutEligible ? "partner-payout-eligible" : ""}`}>
            <div>
              <p className="eyebrow">PAYOUT STATUS</p>
              <h2>
                {summary.payoutEligible
                  ? "Your Balance Is Eligible"
                  : "Building Toward Your Next Payout"}
              </h2>
              <p>
                The current minimum payout is {formatMoneyFromCents(
                  payoutSettings.minimumPayoutCents || summary.minimumPayoutCents
                )}. Your earned balance remains recorded until an administrator
                issues cash or store credit and records the payout.
              </p>
            </div>

            <div className="partner-payout-progress-grid">
              <RecordBox
                label="Available Balance"
                value={formatMoneyFromCents(summary.availableCommissionCents)}
              />

              <RecordBox
                label="Minimum Payout"
                value={formatMoneyFromCents(
                  payoutSettings.minimumPayoutCents || summary.minimumPayoutCents
                )}
              />

              <RecordBox
                label="Eligibility"
                value={summary.payoutEligible ? "Eligible" : "Below Minimum"}
              />

              <RecordBox
                label="Amount Until Eligible"
                value={formatMoneyFromCents(summary.amountUntilEligibleCents)}
              />
            </div>

            <small>
              Payout timing and method are handled manually by 304 Peptides. A
              payout record will appear in your history after it is issued.
            </small>
          </section>

          <section className="partner-share-panel">
            <div>
              <p className="eyebrow">YOUR REFERRAL LINK</p>
              <h2>{isApproved ? "Share This Checkout Link" : "Link Currently Inactive"}</h2>
              <p>
                Customers who open this link will see your code prefilled at checkout.
                They must apply the code before submitting. It does not change their subtotal.
              </p>
            </div>

            <div className="partner-link-row">
              <input
                type="text"
                value={referralLink}
                readOnly
                aria-label="Partner referral link"
              />

              <button
                type="button"
                className="primary-btn"
                onClick={handleCopyReferralLink}
                disabled={!isApproved}
              >
                Copy Link
              </button>
            </div>

            {copyMessage && (
              <div className="partner-success" aria-live="polite">
                {copyMessage}
              </div>
            )}

            <div className="partner-share-note">
              <strong>Own-code orders count toward tier progression</strong>
              <span>
                You may use your own code. Own-code orders earn no commission,
                customer discount, payout credit, leaderboard credit, or reward credit.
              </span>
            </div>
          </section>

          <section className="partner-analytics-panel">
            <div className="partner-section-heading">
              <div>
                <p className="eyebrow">REFERRAL ANALYTICS</p>
                <h2>Clicks, Visitors And Conversion</h2>
                <p className="partner-analytics-intro">
                  See how your general link, campaign links and QR codes perform.
                  Unique visitors use anonymous first-party IDs; customer IP addresses
                  are not stored.
                </p>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => loadAnalytics(analyticsPeriod)}
                disabled={isAnalyticsLoading}
              >
                {isAnalyticsLoading ? "Refreshing..." : "Refresh Analytics"}
              </button>
            </div>

            <div
              className="partner-analytics-period-tabs"
              role="tablist"
              aria-label="Referral analytics period"
            >
              {ANALYTICS_PERIOD_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={analyticsPeriod === value ? "active" : ""}
                  onClick={() => setAnalyticsPeriod(value)}
                  disabled={isAnalyticsLoading}
                >
                  {label}
                </button>
              ))}
            </div>

            {analyticsError && (
              <div className="partner-error" role="alert">
                {analyticsError}
              </div>
            )}

            <section className="partner-analytics-stats">
              <MetricCard
                label="Total Clicks"
                value={analytics.summary.totalClicks.toLocaleString("en-US")}
                detail="Every tracked link opening"
              />
              <MetricCard
                label="Unique Visitors"
                value={analytics.summary.uniqueVisitors.toLocaleString("en-US")}
                detail="Anonymous first-party visitors"
              />
              <MetricCard
                label="Attributed Orders"
                value={analytics.summary.attributedOrders.toLocaleString("en-US")}
                detail={`${analytics.summary.earnedOrders} earned Â· ${analytics.summary.voidedOrders} voided`}
              />
              <MetricCard
                label="Conversion Rate"
                value={formatPercentFromBasisPoints(
                  analytics.summary.conversionRateBps
                )}
                detail="Attributed orders per unique visitor"
              />
              <MetricCard
                label="Earned Revenue"
                value={formatMoneyFromCents(
                  analytics.summary.earnedRevenueCents
                )}
                detail="Paid or later referral statuses"
              />
              <MetricCard
                label="Earned Commission"
                value={formatMoneyFromCents(
                  analytics.summary.earnedCommissionCents
                )}
                detail={analytics.period.label || "Selected reporting period"}
              />
            </section>

            <div className="partner-analytics-grid">
              <AnalyticsTable
                eyebrow="CAMPAIGN PERFORMANCE"
                title="Campaigns And General Links"
                emptyText="Campaign results will appear after your tracked links receive traffic."
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
                  {
                    label: "Clicks",
                    render: (row) => row.totalClicks.toLocaleString("en-US"),
                  },
                  {
                    label: "Visitors",
                    render: (row) => row.uniqueVisitors.toLocaleString("en-US"),
                  },
                  {
                    label: "Orders",
                    render: (row) => row.attributedOrders.toLocaleString("en-US"),
                  },
                  {
                    label: "Conversion",
                    render: (row) =>
                      formatPercentFromBasisPoints(row.conversionRateBps),
                  },
                  {
                    label: "Revenue",
                    render: (row) => formatMoneyFromCents(row.earnedRevenueCents),
                  },
                ]}
              />

              <AnalyticsTable
                eyebrow="CHANNEL PERFORMANCE"
                title="Where Your Traffic Came From"
                emptyText="Channel results will appear after platform links or QR codes are opened."
                rows={analytics.byChannel}
                columns={[
                  {
                    label: "Channel",
                    render: (row) => formatAnalyticsChannel(row.channel),
                  },
                  {
                    label: "Clicks",
                    render: (row) => row.totalClicks.toLocaleString("en-US"),
                  },
                  {
                    label: "Visitors",
                    render: (row) => row.uniqueVisitors.toLocaleString("en-US"),
                  },
                  {
                    label: "Orders",
                    render: (row) => row.attributedOrders.toLocaleString("en-US"),
                  },
                  {
                    label: "Conversion",
                    render: (row) =>
                      formatPercentFromBasisPoints(row.conversionRateBps),
                  },
                  {
                    label: "Commission",
                    render: (row) =>
                      formatMoneyFromCents(row.earnedCommissionCents),
                  },
                ]}
              />

              <AnalyticsTable
                eyebrow="DAILY TREND"
                title="Traffic And Orders By Day"
                emptyText="Daily analytics will appear after the first tracked visit."
                rows={analytics.daily}
                columns={[
                  {
                    label: "Date",
                    render: (row) => formatAnalyticsDate(row.day),
                  },
                  {
                    label: "Clicks",
                    render: (row) => row.totalClicks.toLocaleString("en-US"),
                  },
                  {
                    label: "Visitors",
                    render: (row) => row.uniqueVisitors.toLocaleString("en-US"),
                  },
                  {
                    label: "Orders",
                    render: (row) => row.attributedOrders.toLocaleString("en-US"),
                  },
                  {
                    label: "Conversion",
                    render: (row) =>
                      formatPercentFromBasisPoints(row.conversionRateBps),
                  },
                  {
                    label: "Revenue",
                    render: (row) => formatMoneyFromCents(row.earnedRevenueCents),
                  },
                ]}
              />
            </div>
          </section>

          <section className="partner-marketing-panel">
            <div className="partner-section-heading">
              <div>
                <p className="eyebrow">PARTNER MARKETING CENTER</p>
                <h2>Approved Campaigns And Creative</h2>
                <p className="partner-marketing-intro">
                  Use campaign-specific referral links, approved platform copy,
                  downloadable graphics, and personalized QR codes. Campaign links
                  keep your affiliate code attached and identify which creative
                  generated the referral.
                </p>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={loadCampaigns}
                disabled={!isApproved || isCampaignsLoading}
              >
                {isCampaignsLoading ? "Refreshing..." : "Refresh Campaigns"}
              </button>
            </div>

            {isSuspended ? (
              <div className="partner-marketing-restricted">
                <strong>Marketing Center access is paused</strong>
                <p>
                  Your existing referral and reward history remains available, but
                  published campaign assets are unavailable while partner access is
                  suspended.
                </p>
              </div>
            ) : campaignError ? (
              <div className="partner-error" role="alert">
                {campaignError}
              </div>
            ) : isCampaignsLoading && campaigns.length === 0 ? (
              <EmptyState
                title="Loading Marketing Campaigns"
                text="Retrieving approved campaign assets and personalized links."
              />
            ) : campaigns.length === 0 ? (
              <EmptyState
                title="No Published Campaigns"
                text="Approved campaigns will appear here after 304 Peptides publishes them."
              />
            ) : (
              <div className="partner-campaign-stack">
                {campaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.campaignId || campaign.slug}
                    campaign={campaign}
                    partnerCode={application.code}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="partner-leaderboard-panel">
            <div className="partner-section-heading">
              <div>
                <p className="eyebrow">PARTNER LEADERBOARD</p>
                <h2>{formatPeriodLabel(leaderboardData.period)}</h2>
                <p className="partner-leaderboard-intro">
                  Rankings use {formatMetricLabel(
                    leaderboardData.settings.leaderboardMetric
                  ).toLowerCase()}. Public rankings show partner codes and earned
                  referral counts only. Your private totals appear in your own card.
                </p>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => loadLeaderboard(leaderboardPeriodType)}
                disabled={isLeaderboardLoading}
              >
                {isLeaderboardLoading ? "Refreshing..." : "Refresh Rankings"}
              </button>
            </div>

            <div className="partner-period-tabs" role="tablist" aria-label="Leaderboard period">
              <button
                type="button"
                className={leaderboardPeriodType === "monthly" ? "active" : ""}
                onClick={() => changeLeaderboardPeriod("monthly")}
                disabled={isLeaderboardLoading}
              >
                Monthly
              </button>

              <button
                type="button"
                className={leaderboardPeriodType === "quarterly" ? "active" : ""}
                onClick={() => changeLeaderboardPeriod("quarterly")}
                disabled={isLeaderboardLoading}
              >
                Quarterly
              </button>
            </div>

            {leaderboardError && (
              <div className="partner-error" role="alert">
                {leaderboardError}
              </div>
            )}

            <section className="partner-leaderboard-rule-card">
              <div>
                <span>Current Reward</span>
                <strong>
                  {describeReward(
                    leaderboardData.settings,
                    leaderboardPeriodType
                  )}
                </strong>
              </div>

              <div>
                <span>Minimum To Qualify</span>
                <strong>
                  {leaderboardPeriodType === "quarterly"
                    ? leaderboardData.settings.quarterlyMinimumReferrals
                    : leaderboardData.settings.monthlyMinimumReferrals}{" "}
                  earned referral(s)
                </strong>
              </div>

              <div>
                <span>Ranking Metric</span>
                <strong>
                  {formatMetricLabel(leaderboardData.settings.leaderboardMetric)}
                </strong>
              </div>
            </section>

            <section className="partner-own-rank-card">
              <div>
                <p className="eyebrow">YOUR CURRENT POSITION</p>
                <h3>
                  {leaderboardData.currentPartner?.rank
                    ? `Rank #${leaderboardData.currentPartner.rank}`
                    : "Not Ranked Yet"}
                </h3>
                <p>
                  {leaderboardData.currentPartner
                    ? formatLeaderboardScore(leaderboardData.currentPartner)
                    : "Earned referrals within this period will place your code on the leaderboard."}
                </p>
              </div>

              <div className="partner-own-rank-metrics">
                <RecordBox
                  label="Earned Referrals"
                  value={String(leaderboardData.currentPartner?.referralCount || 0)}
                />

                <RecordBox
                  label="Earned Commission"
                  value={formatMoneyFromCents(
                    leaderboardData.currentPartner?.commissionCents || 0
                  )}
                />

                <RecordBox
                  label="Referral Revenue"
                  value={formatMoneyFromCents(
                    leaderboardData.currentPartner?.revenueCents || 0
                  )}
                />

                <RecordBox
                  label="Qualification"
                  value={
                    leaderboardData.currentPartner?.eligible
                      ? "Qualified"
                      : "Not Yet Qualified"
                  }
                />
              </div>
            </section>

            {leaderboardData.reward && (
              <section className="partner-period-winner-card">
                <div>
                  <p className="eyebrow">RECORDED WINNER</p>
                  <h3>#{leaderboardData.reward.rank} {leaderboardData.reward.partnerCode}</h3>
                  <p>
                    {formatRewardType(leaderboardData.reward.rewardType)}
                    {leaderboardData.reward.rewardType !== "swag"
                      ? ` â€” ${formatMoneyFromCents(
                          leaderboardData.reward.rewardAmountCents
                        )}`
                      : leaderboardData.reward.rewardDescription
                      ? ` â€” ${leaderboardData.reward.rewardDescription}`
                      : ""}
                  </p>
                </div>

                <RewardStatusPill status={leaderboardData.reward.status} />
              </section>
            )}

            {isLeaderboardLoading && leaderboardData.entries.length === 0 ? (
              <EmptyState
                title="Loading Leaderboard"
                text="Retrieving current partner rankings."
              />
            ) : leaderboardData.entries.length === 0 ? (
              <EmptyState
                title="No Ranked Partners Yet"
                text="The leaderboard will populate after partners earn qualifying referrals during this period."
              />
            ) : (
              <div className="partner-leaderboard-list">
                {leaderboardData.entries.map((entry) => {
                  const isCurrentPartner =
                    entry.partnerCode === application.code;

                  return (
                    <article
                      key={`${entry.rank}-${entry.partnerCode}`}
                      className={`partner-leaderboard-row ${
                        isCurrentPartner ? "partner-leaderboard-row-current" : ""
                      }`}
                    >
                      <strong className="partner-leaderboard-rank">
                        #{entry.rank}
                      </strong>

                      <div>
                        <span>{entry.partnerCode}</span>
                        <small>
                          {entry.referralCount} earned referral(s)
                          {isCurrentPartner ? " Â· Your code" : ""}
                        </small>
                      </div>

                      <span
                        className={`partner-qualification-pill ${
                          entry.eligible ? "qualified" : "building"
                        }`}
                      >
                        {entry.eligible ? "Qualified" : "Building"}
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="partner-reward-history-panel">
            <div className="partner-section-heading">
              <div>
                <p className="eyebrow">REWARD HISTORY</p>
                <h2>Your Leaderboard Rewards</h2>
              </div>

              <span>
                <strong>{leaderboardData.rewards.length}</strong> reward record(s)
              </span>
            </div>

            {leaderboardData.rewards.length === 0 ? (
              <EmptyState
                title="No Rewards Recorded"
                text="Monthly and quarterly leaderboard rewards will appear here after a winner is officially recorded."
              />
            ) : (
              <div className="partner-reward-history-stack">
                {leaderboardData.rewards.map((reward) => (
                  <article
                    key={reward.rewardId}
                    className="partner-reward-history-card"
                  >
                    <div className="partner-referral-heading">
                      <div>
                        <p className="eyebrow">
                          {reward.periodType === "quarterly"
                            ? "QUARTERLY REWARD"
                            : "MONTHLY REWARD"}
                        </p>
                        <h3>{reward.periodKey}</h3>
                        <p>Awarded {formatDate(reward.awardedAt)}</p>
                      </div>

                      <RewardStatusPill status={reward.status} />
                    </div>

                    <div className="partner-record-grid">
                      <RecordBox
                        label="Reward"
                        value={
                          reward.rewardType === "swag"
                            ? reward.rewardDescription || "304 Peptides swag"
                            : `${formatMoneyFromCents(
                                reward.rewardAmountCents
                              )} ${formatRewardType(
                                reward.rewardType
                              ).toLowerCase()}`
                        }
                      />

                      <RecordBox
                        label="Winning Rank"
                        value={`#${reward.rank || 1}`}
                      />

                      <RecordBox
                        label="Earned Referrals"
                        value={String(reward.referralCount || 0)}
                      />

                      <RecordBox
                        label="Issued"
                        value={formatDate(reward.issuedAt)}
                      />
                    </div>

                    {reward.deliveryMethod && (
                      <div className="partner-paid-detail-row">
                        <span>
                          Delivery: <strong>{reward.deliveryMethod}</strong>
                        </span>
                      </div>
                    )}

                    {reward.partnerNote && (
                      <div className="partner-payout-note">
                        <strong>Note from 304 Peptides</strong>
                        <p>{reward.partnerNote}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="partner-referral-panel">
            <div className="partner-section-heading">
              <div>
                <p className="eyebrow">REFERRAL HISTORY</p>
                <h2>Attributed Orders</h2>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={loadPartnerSummary}
                disabled={isSummaryLoading}
              >
                {isSummaryLoading ? "Refreshing..." : "Refresh History"}
              </button>
            </div>

            {isSummaryLoading && referrals.length === 0 ? (
              <EmptyState
                title="Loading Referral History"
                text="Retrieving your secure referral records."
              />
            ) : referrals.length === 0 ? (
              <EmptyState
                title="No Referrals Yet"
                text="An attributed order will appear here after a different customer account applies your active code and submits checkout."
              />
            ) : (
              <div className="partner-referral-stack">
                {referrals.map((referral) => {
                  const commissionStatus = String(
                    referral.commissionStatus || referral.referralStatus || "pending"
                  ).toLowerCase();

                  return (
                    <article
                      key={referral.orderId}
                      className={`partner-referral-card partner-referral-${commissionStatus}`}
                    >
                      <div className="partner-referral-heading">
                        <div>
                          <p className="eyebrow">ORDER #{referral.orderId}</p>
                          <h3>{formatMoneyFromCents(referral.orderSubtotalCents)}</h3>
                          <p>{formatDate(referral.createdAt)}</p>
                        </div>

                        <ReferralStatusPill status={commissionStatus} />
                      </div>

                      {referral.requiresAdjustment && (
                        <div className="partner-payout-adjustment-note">
                          This paid referral was later voided. 304 Peptides will
                          review any required adjustment manually.
                        </div>
                      )}

                      <div className="partner-record-grid">
                        <RecordBox
                          label="Order Status"
                          value={referral.orderStatus}
                        />


                        <RecordBox
                          label="Campaign"
                          value={
                            referral.campaignTitle ||
                            referral.campaignSlug ||
                            "Direct referral"
                          }
                        />

                        <RecordBox
                          label="Credit Type"
                          value={
                            referral.isSelfUse
                              ? "Tier progression only"
                              : "Commission referral"
                          }
                        />

                        <RecordBox
                          label="Captured Rate"
                          value={formatPercentFromBasisPoints(
                            referral.commissionRateBps
                          )}
                        />

                        <RecordBox
                          label="Commission"
                          value={formatMoneyFromCents(
                            referral.commissionAmountCents
                          )}
                        />

                        <RecordBox
                          label={
                            commissionStatus === "paid"
                              ? "Paid"
                              : referral.referralStatus === "earned"
                              ? "Earned"
                              : referral.referralStatus === "voided"
                              ? "Voided"
                              : "Last Updated"
                          }
                          value={formatDate(
                            commissionStatus === "paid"
                              ? referral.payoutPaidAt
                              : referral.referralStatus === "earned"
                              ? referral.earnedAt
                              : referral.referralStatus === "voided"
                              ? referral.voidedAt
                              : referral.updatedAt
                          )}
                        />
                      </div>

                      {commissionStatus === "paid" && (
                        <div className="partner-paid-detail-row">
                          <span>
                            Payout type: <strong>{formatPayoutType(referral.payoutType)}</strong>
                          </span>
                          <span>
                            Method: <strong>{referral.payoutMethod || "Recorded payout"}</strong>
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="partner-payout-history-panel">
            <div className="partner-section-heading">
              <div>
                <p className="eyebrow">PAYOUT HISTORY</p>
                <h2>Recorded Payments And Store Credit</h2>
              </div>

              <span>
                <strong>{payouts.length}</strong> payout record(s)
              </span>
            </div>

            {payouts.length === 0 ? (
              <EmptyState
                title="No Payouts Recorded"
                text="Completed cash payments or store-credit payouts will appear here after they are issued."
              />
            ) : (
              <div className="partner-payout-history-stack">
                {payouts.map((payout) => (
                  <article
                    key={payout.payoutId}
                    className="partner-payout-history-card"
                  >
                    <div className="partner-referral-heading">
                      <div>
                        <p className="eyebrow">{payout.payoutId}</p>
                        <h3>{formatMoneyFromCents(payout.amountCents)}</h3>
                        <p>{formatDate(payout.paidAt || payout.createdAt)}</p>
                      </div>

                      <span className="partner-payout-type-pill">
                        {formatPayoutType(payout.payoutType)}
                      </span>
                    </div>

                    <div className="partner-record-grid">
                      <RecordBox
                        label="Payment Method"
                        value={payout.paymentMethod || "Recorded payout"}
                      />

                      <RecordBox
                        label="Referrals Included"
                        value={String(payout.referralCount || payout.orderIds?.length || 0)}
                      />

                      <RecordBox
                        label="Paid Date"
                        value={formatDate(payout.paidAt)}
                      />

                      <RecordBox
                        label="Orders"
                        value={
                          Array.isArray(payout.orderIds) && payout.orderIds.length
                            ? payout.orderIds.map((orderId) => `#${orderId}`).join(", ")
                            : "Not available"
                        }
                      />
                    </div>

                    {payout.partnerNote && (
                      <div className="partner-payout-note">
                        <strong>Note from 304 Peptides</strong>
                        <p>{payout.partnerNote}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="partner-button-row partner-center-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("contact")}
            >
              Contact Support
            </button>
          </div>
        </section>
      </PageShell>
    );
  }

  if (application?.status === "pending") {
    return (
      <PageShell>
        <StateCard
          eyebrow="PARTNER PROGRAM"
          title="Application Under Review"
          text="Your selected affiliate code is reserved while the application is reviewed. It is not active for referrals yet."
        >
          <StatusPill status={application.status} />

          <div className="partner-record-grid">
            <RecordBox label="Your Affiliate Code" value={application.code} />
            <RecordBox label="Status" value="Pending Review" />
            <RecordBox label="Submitted" value={formatDate(application.submittedAt)} />
            <RecordBox label="Primary Platform" value={application.primaryPlatform} />
          </div>

          {application.customerMessage && (
            <div className="partner-message-box">
              <strong>Message from 304 Peptides</strong>
              <p>{application.customerMessage}</p>
            </div>
          )}

          <div className="partner-button-row">
            <button
              type="button"
              className="primary-btn"
              onClick={() => onNavigate("dashboard")}
            >
              Return To Dashboard
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate("contact")}
            >
              Contact Support
            </button>
          </div>
        </StateCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="partner-application-inner">
        <div className="partner-topbar">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => onNavigate("dashboard")}
          >
            â† Account
          </button>

          <span className={eligibility?.eligible ? "partner-eligible" : "partner-ineligible"}>
            {eligibility?.eligible ? "Eligible To Apply" : "Order Required"}
          </span>
        </div>

        <header className="partner-hero">
          <p className="eyebrow">304 PEPTIDES PARTNER PROGRAM</p>
          <h1>Create Your Own Affiliate Code</h1>
          <p>
            Choose a unique code that fits your page or audience. Your code is
            reserved when the application is submitted and becomes active after approval.
          </p>
        </header>

        {!eligibility?.eligible ? (
          <StateCard
            eyebrow="ELIGIBILITY"
            title="Complete Your First Order Request"
            text="A secure account-linked order request is required before a Partner Program application can be submitted."
          >
            <button
              type="button"
              className="primary-btn"
              onClick={() => onNavigate("products")}
            >
              Browse Products
            </button>
          </StateCard>
        ) : (
          <div className="partner-layout">
            <form className="partner-form" onSubmit={handleSubmit}>
              {isDenied && (
                <div className="partner-denied-notice">
                  <strong>Previous application not approved</strong>
                  <p>
                    {application.customerMessage ||
                      "You may update the application and choose an available code before submitting again."}
                  </p>
                </div>
              )}

              <section className="partner-form-section">
                <p className="eyebrow">YOUR AFFILIATE CODE</p>
                <h2>Choose Your Code</h2>

                <label className="partner-field">
                  <span>Affiliate Code</span>

                  <div className="partner-code-input-row">
                    <input
                      name="code"
                      type="text"
                      value={formData.code}
                      onChange={handleChange}
                      placeholder="DANNY304"
                      autoComplete="off"
                      maxLength="20"
                      disabled={isSubmitting}
                      aria-describedby="partner-code-message"
                    />

                    <strong>{formData.code.length}/20</strong>
                  </div>

                  <small>
                    4â€“20 characters. Letters, numbers, and single hyphens only.
                    Codes are not case-sensitive.
                  </small>

                  {formData.code && (
                    <div
                      id="partner-code-message"
                      className={`partner-code-message partner-code-${codeState}`}
                      aria-live="polite"
                    >
                      {codeMessage || localCodeError}
                    </div>
                  )}
                </label>
              </section>

              <section className="partner-form-section">
                <p className="eyebrow">AUDIENCE DETAILS</p>
                <h2>Tell Us Where You Share</h2>

                <div className="partner-form-grid">
                  <SelectField
                    name="primaryPlatform"
                    label="Primary Platform"
                    value={formData.primaryPlatform}
                    onChange={handleChange}
                    options={platformOptions}
                    disabled={isSubmitting}
                  />

                  <SelectField
                    name="audienceSize"
                    label="Approximate Audience Size"
                    value={formData.audienceSize}
                    onChange={handleChange}
                    options={audienceOptions}
                    disabled={isSubmitting}
                  />

                  <label className="partner-field partner-full-field">
                    <span>Profile or Page URL â€” Optional</span>
                    <input
                      name="profileUrl"
                      type="url"
                      value={formData.profileUrl}
                      onChange={handleChange}
                      placeholder="https://..."
                      autoComplete="url"
                      maxLength="500"
                      disabled={isSubmitting}
                    />
                  </label>
                </div>
              </section>

              <section className="partner-form-section">
                <p className="eyebrow">PROMOTION PLAN</p>
                <h2>How Will You Share 304 Peptides?</h2>

                <label className="partner-field">
                  <span>Promotion Plan</span>
                  <textarea
                    name="promotionPlan"
                    rows="6"
                    value={formData.promotionPlan}
                    onChange={handleChange}
                    placeholder="Describe the educational content, audience, and channels you plan to use."
                    maxLength="2000"
                    disabled={isSubmitting}
                  />
                  <small>{formData.promotionPlan.length}/2000 characters</small>
                </label>

                <label className="partner-field">
                  <span>Relevant Experience â€” Optional</span>
                  <textarea
                    name="experience"
                    rows="4"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Share any experience with content creation, communities, research education, or affiliate programs."
                    maxLength="1000"
                    disabled={isSubmitting}
                  />
                  <small>{formData.experience.length}/1000 characters</small>
                </label>
              </section>

              <section className="partner-agreement">
                <p className="eyebrow">REQUIRED AGREEMENT</p>
                <h2>Partner Program Standards</h2>

                <ul>
                  <li>Use research-only language and do not make medical claims.</li>
                  <li>Do not represent yourself as 304 Peptides staff or ownership.</li>
                  <li>Do not use your own code for self-referrals.</li>
                  <li>Do not use spam, deceptive advertising, or misleading discounts.</li>
                  <li>Partner approval and code access may be suspended for violations.</li>
                </ul>

                <label className="partner-checkbox-row">
                  <input
                    name="agreementAccepted"
                    type="checkbox"
                    checked={formData.agreementAccepted}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />

                  <span>
                    I understand and agree to follow the Partner Program standards
                    and research-use restrictions.
                  </span>
                </label>
              </section>

              {submitError && (
                <div className="partner-error" role="alert">
                  {submitError}
                </div>
              )}

              {successMessage && (
                <div className="partner-success" aria-live="polite">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                className="primary-btn partner-submit"
                disabled={!formComplete || isSubmitting}
              >
                {isSubmitting
                  ? "Submitting Application..."
                  : isDenied
                  ? "Resubmit Partner Application"
                  : "Submit Partner Application"}
              </button>

              {!formComplete && !isSubmitting && (
                <p className="partner-helper">
                  Complete the required fields, confirm code availability, and
                  accept the Partner Program agreement.
                </p>
              )}
            </form>

            <aside className="partner-sidebar">
              <section>
                <p className="eyebrow">HOW CODES WORK</p>
                <h2>Your Code, Pending Approval</h2>
                <Step
                  number="01"
                  title="Choose it"
                  text="Create a memorable code that represents your page, name, or audience."
                />
                <Step
                  number="02"
                  title="Reserve it"
                  text="Submission reserves the code so another applicant cannot claim it during review."
                />
                <Step
                  number="03"
                  title="Activate it"
                  text="The code becomes active only after an administrator approves the application."
                />
              </section>

              <section className="partner-sidebar-note">
                <strong>Partner own-code orders</strong>
                <p>
                  Partners may use their own code for tier progression. These orders
                  earn no commission, discount, payout, leaderboard, or reward credit.
                </p>
              </section>

              <section className="partner-sidebar-note">
                <strong>For Research Use Only</strong>
                <p>
                  Partner content must describe products only within the siteâ€™s
                  research-use framework and must not promote human consumption.
                </p>
              </section>
            </aside>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function CampaignCard({ campaign, partnerCode }) {
  const availableChannels = CAMPAIGN_CHANNELS.filter(
    ([field]) => String(campaign?.[field] || "").trim()
  );
  const [selectedField, setSelectedField] = useState(
    availableChannels[0]?.[0] || ""
  );
  const [copyMessage, setCopyMessage] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const selectedChannel = CAMPAIGN_FIELD_CHANNELS[selectedField] || "general";
  const referralLink = useMemo(
    () => buildCampaignReferralLink(partnerCode, campaign, selectedChannel),
    [partnerCode, campaign, selectedChannel]
  );
  const generalReferralLink = useMemo(
    () => buildCampaignReferralLink(partnerCode, campaign, "general"),
    [partnerCode, campaign]
  );
  const qrReferralLink = useMemo(
    () => buildCampaignReferralLink(partnerCode, campaign, "qr"),
    [partnerCode, campaign]
  );
  const personalizedCopy = useMemo(
    () =>
      selectedField
        ? personalizeCampaignCopy(
            campaign,
            selectedField,
            referralLink,
            partnerCode
          )
        : "",
    [campaign, selectedField, referralLink, partnerCode]
  );

  useEffect(() => {
    let active = true;

    if (!qrReferralLink) {
      setQrDataUrl("");
      return undefined;
    }

    QRCode.toDataURL(qrReferralLink, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((value) => {
        if (active) setQrDataUrl(value);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      });

    return () => {
      active = false;
    };
  }, [qrReferralLink]);

  async function handleCopy(value, successText) {
    setCopyMessage("");

    try {
      await copyText(value);
      setCopyMessage(successText);
    } catch {
      setCopyMessage("Copy failed. Select the text and copy it manually.");
    }
  }

  function downloadQrCode() {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${campaign.slug}-${partnerCode}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const assetUrl = campaign.downloadUrl || campaign.imageUrl;

  return (
    <article className="partner-campaign-card">
      <div className="partner-campaign-header">
        <div>
          <p className="eyebrow">{campaign.slug}</p>
          <h3>{campaign.title}</h3>
          <p>{campaign.summary || campaign.headline}</p>
          <small>{formatCampaignAvailability(campaign)}</small>
        </div>

        <span className="partner-campaign-active-pill">Approved</span>
      </div>

      <div className="partner-campaign-content-grid">
        <div className="partner-campaign-creative">
          {campaign.imageUrl ? (
            <img
              src={campaign.imageUrl}
              alt={campaign.title || "Partner campaign creative"}
              loading="lazy"
            />
          ) : (
            <div className="partner-campaign-image-placeholder">
              <strong>{campaign.headline || campaign.title}</strong>
              <span>Approved campaign creative</span>
            </div>
          )}

          <div className="partner-campaign-button-row">
            {assetUrl && (
              <a
                className="secondary-btn partner-anchor-button"
                href={assetUrl}
                target="_blank"
                rel="noreferrer"
                download
              >
                Download Graphic
              </a>
            )}

            <a
              className="secondary-btn partner-anchor-button"
              href={generalReferralLink}
              target="_blank"
              rel="noreferrer"
            >
              Open Campaign Link
            </a>
          </div>
        </div>

        <div className="partner-campaign-link-panel">
          <p className="eyebrow">PERSONALIZED CAMPAIGN LINK</p>
          <div className="partner-link-row">
            <input
              type="text"
              value={referralLink}
              readOnly
              aria-label={`${campaign.title} referral link`}
            />
            <button
              type="button"
              className="primary-btn"
              onClick={() => handleCopy(referralLink, "Campaign link copied.")}
            >
              Copy Link
            </button>
          </div>

          <div className="partner-campaign-qr-row">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${campaign.title}`}
                className="partner-campaign-qr"
              />
            ) : (
              <div className="partner-campaign-qr-placeholder">QR</div>
            )}

            <div>
              <strong>Campaign QR Code</strong>
              <p>
                This QR code opens your personalized campaign link with both your
                partner code and campaign attribution attached.
              </p>
              <button
                type="button"
                className="secondary-btn"
                onClick={downloadQrCode}
                disabled={!qrDataUrl}
              >
                Download QR
              </button>
            </div>
          </div>
        </div>
      </div>

      {availableChannels.length > 0 && (
        <section className="partner-campaign-copy-panel">
          <div className="partner-campaign-channel-tabs" role="tablist">
            {availableChannels.map(([field, label]) => (
              <button
                key={field}
                type="button"
                className={selectedField === field ? "active" : ""}
                onClick={() => {
                  setSelectedField(field);
                  setCopyMessage("");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="partner-field">
            <span>Approved Copy</span>
            <textarea value={personalizedCopy} rows="8" readOnly />
          </label>

          <button
            type="button"
            className="primary-btn"
            onClick={() => handleCopy(personalizedCopy, "Approved copy copied.")}
          >
            Copy Approved Copy
          </button>
        </section>
      )}

      <div className="partner-campaign-disclaimer">
        <strong>Required research-use disclaimer</strong>
        <p>{campaign.disclaimer}</p>
      </div>

      {copyMessage && (
        <div className="partner-success" aria-live="polite">
          {copyMessage}
        </div>
      )}
    </article>
  );
}

function AnalyticsTable({ eyebrow, title, rows, columns, emptyText }) {
  return (
    <section className="partner-analytics-table-card">
      <div className="partner-analytics-table-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span>{rows.length} row(s)</span>
      </div>

      {rows.length === 0 ? (
        <div className="partner-analytics-empty">{emptyText}</div>
      ) : (
        <div className="partner-analytics-table-wrap">
          <table className="partner-analytics-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.label}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={`${title}-${
                    row.campaignSlug || row.channel || row.day || rowIndex
                  }`}
                >
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

function PageShell({ children }) {
  return (
    <>
      <style>{partnerApplicationCss}</style>
      <main className="partner-application-page">{children}</main>
    </>
  );
}

function StateCard({ eyebrow, title, text, children }) {
  return (
    <section className="partner-state-card">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{text}</p>
      {children}
    </section>
  );
}

function SelectField({ name, label, value, onChange, options, disabled }) {
  return (
    <label className="partner-field">
      <span>{label}</span>
      <select name={name} value={value} onChange={onChange} disabled={disabled}>
        <option value="">Select One</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusPill({ status }) {
  return (
    <span className={`partner-status-pill partner-status-${status}`}>
      {String(status || "pending").toUpperCase()}
    </span>
  );
}

function ReferralStatusPill({ status }) {
  return (
    <span className={`partner-status-pill partner-referral-status-${status}`}>
      {String(status || "pending").toUpperCase()}
    </span>
  );
}

function RewardStatusPill({ status }) {
  const normalized = String(status || "awarded").toLowerCase();

  return (
    <span className={`partner-reward-status partner-reward-status-${normalized}`}>
      {normalized === "issued" ? "ISSUED" : "AWARDED"}
    </span>
  );
}

function RecordBox({ label, value }) {
  return (
    <div className="partner-record-box">
      <span>{label}</span>
      <strong>{value || "Not available"}</strong>
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div className="partner-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="partner-empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div className="partner-step">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

const partnerApplicationCss = `
.partner-application-page,
.partner-application-page *,
.partner-application-page *::before,
.partner-application-page *::after {
  box-sizing: border-box;
}

.partner-application-page {
  width: 100%;
  padding: 80px 28px;
}

.partner-application-inner {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}

.partner-topbar,
.partner-button-row,
.partner-code-input-row,
.partner-section-heading,
.partner-referral-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.partner-topbar {
  margin-bottom: 22px;
}

.partner-eligible,
.partner-ineligible,
.partner-status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-eligible,
.partner-status-approved,
.partner-referral-status-earned,
.partner-referral-status-paid {
  border: 1px solid rgba(72, 214, 151, .35);
  background: rgba(72, 214, 151, .11);
  color: #b8f3d8;
}

.partner-ineligible,
.partner-status-denied,
.partner-status-suspended,
.partner-referral-status-voided {
  border: 1px solid rgba(255, 95, 95, .35);
  background: rgba(255, 70, 70, .1);
  color: #ffd0d0;
}

.partner-status-pending,
.partner-referral-status-pending {
  border: 1px solid rgba(255, 190, 80, .35);
  background: rgba(255, 170, 50, .1);
  color: #ffe0a8;
}

.partner-hero,
.partner-form,
.partner-sidebar > section,
.partner-state-card,
.partner-share-panel,
.partner-referral-panel,
.partner-payout-status-panel,
.partner-payout-history-panel,
.partner-leaderboard-panel,
.partner-reward-history-panel {
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(61, 165, 255, .12), transparent 38%),
    rgba(255, 255, 255, .04);
  box-shadow: 0 24px 65px rgba(0, 0, 0, .35);
}

.partner-hero {
  padding: 42px;
  margin-bottom: 22px;
  text-align: center;
}

.partner-hero h1,
.partner-state-card h1 {
  margin: 8px 0 16px;
  font-size: clamp(38px, 7vw, 62px);
  line-height: 1.04;
}

.partner-hero > p:not(.eyebrow),
.partner-state-card > p:not(.eyebrow),
.partner-share-panel > div > p:not(.eyebrow) {
  max-width: 820px;
  margin: 0 auto;
  color: #b6c0c8;
  line-height: 1.72;
}

.partner-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(300px, .6fr);
  gap: 22px;
  align-items: start;
}

.partner-form,
.partner-sidebar > section,
.partner-state-card,
.partner-share-panel,
.partner-referral-panel {
  padding: 28px;
}

.partner-state-card {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

.partner-state-card .partner-status-pill {
  margin-bottom: 14px;
}

.partner-form-section,
.partner-agreement {
  padding: 22px 0;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
}

.partner-form-section:first-child {
  padding-top: 0;
}

.partner-form-section h2,
.partner-agreement h2,
.partner-sidebar h2,
.partner-share-panel h2,
.partner-referral-panel h2,
.partner-payout-status-panel h2,
.partner-payout-history-panel h2 {
  margin: 6px 0 18px;
  font-size: clamp(27px, 4vw, 36px);
}

.partner-form-grid,
.partner-record-grid,
.partner-dashboard-grid {
  display: grid;
  gap: 12px;
}

.partner-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.partner-record-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 20px;
}

.partner-dashboard-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 22px 0;
}

.partner-field {
  display: grid;
  gap: 8px;
  margin-top: 15px;
}

.partner-full-field {
  grid-column: 1 / -1;
}

.partner-field > span,
.partner-record-box > span,
.partner-metric-card > span {
  color: #9ed8ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-field input,
.partner-field select,
.partner-field textarea,
.partner-code-input-row input,
.partner-link-row input {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 12px;
  outline: none;
  background: #151b22;
  color: #fff;
  font: inherit;
}

.partner-field input:focus,
.partner-field select:focus,
.partner-field textarea:focus,
.partner-code-input-row input:focus,
.partner-link-row input:focus {
  border-color: rgba(61, 165, 255, .65);
  box-shadow: 0 0 0 3px rgba(61, 165, 255, .12);
}

.partner-field select option {
  background: #151b22;
  color: #fff;
}

.partner-field textarea {
  resize: vertical;
}

.partner-field small,
.partner-metric-card small {
  color: #8f9aa2;
}

.partner-code-input-row {
  flex-wrap: nowrap;
}

.partner-code-input-row input {
  min-width: 0;
  font-weight: 900;
  letter-spacing: .8px;
  text-transform: uppercase;
}

.partner-code-input-row strong {
  flex: 0 0 auto;
  color: #8f9aa2;
  font-size: 12px;
}

.partner-code-message,
.partner-error,
.partner-success,
.partner-message-box,
.partner-denied-notice,
.partner-share-note {
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  line-height: 1.58;
}

.partner-code-available,
.partner-success {
  border: 1px solid rgba(72, 214, 151, .3);
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
}

.partner-code-checking {
  border: 1px solid rgba(255, 190, 80, .3);
  background: rgba(255, 170, 50, .08);
  color: #ffe0a8;
}

.partner-code-invalid,
.partner-code-unavailable,
.partner-code-error,
.partner-error,
.partner-denied-notice {
  border: 1px solid rgba(255, 95, 95, .34);
  background: rgba(255, 70, 70, .1);
  color: #ffd0d0;
}

.partner-message-box {
  border: 1px solid rgba(61, 165, 255, .28);
  background: rgba(61, 165, 255, .08);
}

.partner-message-box p,
.partner-denied-notice p,
.partner-share-note span {
  margin-top: 6px;
  color: #b8c4cc;
}

.partner-agreement ul {
  display: grid;
  gap: 9px;
  padding-left: 22px;
  color: #b8c4cc;
  line-height: 1.6;
}

.partner-checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 18px;
  color: #d0d7dc;
  line-height: 1.65;
}

.partner-checkbox-row input {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  margin-top: 3px;
  accent-color: #3da5ff;
}

.partner-submit {
  width: 100%;
  margin-top: 22px;
}

.partner-helper {
  margin-top: 11px;
  color: #8f9aa2;
  font-size: 12px;
  text-align: center;
}

.partner-sidebar {
  position: sticky;
  top: 105px;
  display: grid;
  gap: 16px;
}

.partner-step {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.partner-step > span {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(61, 165, 255, .3);
  border-radius: 999px;
  background: rgba(61, 165, 255, .1);
  color: #9ed8ff;
  font-weight: 900;
}

.partner-step p,
.partner-sidebar-note p {
  margin-top: 5px;
  color: #aeb8bf;
  line-height: 1.55;
}

.partner-sidebar-note {
  border-color: rgba(255, 255, 255, .08) !important;
  background: rgba(255, 255, 255, .025) !important;
}

.partner-record-box,
.partner-metric-card {
  min-width: 0;
  display: grid;
  gap: 7px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 14px;
  background: rgba(255, 255, 255, .035);
  overflow-wrap: anywhere;
}

.partner-metric-card strong {
  font-size: 27px;
}

.partner-button-row {
  justify-content: center;
  margin-top: 22px;
}

.partner-share-panel,
.partner-referral-panel,
.partner-payout-status-panel,
.partner-payout-history-panel,
.partner-leaderboard-panel,
.partner-reward-history-panel {
  margin-top: 22px;
}

.partner-payout-status-panel,
.partner-payout-history-panel {
  padding: 28px;
}

.partner-payout-status-panel {
  border-color: rgba(255, 190, 80, .24);
}

.partner-payout-status-panel.partner-payout-eligible {
  border-color: rgba(72, 214, 151, .32);
  background:
    radial-gradient(circle at top left, rgba(72, 214, 151, .13), transparent 42%),
    rgba(255, 255, 255, .04);
}

.partner-payout-status-panel > div:first-child > p:not(.eyebrow) {
  max-width: 850px;
  color: #b6c0c8;
  line-height: 1.7;
}

.partner-payout-status-panel > small {
  display: block;
  margin-top: 16px;
  color: #8f9aa2;
  line-height: 1.55;
}

.partner-payout-progress-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.partner-link-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  margin-top: 20px;
}

.partner-link-row input {
  color: #c9ebff;
  background: rgba(61, 165, 255, .08);
}

.partner-share-note {
  display: grid;
  gap: 4px;
  border: 1px solid rgba(255, 255, 255, .08);
  background: rgba(255, 255, 255, .03);
}

.partner-referral-stack {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.partner-referral-card {
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 18px;
  background: rgba(0, 0, 0, .17);
}

.partner-referral-pending {
  border-color: rgba(255, 190, 80, .25);
}

.partner-referral-earned,
.partner-referral-paid {
  border-color: rgba(72, 214, 151, .25);
}

.partner-referral-paid {
  background: rgba(72, 214, 151, .045);
}

.partner-referral-voided {
  border-color: rgba(255, 95, 95, .25);
}

.partner-referral-heading h3 {
  margin: 5px 0;
  font-size: 27px;
}

.partner-referral-heading p:not(.eyebrow) {
  color: #9ca8b0;
}

.partner-paid-detail-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, .07);
  color: #aeb8bf;
  font-size: 13px;
}

.partner-payout-adjustment-note {
  margin: 14px 0;
  padding: 12px 14px;
  border: 1px solid rgba(255, 95, 95, .3);
  border-radius: 12px;
  background: rgba(255, 70, 70, .08);
  color: #ffd0d0;
  line-height: 1.55;
}

.partner-payout-history-stack {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.partner-payout-history-card {
  padding: 20px;
  border: 1px solid rgba(72, 214, 151, .22);
  border-radius: 18px;
  background: rgba(72, 214, 151, .04);
}

.partner-payout-type-pill {
  display: inline-flex;
  padding: 8px 12px;
  border: 1px solid rgba(72, 214, 151, .3);
  border-radius: 999px;
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-payout-note {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid rgba(61, 165, 255, .25);
  border-radius: 14px;
  background: rgba(61, 165, 255, .07);
}

.partner-payout-note p {
  margin-top: 6px;
  color: #b8c4cc;
  line-height: 1.6;
  white-space: pre-wrap;
}

.partner-leaderboard-intro {
  max-width: 820px;
  color: #aeb8bf;
  line-height: 1.65;
}

.partner-period-tabs {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  margin-top: 20px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 14px;
  background: rgba(0, 0, 0, .18);
}

.partner-period-tabs button {
  padding: 10px 18px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #9faab2;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.partner-period-tabs button.active {
  border-color: rgba(61, 165, 255, .35);
  background: rgba(61, 165, 255, .12);
  color: #d7f1ff;
}

.partner-leaderboard-rule-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.partner-leaderboard-rule-card > div {
  display: grid;
  gap: 7px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 14px;
  background: rgba(255, 255, 255, .03);
}

.partner-leaderboard-rule-card span {
  color: #9ed8ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-own-rank-card,
.partner-period-winner-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  margin-top: 18px;
  border: 1px solid rgba(72, 214, 151, .27);
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(72, 214, 151, .11), transparent 45%),
    rgba(72, 214, 151, .035);
}

.partner-own-rank-card h3,
.partner-period-winner-card h3 {
  margin: 5px 0;
  font-size: 29px;
}

.partner-own-rank-card p:not(.eyebrow),
.partner-period-winner-card p:not(.eyebrow) {
  color: #aeb8bf;
}

.partner-own-rank-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.partner-period-winner-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border-color: rgba(255, 190, 80, .3);
  background:
    radial-gradient(circle at top left, rgba(255, 190, 80, .1), transparent 45%),
    rgba(255, 190, 80, .03);
}

.partner-leaderboard-list,
.partner-reward-history-stack {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.partner-leaderboard-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 14px;
  background: rgba(255, 255, 255, .025);
}

.partner-leaderboard-row-current {
  border-color: rgba(61, 165, 255, .34);
  background: rgba(61, 165, 255, .07);
}

.partner-leaderboard-rank {
  font-size: 24px;
  color: #9ed8ff;
}

.partner-leaderboard-row > div {
  display: grid;
  gap: 4px;
}

.partner-leaderboard-row > div > span {
  font-weight: 900;
  letter-spacing: .4px;
}

.partner-leaderboard-row small {
  color: #9ca8b0;
}

.partner-qualification-pill,
.partner-reward-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 11px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-qualification-pill.qualified,
.partner-reward-status-issued {
  border: 1px solid rgba(72, 214, 151, .33);
  background: rgba(72, 214, 151, .09);
  color: #b8f3d8;
}

.partner-qualification-pill.building,
.partner-reward-status-awarded {
  border: 1px solid rgba(255, 190, 80, .34);
  background: rgba(255, 190, 80, .09);
  color: #ffe0a8;
}

.partner-reward-history-card {
  padding: 20px;
  border: 1px solid rgba(185, 130, 255, .24);
  border-radius: 18px;
  background: rgba(185, 130, 255, .045);
}

.partner-empty-state {
  padding: 42px 18px;
  margin-top: 18px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 16px;
  background: rgba(255, 255, 255, .025);
  text-align: center;
}

.partner-empty-state h3 {
  margin-bottom: 7px;
  font-size: 25px;
}

.partner-empty-state p {
  color: #aeb8bf;
  line-height: 1.6;
}

.partner-center-actions {
  justify-content: flex-end;
}

button:disabled {
  opacity: .5;
  cursor: not-allowed;
}


.partner-marketing-panel {
  margin-top: 22px;
  padding: 28px;
  border: 1px solid rgba(61, 165, 255, .22);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(61, 165, 255, .11), transparent 36%),
    rgba(255, 255, 255, .035);
}

.partner-marketing-intro {
  max-width: 820px;
  color: #aeb8c0;
  line-height: 1.65;
}

.partner-marketing-restricted {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid rgba(255, 190, 80, .3);
  border-radius: 16px;
  background: rgba(255, 170, 50, .08);
  color: #ffe0a8;
}

.partner-marketing-restricted p {
  margin-top: 8px;
  line-height: 1.6;
}

.partner-campaign-stack {
  display: grid;
  gap: 18px;
  margin-top: 22px;
}

.partner-campaign-card {
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 20px;
  background: rgba(0, 0, 0, .18);
}

.partner-campaign-header,
.partner-campaign-button-row,
.partner-campaign-qr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.partner-campaign-header {
  align-items: flex-start;
}

.partner-campaign-header > div {
  max-width: 850px;
}

.partner-campaign-header h3 {
  margin: 5px 0 8px;
  font-size: clamp(25px, 4vw, 34px);
}

.partner-campaign-header p {
  color: #b4bec6;
  line-height: 1.6;
}

.partner-campaign-header small {
  display: inline-block;
  margin-top: 8px;
  color: #8f9aa2;
}

.partner-campaign-active-pill {
  padding: 8px 12px;
  border: 1px solid rgba(72, 214, 151, .35);
  border-radius: 999px;
  background: rgba(72, 214, 151, .1);
  color: #b8f3d8;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.partner-campaign-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, .9fr);
  gap: 18px;
  margin-top: 20px;
}

.partner-campaign-creative,
.partner-campaign-link-panel,
.partner-campaign-copy-panel,
.partner-campaign-disclaimer {
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 16px;
  background: rgba(255, 255, 255, .025);
}

.partner-campaign-creative img,
.partner-campaign-image-placeholder {
  width: 100%;
  min-height: 220px;
  max-height: 430px;
  border-radius: 14px;
  object-fit: contain;
  background: rgba(0, 0, 0, .28);
}

.partner-campaign-image-placeholder {
  display: grid;
  place-content: center;
  gap: 8px;
  padding: 28px;
  text-align: center;
  color: #a8d9fb;
}

.partner-campaign-button-row {
  justify-content: flex-start;
  margin-top: 14px;
}

.partner-anchor-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.partner-campaign-link-panel .partner-link-row {
  margin-top: 10px;
}

.partner-campaign-qr-row {
  justify-content: flex-start;
  align-items: flex-start;
  margin-top: 18px;
}

.partner-campaign-qr,
.partner-campaign-qr-placeholder {
  width: 144px;
  height: 144px;
  flex: 0 0 144px;
  border-radius: 12px;
  background: #fff;
}

.partner-campaign-qr-placeholder {
  display: grid;
  place-content: center;
  color: #111;
  font-weight: 900;
}

.partner-campaign-qr-row > div {
  flex: 1 1 240px;
}

.partner-campaign-qr-row p {
  margin: 7px 0 12px;
  color: #aab5bd;
  line-height: 1.55;
}

.partner-campaign-copy-panel {
  margin-top: 18px;
}

.partner-campaign-channel-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.partner-campaign-channel-tabs button {
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 999px;
  background: rgba(255, 255, 255, .035);
  color: #c4cdd4;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
}

.partner-campaign-channel-tabs button.active {
  border-color: rgba(61, 165, 255, .5);
  background: rgba(61, 165, 255, .13);
  color: #cfeeff;
}

.partner-campaign-copy-panel textarea {
  min-height: 190px;
  resize: vertical;
}

.partner-campaign-disclaimer {
  margin-top: 18px;
  border-color: rgba(255, 190, 80, .28);
  background: rgba(255, 170, 50, .07);
}

.partner-campaign-disclaimer p {
  margin-top: 8px;
  color: #d4c59f;
  line-height: 1.6;
  white-space: pre-wrap;
}

.partner-analytics-panel {
  padding: 28px;
  border: 1px solid rgba(61, 165, 255, 0.3);
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(61, 165, 255, 0.08), rgba(0, 0, 0, 0.2));
}

.partner-analytics-intro {
  max-width: 820px;
  color: #b6c0c8;
  line-height: 1.65;
}

.partner-analytics-period-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}

.partner-analytics-period-tabs button {
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: #b7c1c8;
  cursor: pointer;
  font-weight: 800;
}

.partner-analytics-period-tabs button.active {
  border-color: rgba(61, 165, 255, 0.55);
  background: rgba(61, 165, 255, 0.18);
  color: #d9efff;
}

.partner-analytics-period-tabs button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.partner-analytics-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.partner-analytics-grid {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.partner-analytics-table-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 17px;
  background: rgba(0, 0, 0, 0.16);
}

.partner-analytics-table-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 18px;
  flex-wrap: wrap;
}

.partner-analytics-table-heading h3 {
  margin: 4px 0 0;
  font-size: 24px;
}

.partner-analytics-table-heading > span {
  color: #8f9aa2;
  font-size: 12px;
  font-weight: 800;
}

.partner-analytics-table-wrap {
  overflow-x: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.partner-analytics-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

.partner-analytics-table th,
.partner-analytics-table td {
  padding: 13px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.065);
  text-align: left;
  vertical-align: top;
}

.partner-analytics-table th {
  color: #9ed8ff;
  background: rgba(255, 255, 255, 0.03);
  font-size: 11px;
  letter-spacing: 0.7px;
  text-transform: uppercase;
}

.partner-analytics-table td {
  color: #e8edf0;
}

.partner-analytics-table td small {
  display: block;
  margin-top: 4px;
  color: #8f9aa2;
}

.partner-analytics-empty {
  padding: 30px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  color: #aab5bd;
  text-align: center;
  line-height: 1.55;
}

@media (max-width: 960px) {
  .partner-campaign-content-grid {
    grid-template-columns: 1fr;
  }

  .partner-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .partner-sidebar {
    position: static;
  }

  .partner-dashboard-grid,
  .partner-payout-progress-grid,
  .partner-own-rank-metrics,
  .partner-leaderboard-rule-card,
  .partner-analytics-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .partner-record-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .partner-marketing-panel,
  .partner-analytics-panel,
  .partner-campaign-card {
    padding: 18px;
  }

  .partner-campaign-qr,
  .partner-campaign-qr-placeholder {
    width: 118px;
    height: 118px;
    flex-basis: 118px;
  }

  .partner-application-page {
    padding: 48px 12px;
  }

  .partner-hero,
  .partner-form,
  .partner-sidebar > section,
  .partner-state-card,
  .partner-share-panel,
  .partner-referral-panel,
  .partner-payout-status-panel,
  .partner-payout-history-panel,
  .partner-leaderboard-panel,
  .partner-reward-history-panel,
  .partner-analytics-panel {
    padding: 20px;
    border-radius: 19px;
  }

  .partner-form-grid,
  .partner-record-grid,
  .partner-dashboard-grid,
  .partner-payout-progress-grid,
  .partner-own-rank-metrics,
  .partner-leaderboard-rule-card,
  .partner-analytics-stats,
  .partner-link-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .partner-leaderboard-row,
  .partner-period-winner-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .partner-period-tabs,
  .partner-analytics-period-tabs {
    width: 100%;
  }

  .partner-period-tabs button,
  .partner-analytics-period-tabs button {
    flex: 1;
  }

  .partner-full-field {
    grid-column: auto;
  }

  .partner-button-row,
  .partner-button-row button,
  .partner-link-row button,
  .partner-section-heading > button {
    width: 100%;
  }
}
`;

export default PartnerApplication;
