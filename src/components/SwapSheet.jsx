import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, BedDouble, Ruler, CalendarDays, Send, Check, X } from "lucide-react";

// ── Property selection card ───────────────────────────────────────────────────
function PropertyCard({ p, selected }) {
  return (
    <label
      htmlFor={`prop-${p.id}`}
      style={{
        position: "relative",
        display: "flex",
        cursor: "pointer",
        borderRadius: "12px",
        border: selected ? "2px solid #ADEBB3" : "2px solid #e5e7eb",
        backgroundColor: selected ? "rgba(173,235,179,0.1)" : "#ffffff",
        overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: selected ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
        userSelect: "none",
      }}
    >
      {/* Hidden radio — handles accessibility & RadioGroup state */}
      <RadioGroupItem value={p.id} id={`prop-${p.id}`} className="sr-only" />

      {/* Thumbnail */}
      <div style={{ width: "108px", flexShrink: 0, overflow: "hidden", backgroundColor: "#f3f4f6", minHeight: "88px" }}>
        {p.images?.[0] ? (
          <img
            src={p.images[0]}
            alt={p.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: "88px" }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "88px", backgroundColor: "#f3f4f6" }}>
            <MapPin style={{ width: "20px", height: "20px", color: "#9ca3af" }} />
          </div>
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, padding: "12px 44px 12px 16px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: "600", color: "#005B5B" }}>
          <MapPin style={{ width: "10px", height: "10px", flexShrink: 0 }} />
          {p.wilaya}
        </div>
        <p style={{ fontSize: "15px", fontWeight: "600", color: "#111827", lineHeight: "1.3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
          {p.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#6b7280" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <BedDouble style={{ width: "13px", height: "13px" }} />
            {p.rooms} ch.
          </span>
          {p.size && (
            <>
              <span style={{ width: "3px", height: "3px", borderRadius: "50%", backgroundColor: "#d1d5db", display: "inline-block" }} />
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <Ruler style={{ width: "13px", height: "13px" }} />
                {p.size} m²
              </span>
            </>
          )}
        </div>
      </div>

      {/* Check badge */}
      <div style={{ position: "absolute", top: "12px", right: "12px" }}>
        <div style={{
          width: "24px", height: "24px", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: selected ? "2px solid #8FD89A" : "2px solid #e5e7eb",
          backgroundColor: selected ? "#ADEBB3" : "#ffffff",
          transition: "all 0.15s",
        }}>
          <Check style={{ width: "13px", height: "13px", color: selected ? "#005B5B" : "transparent" }} strokeWidth={3} />
        </div>
      </div>
    </label>
  );
}

// ── SwapSheet ─────────────────────────────────────────────────────────────────
export default function SwapSheet({ listing, user, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = () => {
    setSelectedId("");
    setStartDate("");
    setEndDate("");
    setMessage("");
    setSubmitting(false);
    setSubmitted(false);
    setError(null);
  };

  useEffect(() => {
    if (!open || !user?.id) return;
    setLoadingListings(true);
    supabase
      .from("listings")
      .select("id, title, wilaya, rooms, size, images")
      .eq("user_id", user.id)
      .eq("is_for_exchange", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setMyListings(data || []);
        setLoadingListings(false);
      });
  }, [open, user?.id]);

  const hostName = listing?.profiles?.full_name || "le propriétaire";
  const hostInitials = hostName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const availRange = (() => {
    const from = listing?.available_from;
    const to = listing?.available_to;
    if (!from && !to) return null;
    const fmt = (s) =>
      new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    if (from && to) return `${fmt(from)} – ${fmt(to)}`;
    if (from) return `À partir du ${fmt(from)}`;
    return `Jusqu'au ${fmt(to)}`;
  })();

  const datesValid = !(startDate && endDate && new Date(endDate) < new Date(startDate));
  const canSubmit = !!selectedId && !submitting && datesValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.from("exchanges").insert({
      requester_id: user.id,
      listing_id: listing.id,
      receiver_id: listing.user_id,
      offered_house_id: selectedId,
      status: "pending",
      message: message.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    setSubmitting(false);
    if (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      return;
    }
    setSubmitted(true);
    onSuccess?.();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) resetForm();
      }}
    >
      {/* ── Trigger ── */}
      <SheetTrigger asChild>
        <button
          style={{
            padding: "10px 22px",
            borderRadius: "999px",
            background: "#0A3D3D",
            color: "#ffffff",
            border: "none",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "background 0.18s",
          }}
        >
          Demande d'échange
        </button>
      </SheetTrigger>

      {/* ── Panel ── */}
      <SheetContent
        side="right"
        showCloseButton={false}
        style={{
          backgroundColor: "#ffffff",
          borderLeft: "1px solid #e5e7eb",
          boxShadow: "-10px 0 15px -3px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "520px",
          height: "100%",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          overflowY: "auto",
        }}
      >
        {/* ── Header ── */}
        <SheetHeader
          style={{
            padding: "28px 28px 20px 28px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b7280", fontWeight: "600", margin: 0 }}>
              Nouvelle demande
            </p>
            <SheetTitle style={{ fontSize: "24px", fontWeight: "700", color: "#111827", letterSpacing: "-0.02em", lineHeight: "1.2" }}>
              Demander un échange
            </SheetTitle>
            <SheetDescription style={{ fontSize: "14px", color: "#6b7280", lineHeight: "1.5", marginTop: "2px" }}>
              Avec{" "}
              <span style={{ fontWeight: "500", color: "#111827" }}>{hostName}</span> pour{" "}
              <span style={{ fontWeight: "500", color: "#111827" }}>« {listing?.title} »</span>
              {listing?.wilaya ? ` à ${listing.wilaya}` : ""}.
            </SheetDescription>
          </div>

          {/* Close button */}
          <SheetClose asChild>
            <button
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: "4px",
              }}
            >
              <X style={{ width: "16px", height: "16px", color: "#374151" }} />
              <span className="sr-only">Fermer</span>
            </button>
          </SheetClose>
        </SheetHeader>

        {submitted ? (
          /* ── Success state ── */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", textAlign: "center", gap: "16px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#ADEBB3", border: "2px solid #8FD89A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check style={{ width: "28px", height: "28px", color: "#005B5B" }} strokeWidth={3} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", letterSpacing: "-0.01em", margin: 0 }}>Demande envoyée !</h3>
              <p style={{ fontSize: "14px", color: "#6b7280", maxWidth: "320px", lineHeight: "1.6", margin: 0 }}>
                <span style={{ fontWeight: "500", color: "#111827" }}>{hostName}</span> recevra votre demande d'échange et vous contactera si elle l'intéresse.
              </p>
            </div>
            <SheetClose asChild>
              <button
                style={{
                  marginTop: "8px",
                  padding: "10px 24px",
                  borderRadius: "999px",
                  backgroundColor: "#005B5B",
                  color: "#ADEBB3",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Fermer
              </button>
            </SheetClose>
          </div>
        ) : (
          <>
            {/* ── Scrollable body ── */}
            <ScrollArea style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "28px" }}>

                {/* Host availability chip */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", borderRadius: "12px", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", padding: "12px 16px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#005B5B", color: "#ADEBB3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "12px", border: "2px solid #ADEBB3", flexShrink: 0 }}>
                    {hostInitials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>Disponibilités</p>
                    <p style={{ fontSize: "14px", fontWeight: "500", color: "#111827", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                      {availRange ? (
                        <>
                          <CalendarDays style={{ width: "13px", height: "13px", color: "#005B5B", flexShrink: 0 }} />
                          {availRange}
                        </>
                      ) : (
                        <span style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "12px" }}>Non précisées</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Step 1 — select a property */}
                <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#005B5B", color: "#ADEBB3", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        1
                      </span>
                      <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>Votre bien à proposer</h3>
                    </div>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      {selectedId ? "1 sélectionné" : "Choisissez-en un"}
                    </span>
                  </div>

                  {loadingListings ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse" style={{ height: "88px", borderRadius: "12px", backgroundColor: "#f3f4f6" }} />
                      ))}
                    </div>
                  ) : myListings.length === 0 ? (
                    <div style={{ borderRadius: "12px", border: "2px dashed #e5e7eb", padding: "24px 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                        Vous n'avez pas d'annonce d'échange active.
                      </p>
                      <a
                        href="/add-listing"
                        style={{ fontSize: "14px", fontWeight: "600", color: "#005B5B", textDecoration: "underline", textUnderlineOffset: "2px" }}
                      >
                        Publier une annonce
                      </a>
                    </div>
                  ) : (
                    <RadioGroup
                      value={selectedId}
                      onValueChange={setSelectedId}
                      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                    >
                      {myListings.map((p) => (
                        <PropertyCard key={p.id} p={p} selected={selectedId === p.id} />
                      ))}
                    </RadioGroup>
                  )}
                </section>

                {/* Step 2 — date range */}
                <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#005B5B", color: "#ADEBB3", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        2
                      </span>
                      <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>Période souhaitée</h3>
                    </div>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Optionnel</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[
                      { label: "Du", value: startDate, set: setStartDate, min: new Date().toISOString().slice(0, 10), max: endDate || undefined },
                      { label: "Au", value: endDate, set: setEndDate, min: startDate || new Date().toISOString().slice(0, 10) },
                    ].map(({ label, value, set, min, max }) => (
                      <div key={label} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</span>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <CalendarDays style={{ position: "absolute", left: "11px", width: "13px", height: "13px", color: "#9ca3af", pointerEvents: "none", flexShrink: 0 }} />
                          <input
                            type="date"
                            value={value}
                            min={min}
                            max={max}
                            onChange={e => set(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "9px 12px 9px 32px",
                              borderRadius: "10px",
                              border: "1px solid #e5e7eb",
                              fontSize: "13px",
                              color: value ? "#111827" : "#9ca3af",
                              backgroundColor: "#ffffff",
                              fontFamily: "'Inter', sans-serif",
                              outline: "none",
                              boxSizing: "border-box",
                              cursor: "pointer",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {startDate && endDate && new Date(endDate) < new Date(startDate) && (
                    <p style={{ margin: 0, fontSize: "12px", color: "#dc2626" }}>La date de fin doit être après la date de début.</p>
                  )}
                </section>

                {/* Step 3 — message */}
                <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#005B5B", color: "#ADEBB3", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        3
                      </span>
                      <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>Message à l'hôte</h3>
                    </div>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Optionnel</span>
                  </div>

                  <div style={{ position: "relative" }}>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                      rows={5}
                      placeholder={`Bonjour${hostName !== "le propriétaire" ? " " + hostName.split(" ")[0] : ""}, votre bien à ${listing?.wilaya || "votre wilaya"} nous intéresse beaucoup…`}
                      style={{
                        resize: "none",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        padding: "12px 52px 12px 14px",
                        fontSize: "14px",
                        color: "#111827",
                        backgroundColor: "#ffffff",
                        width: "100%",
                        fontFamily: "'Inter', sans-serif",
                        lineHeight: "1.5",
                        boxSizing: "border-box",
                      }}
                    />
                    <span style={{ position: "absolute", bottom: "10px", right: "12px", fontSize: "11px", color: "#9ca3af", fontVariantNumeric: "tabular-nums", userSelect: "none" }}>
                      {message.length}/500
                    </span>
                  </div>
                </section>

                {error && (
                  <p style={{ fontSize: "14px", color: "#dc2626", backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "8px", padding: "12px 16px", margin: 0 }}>
                    {error}
                  </p>
                )}
              </div>
            </ScrollArea>

            {/* ── Footer ── */}
            <SheetFooter
              style={{
                padding: "20px 28px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexShrink: 0,
                marginTop: 0,
              }}
            >
              <SheetClose asChild>
                <button
                  style={{
                    padding: "9px 20px",
                    borderRadius: "999px",
                    backgroundColor: "transparent",
                    color: "#005B5B",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Annuler
                </button>
              </SheetClose>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  padding: "10px 22px",
                  borderRadius: "999px",
                  backgroundColor: canSubmit ? "#005B5B" : "#f3f4f6",
                  color: canSubmit ? "#ADEBB3" : "#9ca3af",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 0.18s",
                }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin" style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".25" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Envoi…
                  </>
                ) : (
                  <>
                    <Send style={{ width: "15px", height: "15px" }} />
                    Confirmer la demande
                  </>
                )}
              </button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
