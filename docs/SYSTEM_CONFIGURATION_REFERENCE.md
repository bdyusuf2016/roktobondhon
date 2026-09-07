# RoktoBondhon — System Configuration Reference Manual
## Complete Schema & Parameters Reference

All runtime system configurations are managed via the centralized **`systemConfig`** engine.

---

## 1. Configuration Sections Summary

| Section Key | Description | Storage Scope |
|---|---|---|
| `organization` | Organization names, contact phones, emails, social URLs | Public / Core |
| `branding` | Theme colors, logos, favicons, header/footer subtitles | Public / Theme |
| `website` | Homepage banners, announcements, hotlines, copyright | Public / UI |
| `seo` | OpenGraph tags, JSON-LD meta, Twitter cards, social templates | Public / SEO |
| `gamification` | Donor tiers, milestone limits, points, signature authorization | Operations |
| `pwa` | Web manifest, service worker strategies, offline caching | Client / PWA |
| `bloodSystem` | Supported blood groups, Bangla display labels, sorting order | Core Medical |
| `matching` | Multi-criteria weights, search radius, strict eligibility | Algorithm |
| `donorEligibility` | Donation intervals, age limits, weight bounds, cooldowns | Health Policy |
| `bloodRequests` | Request bounds, required fields, verification requirements | Operations |
| `emergency` | Crisis mode, broadcast radius, auto-escalation timings | Emergency |
| `notifications` | SMS, Email, WhatsApp, Push channels & default providers | Dispatch |
| `privacy` | Public profile visibility, phone number masking, emergency badges | Security |
| `maintenance` | System maintenance mode switch, custom Bengali outage message | Infrastructure |
| `security` | Session timeouts, MFA requirements, maximum login retry attempts | Security RBAC |

---

## 2. Detailed Schema & Default Values

### 2.1 Matching Weights (`matching`)
```typescript
interface MatchingWeightsConfig {
  compatibilityWeight: 35;      // 0 - 100
  distanceWeight: 20;           // 0 - 100
  availabilityWeight: 20;       // 0 - 100
  eligibilityWeight: 10;        // 0 - 100
  verificationWeight: 5;        // 0 - 100
  reliabilityWeight: 5;         // 0 - 100
  responseRateWeight: 3;        // 0 - 100
  emergencyWeight: 2;           // 0 - 100
  maxSearchRadiusKm: 50;        // 1 - 500 km
  strictEligibility: true;      // boolean
}
```

### 2.2 Donor Eligibility (`donorEligibility`)
```typescript
interface DonorEligibilityConfig {
  minimumDonationIntervalDays: 90;        // 30 - 365 days
  femaleMinimumDonationIntervalDays: 120; // 30 - 365 days
  minimumAge: 18;                         // 16 - 30 years
  maximumAge: 65;                         // 50 - 80 years
  minimumWeightKg: 45;                    // 40 - 70 kg
  temporaryDeferralEnabled: true;         // boolean
  requireVerification: false;             // boolean
  requireAvailability: true;              // boolean
}
```

### 2.3 Emergency Settings (`emergency`)
```typescript
interface EmergencySettingsConfig {
  emergencyMode: false;                   // Crisis switch
  emergencyPriority: 1;                   // Priority multiplier
  broadcastEnabled: true;                 // Enable WhatsApp/Push
  broadcastRadiusKm: 25;                  // Radius in km
  repeatNotification: true;               // Retry unanswered calls
  maxNotificationsPerRequest: 10;         // Max notifications cap
  escalationEnabled: true;                // Auto-escalation
  escalationAfterMinutes: 30;             // Escalation trigger delay
  autoExpireAfterHours: 24;               // Auto expiration
}
```

### 2.4 PWA & Offline Engine (`pwa`)
```typescript
interface PwaSettingsConfig {
  appName: "RoktoBondhon";
  appNameBn: "রক্তবন্ধন (RoktoBondon) - রক্তদান প্ল্যাটফর্ম";
  shortName: "RoktoBondon";
  shortNameBn: "রক্তবন্ধন";
  themeColor: "#dc2626";
  backgroundColor: "#ffffff";
  displayMode: "standalone";
  cacheStrategy: "stale-while-revalidate";
  offlineCaching: true;
  backgroundSyncEnabled: true;
  offlineEmergencyDirectory: true;
  installBannerEnabled: true;
  appVersion: "1.0.0";
}
```
