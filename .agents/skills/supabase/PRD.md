# DarBelDar Product Requirements Document (PRD)

**Version:** 1.0 MVP
**Last Updated:** May 6, 2026
**Target Launch:** June 2, 2026

---

## 1. The Elevator Pitch (The "Why")

DarBelDar is Algeria's first verified home exchange and property sales
platform, enabling homeowners across all 69 wilayas to exchange homes
temporarily (avoiding hotel costs) or sell properties directly. We solve
the expensive accommodation problem for travelers, workers, and families
while monetizing empty homes through a freemium model: free users get
basic exchanges with minimal legal protection, premium users get
unlimited exchanges with deposits, cancellation insurance, and verified
contracts. Revenue streams include premium subscriptions (70%), property
sale commissions (20%), and service partnerships (10%).
**Target Users:** Algerian homeowners (ages 25-55) who travel
domestically for work, family visits, or vacation, plus property sellers
seeking local buyers.

---

## 2. Core User Flows (The "What")

### 2.1 Guest User (Browser) Flow

```
Landing Page â†’ Browse Listings (filtered by wilaya/type/rooms/dates)
â†“
Click listing card â†’ View ListingDetail (photos, description,
amenities, reviews, approximate map)
â†“
Prompted to create account â†’ Redirected to /register
```

**Restrictions:** Browsers CANNOT send exchange requests, message owners,
post properties, or save favorites. Browse-only mode.

---

### 2.2 Account Creation & Onboarding Flow

```
User clicks "S'inscrire" â†’ /register page
â†“
Chooses: Email/Password OR Google OAuth
â†“
IF email/password:
- Enters: email, password, full_name
- Supabase creates auth.users entry + triggers profile creation
- Auto-redirects to /dashboard
â†“
IF Google OAuth:
- Google popup â†’ OAuth flow
- Supabase extracts full_name from Google metadata
- Auto-creates profile â†’ redirects to /dashboard
â†“
First login: User sees empty dashboard with prompt to "Publier votre
premiÃ¨re annonce"
```

**Data Created:**

- `auth.users` (id, email, user_metadata.full_name)
- `profiles` (id, full_name, created_at, is_premium=false)

---

### 2.3 Post a Property Listing Flow

```
Dashboard â†’ Click "Publier une annonce" â†’ /add-listing
â†“
Fill form:
- Title (text, required)
- Description (textarea)
- Wilaya (dropdown, 69 options, required)
- City (text)
- Quartier (text) â€” PUBLIC, shown to all users
- Adresse complÃ¨te (text) â€” PRIVATE, never shown, stored for
contracts
- Nombre de chambres (number, required)
- Type: Radio buttons (Pour Ã©change | Pour vente | Les deux)
- IF "Pour vente" OR "Les deux" selected â†’ Show "Prix (DZD)" field
(required)
- Disponible Ã partir du / Jusqu'au (date pickers)
- Ã‰quipements: 12 checkboxes (Climatisation, Chauffage, Wifi, Citerne
d'eau, etc.)
- Photos: Drag-drop or click to upload (max 5 images, 10MB each)
â†“
Click "Soumettre pour vÃ©rification"
â†“
Backend:
1. Upload each photo to Supabase Storage bucket:
`listings/user_id/timestamp.ext`
2. Insert row into `listings` table with is_verified=false
3. Show success toast: "Votre annonce a Ã©tÃ© soumise et est en attente
de vÃ©rification"
â†“
Redirect to /profile â†’ User sees listing with "En attente" badge
```

**Validation Rules:**

- Title: max 100 chars
- Description: max 2000 chars
- Photos: PNG/JPG only, max 5, each <10MB
- Price: required if is_for_sale=true, must be > 0

---

### 2.4 Browse & Filter Listings Flow

```
User navigates to /browse
â†“
Page shows:
- Filter bar (Wilaya dropdown, Type, Chambres, Dates disponibles)
- Results count: "X logements trouvÃ©s"
- Grid of verified listings (3 columns)
â†“
User applies filters â†’ Client-side filtering (no page reload)
â†“
Click listing card â†’ Navigate to /listing/:id
```

**Display Rules:**

- ONLY show listings where `is_verified = true`
- Each card shows: photo, title, wilaya + quartier, rooms, dates, type
  badge (Ã‰change/Vente), price (if for sale)
- Empty state: "Aucun logement trouvÃ©. Essayez de modifier vos filtres."

---

### 2.5 View Listing Detail & Request Exchange Flow

```
/listing/:id loads
â†“
Page shows:
- Photo carousel (with left/right arrows)
- Title, location (wilaya + quartier ONLY, address hidden), rooms,
dates, type badge
- Tabs: Description | Ã‰quipements | Carte | Avis
- Sidebar: Owner avatar (initials), name, wilaya, "Membre depuis
[date]"
â†“
IF listing is_for_exchange:
Sidebar shows big purple button: "Demande d'Ã©change"
â†“
User clicks button (must be logged in, NOT the listing owner)
â†“
Backend INSERT into `exchanges`:
- requester_id = current user
- listing_id = current listing
- status = 'pending'
- created_at = now()
â†“
Show success message: "Demande envoyÃ©e avec succÃ¨s!"
â†“
Redirect to /profile?tab=exchanges (user sees their sent request)
IF listing is_for_sale:
Sidebar shows: "Prix: X DZD" + button "Contacter le vendeur" â†’ Opens
/messages
```

**Business Rules:**

- Users CANNOT request exchange on their own listings
- Users CAN request multiple exchanges on different listings
- Each request creates ONE row in `exchanges` table
- **[MVP ASSUMPTION]:** No calendar blocking â€” if dates overlap, users
  coordinate manually via messages

---

### 2.6 Manage Exchange Requests Flow (Property Owner)

```
Owner navigates to /profile â†’ "Mes Ã©changes" tab
â†“
Sees list of received exchange requests with status badges:
- "En attente" (yellow) â€” Requester waiting for response
- "AcceptÃ©" (green) â€” Exchange confirmed
- "RefusÃ©" (red) â€” Exchange declined
â†“
For each "En attente" request:
Owner sees: Requester's name, their property (if they listed one),
dates, message (if any)
Two buttons: "Accepter" | "Refuser"
â†“
Click "Accepter":
- UPDATE exchanges SET status='accepted' WHERE id=X
- **[MVP ASSUMPTION]:** No automatic contract generation yet â€” just
status change
- Owner and requester can now message each other
â†“
Click "Refuser":
- UPDATE exchanges SET status='refused' WHERE id=X
- Requester sees updated status in their profile
```

**MVP Constraints:**

- No calendar blocking after acceptance
- No automatic email/SMS notifications (user must manually check
  /profile)
- No deposit collection in MVP (coming in v2 for premium users)

---

### 2.7 Messaging Flow (Basic)

```
User clicks "Messages" in sidebar â†’ /messages
â†“
Left panel: List of conversations (grouped by sender/receiver pair)
Right panel: Chat interface
â†“
User selects conversation OR clicks "Nouveau message"
â†“
Type message â†’ Click send
â†“
Backend INSERT into `messages`:
- sender_id = current user
- receiver_id = selected user
- content = message text
- created_at = now()
â†“
**[MVP ASSUMPTION]:** Messages are NOT real-time â€” user must refresh to
see new messages. No Supabase subscriptions in MVP.
```

---

### 2.8 Leave a Review Flow

```
User navigates to /listing/:id (a property they've exchanged with)
â†“
Scrolls to "Avis" tab
â†“
IF user has completed exchange with this property (status='accepted'):
Show review form:
- Star rating selector (1-5 stars, required)
- Comment textarea (max 500 chars)
- "Publier l'avis" button
â†“
Click "Publier l'avis"
â†“
Backend INSERT into `reviews`:
- listing_id = current listing
- reviewer_id = current user
- rating = selected stars
- comment = text
- created_at = now()
â†“
Review appears immediately in "Avis" tab
â†“
**[MVP ASSUMPTION]:** Users can only review properties they've had
accepted exchanges with (not enforced in DB yet â€” honor system)
```

---

### 2.9 Admin Verification Flow

```
Admin logs in â†’ /admin dashboard
â†“
Sees table of listings where is_verified=false
â†“
For each listing:
- Shows: title, owner name, wilaya, photos, description
- Two buttons: "VÃ©rifier" | "Rejeter"
â†“
Click "VÃ©rifier":
- UPDATE listings SET is_verified=true WHERE id=X
- Listing now appears in /browse
â†“
Click "Rejeter":
- DELETE FROM listings WHERE id=X (hard delete in MVP)
- **[FUTURE]:** Add rejection reason + notification
```

**Admin Access Control:**

- Admins have `profiles.is_admin = true` (set manually in Supabase)
- Admin routes are protected: `if (!user.is_admin)
redirect('/dashboard')`
  **[FUTURE]:** Super Admin role for conflict resolution (if 2 admins
  disagree on verification)

---

## 3. High-Level Data Entities (The "Backbone")

### 3.1 Entity Relationship Diagram (Logical)

```
auth.users (Supabase managed)
â†“ 1:1
profiles
â†“ 1:many
listings
â†“ 1:many â†“ 1:many
exchanges reviews
```

---

### 3.2 Table Schemas

#### **profiles**

Extends `auth.users` with app-specific data. Created via trigger on
signup.

```sql
CREATE TABLE profiles (
id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
full_name text NOT NULL,
phone text,
wilaya text, -- User's home wilaya
quartier text, -- User's neighborhood
is_premium boolean DEFAULT false,
is_admin boolean DEFAULT false, -- Manually set for admin users
avatar_url text, -- Future: Supabase Storage path
created_at timestamp with time zone DEFAULT now()
);
```

**Relationships:**

- 1:1 with `auth.users` (same `id`)
- 1:many with `listings` (via `listings.user_id`)
- 1:many with `exchanges` (via `exchanges.requester_id`)
- 1:many with `reviews` (via `reviews.reviewer_id`)
  **RLS Policies:**
- Users can SELECT their own row
- Users can UPDATE their own row (phone, wilaya, quartier only)
- Public SELECT on basic fields (full_name, wilaya) for displaying owner
  info

---

#### **listings**

Stores property listings for exchange and/or sale.

```sql
CREATE TABLE listings (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
title text NOT NULL,
description text,
wilaya text NOT NULL, -- One of 69 Algerian wilayas
city text,
quartier text, -- PUBLIC: shown to users
address text, -- PRIVATE: full address, NEVER shown publicly, used for
contracts
rooms integer NOT NULL CHECK (rooms > 0),
images text[], -- Array of Supabase Storage URLs
is_for_exchange boolean DEFAULT true,
is_for_sale boolean DEFAULT false,
price numeric CHECK (price >= 0), -- Required if is_for_sale=true
available_from date,
available_to date,
amenities text[], -- e.g., ['Climatisation', 'Wifi', 'Piscine']
is_verified boolean DEFAULT false, -- Admin must verify before listing
appears in /browse
created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX idx_listings_verified ON listings(is_verified);
CREATE INDEX idx_listings_wilaya ON listings(wilaya);
CREATE INDEX idx_listings_user ON listings(user_id);
```

**Relationships:**

- many:1 with `profiles` (via `user_id`)
- 1:many with `exchanges` (via `exchanges.listing_id`)
- 1:many with `reviews` (via `reviews.listing_id`)
  **RLS Policies:**
- Public SELECT WHERE `is_verified = true` (browse page)
- Users can SELECT their own listings (even if not verified)
- Users can INSERT with `user_id = auth.uid()`
- Admins can UPDATE `is_verified` field
  **Amenities Enum (12 options):**

```
Climatisation, Chauffage, Wifi, Citerne d'eau, Chauffe-eau,
Groupe Ã©lectrogÃ¨ne, Parking/Garage, Jardin/Terrasse, Piscine,
Cuisine Ã©quipÃ©e, Machine Ã laver, Ascenseur
```

---

#### **exchanges**

Tracks exchange requests between users and listings.

```sql
CREATE TABLE exchanges (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
start_date date,
end_date date,
status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted',
'refused')),
message text, -- Optional message from requester to owner
created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX idx_exchanges_requester ON exchanges(requester_id);
CREATE INDEX idx_exchanges_listing ON exchanges(listing_id);
CREATE INDEX idx_exchanges_status ON exchanges(status);
```

**Relationships:**

- many:1 with `profiles` (via `requester_id`)
- many:1 with `listings` (via `listing_id`)
  **RLS Policies:**
- Users can SELECT WHERE `requester_id = auth.uid()` (see their sent
  requests)
- Users can SELECT WHERE `listing_id IN (SELECT id FROM listings WHERE
user_id = auth.uid())` (see received requests)
- Users can INSERT with `requester_id = auth.uid()`
- Users can UPDATE status ONLY if they own the listing
- Users can DELETE their own pending requests
  **Business Logic:**
- Status starts as `'pending'`
- Listing owner can change to `'accepted'` or `'refused'`
- **[MVP]:** No calendar blocking â€” multiple users can have accepted
  exchanges for overlapping dates (resolved manually)
- **[FUTURE v2]:** Add `deposit_amount`, `insurance_policy_id`,
  `contract_url` for premium users

---

#### **messages**

Stores direct messages between users.

```sql
CREATE TABLE messages (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
content text NOT NULL,
created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON messages(sender_id,
receiver_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
```

**Relationships:**

- many:1 with `profiles` (via `sender_id`)
- many:1 with `profiles` (via `receiver_id`)
  **RLS Policies:**
- Users can SELECT WHERE `sender_id = auth.uid() OR receiver_id =
auth.uid()`
- Users can INSERT with `sender_id = auth.uid()`
  **[MVP LIMITATION]:** No real-time updates. Users must refresh to see new
  messages.
  **[FUTURE v2]:** Add Supabase Realtime subscriptions for live chat.

---

#### **reviews**

Stores reviews and ratings for listings.

```sql
CREATE TABLE reviews (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
reviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
comment text,
created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX idx_reviews_listing ON reviews(listing_id);
```

**Relationships:**

- many:1 with `listings` (via `listing_id`)
- many:1 with `profiles` (via `reviewer_id`)
  **RLS Policies:**
- Public SELECT (anyone can read reviews)
- Users can INSERT with `reviewer_id = auth.uid()`
- **[MVP ASSUMPTION]:** No enforcement that reviewer must have completed
  exchange â€” honor system
  **[FUTURE v2]:** Add constraint: reviewer must have `status='accepted'`
  exchange with listing.

---

### 3.3 Storage Buckets

#### **listings** (public bucket)

Stores uploaded property photos.
**Path Structure:** `user_id/timestamp.ext`
**Example:** `a1b2c3d4-5678-90ab-cdef-1234567890ab/1714982400123.jpg`
**Access Policy:**

- Public read (anyone can view photos via public URL)
- Authenticated INSERT (logged-in users can upload)
  **Constraints:**
- Max 5 photos per listing
- Max 10MB per file
- Accepted formats: PNG, JPG, JPEG, WEBP

---

## 4. Out of Scope / MVP Guardrails (The "What NOT to Build")

### 4.1 Features Explicitly EXCLUDED from MVP (v1)

| Feature                                                      | Why Excluded                                    | Future Version |
| ------------------------------------------------------------ | ----------------------------------------------- | -------------- |
| **Real-time messaging**                                      | Requires Supabase subscriptions + complex       |
| state management. Manual refresh is acceptable for MVP.      | v2 (Week 3                                      |
| expansion)                                                   |
| **Calendar blocking**                                        | Complex logic for overlapping dates. MVP relies |
| on manual coordination between users.                        | v2                                              |
| **Security deposits**                                        | Requires payment gateway integration            |
| (Stripe/CCP), escrow logic, and legal framework.             | v2 (premium feature)                            |
| **Cancellation insurance**                                   | Requires third-party insurance API              |
| integration.                                                 | v3                                              |
| **Contract generation**                                      | Requires PDF generation library, legal          |
| templates, and storage. Status change is sufficient for MVP. | v2                                              |
| **Email/SMS notifications**                                  | Requires SendGrid/Twilio setup. Users           |
| check /profile manually.                                     | v2                                              |
| **Favorite/saved listings**                                  | Nice-to-have but not core to exchange           |
| flow.                                                        | v2                                              |
| **Advanced search (map view)**                               | Requires Google Maps API + complex              |
| filtering. Text-based filters are sufficient.                | v3                                              |
| **User reputation score**                                    | Requires complex algorithm. Star ratings in     |
| reviews are sufficient.                                      | v3                                              |
| **Multi-language support**                                   | MVP is French-only for Algerian market.         |
| v4 (if expanding to Maghreb)                                 |
| **Mobile app**                                               | MVP is web-only (responsive design).            | v5             |
| **Super Admin conflict resolution**                          | Admin role is sufficient for MVP.               |
| Super Admin is nice-to-have.                                 | v2                                              |
| **Property financing calculator**                            | Mentioned in notes but adds                     |
| complexity. Out of scope for exchange-focused MVP.           | v3 (if focusing on                              |
| sales)                                                       |

---

### 4.2 UI/UX Simplifications for MVP

- **maybe yes maybe no landing page animations** â€” Static landing page
  with clear CTAs. Motion effects deferred to post-launch polish.
- **No budget range slider** â€” Simple min/max number inputs for sale
  price filter.
- **No "Loi Carrez" or legal surface measurements** â€” Not enforced for
  MVP. User enters total surface in description.
- **No orientation filter (Sud/Est/Ouest)** â€” Not a field in database
  schema. Users mention in description if important.
- **No floor/elevator filter** â€” Out of scope for MVP. Users mention in
  description.

---

### 4.3 Technical Constraints for MVP

- **No Supabase Realtime subscriptions** â€” Polling or manual refresh
  only.
- **No file compression/resizing** â€” Users upload images as-is
  (validated at 10MB max). Server-side optimization deferred to v2.
- **No CDN for images** â€” Supabase Storage serves images directly.
  CloudFlare CDN deferred to v2.
- **No admin audit logs** â€” Admins can verify/reject, but no history
  tracking of who did what.
- **No soft deletes** â€” When admin rejects listing, it's hard-deleted
  from database.

---

### 4.4 Business Logic Simplifications

- **Free users = unlimited exchanges in MVP** â€” Freemium limits (e.g.,
  "3 exchanges max for free tier") deferred until payment gateway is
  integrated. For now, all users have unlimited exchanges.
- **No premium badge/verification** â€” `is_premium` field exists in
  database but not enforced or displayed in UI yet.
- **No commission collection on sales** â€” MVP tracks `is_for_sale`
  listings but no payment flow. Commission tracking deferred to v2.
- **No partnerships with travel/insurance companies** â€” Focus on core
  exchange/listing functionality only.

---

### 4.5 Edge Cases NOT Handled in MVP

- **User deletes account while having active exchanges** â€” Handled by
  `ON DELETE CASCADE` in database, but no graceful notification to other
  party.
- **Listing deleted while exchange is pending** â€” Cascade delete
  removes exchange. No error handling or notification.
- **Two users accept overlapping dates** â€” No conflict resolution.
  Users coordinate manually via messages.
- **Malicious users uploading inappropriate photos** â€” Admin
  verification catches this before listing goes live, but no automated
  content moderation.
- **Review spam / fake reviews** â€” No rate limiting or verification.
  Honor system for MVP.
- **User changes email/password** â€” Supabase handles auth changes, but
  no UI in /profile for this yet. Users must go to Supabase Auth UI.

---

### 4.6 Deployment & Ops Excluded from MVP Scope

- **No staging environment** â€” Deploy directly to production (Vercel).
- **No automated tests** â€” Manual testing only for MVP.
- **No error tracking (Sentry)** â€” Console logs only.
- **No analytics (Google Analytics, Mixpanel)** â€” Deferred to post-
  launch.
- **No custom domain** â€” Use Vercel's default `darbeldar.vercel.app`
  for MVP.

---

## Design System Reference (For AI Agent)

When building UI components, strictly adhere to these tokens:
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#0A3D3D` | Headings, trust elements, owner badges
|
| `--color-cta` | `#4B3FD8` | Buttons, links, interactive states |
| `--color-card-bg` | `#F7F7EC` | Card backgrounds, form containers |
| `--color-bg` | `#FFFFFF` | Page background |
| `--color-text` | `#1a1a1a` | Body text |
| `--color-text-muted` | `#717182` | Placeholders, secondary text |
| `--border-radius` | `1rem` | All rounded corners |
| `--font-heading` | `'Bricolage Grotesque', sans-serif` | Headings |
| `--font-body` | `'Inter', sans-serif` | Body text, UI |
**Button Styles:**

- Primary CTA: `bg-[#4B3FD8] text-white rounded-full px-6 py-3 font-
semibold hover:opacity-90`
- Secondary: `border-2 border-[#4B3FD8] text-[#4B3FD8] rounded-full px-6
py-3 font-semibold hover:bg-[#4B3FD8] hover:text-white`

---

---

## Final Notes for AI Agent

1. **Always use `auth.uid()` in RLS policies** â€” Never trust client-
   provided `user_id`.
2. **Never show `listings.address` field publicly** â€” Only wilaya +
   quartier.
3. **All dates in ISO 8601 format** â€” `YYYY-MM-DD` for consistency.
4. **All text in French** â€” UI strings, error messages, success toasts.
5. **Mobile-first responsive** â€” Tailwind breakpoints: `sm:` (640px),
   `md:` (768px), `lg:` (1024px).
6. **Image uploads MUST validate** â€” Check file size (<10MB), type
   (PNG/JPG), count (â‰¤5) on client before upload.
7. **Status values are CASE-SENSITIVE** â€” `'pending'` not `'Pending'`.

---

**End of PRD. This document is the single source of truth for MVP
development.**


