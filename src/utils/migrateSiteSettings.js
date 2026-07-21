const SITE_SETTINGS_KEY = "304-site-settings";
const OLD_LAUNCH_MESSAGE =
  "304 Peptides is preparing for launch. Research Use Only.";

try {
  const savedValue = window.localStorage.getItem(SITE_SETTINGS_KEY);

  if (savedValue) {
    const settings = JSON.parse(savedValue);
    let changed = false;

    if (!settings.storeStatus || settings.storeStatus === "coming-soon") {
      settings.storeStatus = "open";
      changed = true;
    }

    if (settings.announcementMessage === OLD_LAUNCH_MESSAGE) {
      settings.announcementEnabled = false;
      settings.announcementMessage =
        "For Research Use Only. Not intended for human consumption.";
      changed = true;
    }

    if (changed) {
      window.localStorage.setItem(
        SITE_SETTINGS_KEY,
        JSON.stringify(settings)
      );
    }
  }
} catch {
  // Safe storefront defaults remain active when storage is unavailable.
}