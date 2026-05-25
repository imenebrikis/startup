import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Upload, X, Wind, Thermometer, Wifi, Droplets, Flame, Zap,
  Car, Trees, Waves, UtensilsCrossed, WashingMachine, ArrowUpDown,
  ChevronDown, ChevronLeft, ChevronRight, Check,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { supabase } from "../lib/supabase";
import LocationPicker from "../components/LocationPicker";

const WILAYAS = [
  "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar",
  "Blida","Bouira","Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger",
  "Djelfa","Jijel","Sétif","Saïda","Skikda","Sidi Bel Abbès","Annaba","Guelma",
  "Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla","Oran","El Bayadh",
  "Illizi","Bordj Bou Arreridj","Boumerdès","El Tarf","Tindouf","Tissemsilt","El Oued",
  "Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent",
  "Ghardaïa","Relizane","Timimoun","Bordj Badji Mokhtar","Ouled Djellal","Béni Abbès",
  "In Salah","In Guezzam","Touggourt","Djanet","El M'Ghair","El Meniaa","Aflou","Barika",
  "Ksar Chellala","Messaad","Aïn Oussera","Bou Saâda","El Abiodh Sidi Cheikh",
  "El Kantara","Bir El Ater","Ksar El Boukhari","El Aricha",
];

const AMENITIES = [
  { name: "Climatisation",      Icon: Wind },
  { name: "Chauffage",          Icon: Thermometer },
  { name: "Wifi",               Icon: Wifi },
  { name: "Citerne d'eau",      Icon: Droplets },
  { name: "Chauffe-eau",        Icon: Flame },
  { name: "Groupe électrogène", Icon: Zap },
  { name: "Parking / Garage",   Icon: Car },
  { name: "Jardin / Terrasse",  Icon: Trees },
  { name: "Piscine",            Icon: Waves },
  { name: "Cuisine équipée",    Icon: UtensilsCrossed },
  { name: "Machine à laver",    Icon: WashingMachine },
  { name: "Ascenseur",          Icon: ArrowUpDown },
];

const RULES_PILLS = [
  "Non-fumeur","Fumeur","Pas d'animaux","Animaux acceptés",
  "Pas de fêtes","Familles uniquement","Livret de famille",
  "Pas d'alcool","Femmes uniquement","Heures de silence",
];

const PROPERTY_TYPES = [
  { value: "appart",    label: "Appartement" },
  { value: "villa",     label: "Villa" },
  { value: "penthouse", label: "Penthouse" },
  { value: "studio",    label: "Studio" },
];

const STEP_TITLES = [
  "Commençons par le type d'annonce",
  "Présentez votre logement",
  "Où se trouve votre logement ?",
  "Décrivez le bien",
  "Quels équipements sont disponibles ?",
  "Vos règles de la maison",
  "Quand est-ce disponible ?",
  "Où voulez-vous aller ?",
  "Place aux photos !",
];

const STEP_ILLOS = [
  <path key="1" d="M7 7h11l-3-3M17 17H6l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  <><path key="2a" d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path key="2b" d="m14 6 4 4M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  <><path key="3a" d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" stroke="currentColor" strokeWidth="1.6" fill="none" /><circle key="3b" cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" fill="none" /></>,
  <><path key="4a" d="M3 11 12 4l9 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /><path key="4b" d="M5 10v10h14V10M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /></>,
  <path key="5" d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 0 0 5.6-5.6l-2.5 2.5-2-2 2.5-2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />,
  <><rect key="6a" x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" /><path key="6b" d="M9 4h6v3H9zM9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /></>,
  <><rect key="7a" x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" /><path key="7b" d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /></>,
  <><circle key="8a" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="none" /><path key="8b" d="M3 12h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /><path key="8c" d="M12 3a13 13 0 0 1 0 18" stroke="currentColor" strokeWidth="1.6" fill="none" /><path key="8d" d="M12 3a13 13 0 0 0 0 18" stroke="currentColor" strokeWidth="1.6" fill="none" /></>,
  <><rect key="9a" x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" /><circle key="9b" cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" fill="none" /><path key="9c" d="M8 6l1.5-2h5L16 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /></>,
];

const inp = {
  width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #E5DFCE",
  fontSize: 14.5, color: "#0F2A2A", background: "#FFFFFF", outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
};

export default function AddListing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const fileInputRef = useRef(null);
  const wilayaInputRef = useRef(null);

  // Wizard
  const [step, setStep] = useState(1);
  const TOTAL = 9;

  // Auth
  const [userInitials, setUserInitials] = useState("?");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [city, setCity] = useState("");
  const [quartier, setQuartier] = useState("");
  const [rooms, setRooms] = useState("");
  const [size, setSize] = useState("");
  const [floor, setFloor] = useState("");
  const [houseRules, setHouseRules] = useState("");
  const [selectedRules, setSelectedRules] = useState([]);
  const [type, setType] = useState("exchange");
  const [price, setPrice] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [mapPin, setMapPin] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [destinationWilayas, setDestinationWilayas] = useState([]);
  const [anyWilaya, setAnyWilaya] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState("");
  const [destDropdownOpen, setDestDropdownOpen] = useState(false);
  const [destKbIdx, setDestKbIdx] = useState(-1);

  // Submit state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [stepError, setStepError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/"); return; }
      const fn = user.user_metadata?.full_name;
      setUserInitials(fn ? fn.split(" ").map((n) => n[0]).join("").toUpperCase() : user.email?.[0].toUpperCase() || "?");
    });
  }, [navigate]);

  useEffect(() => {
    if (!id) return;
    supabase.from("listings").select("*").eq("id", id).single().then(({ data }) => {
      if (!data) return;
      setTitle(data.title || "");
      setDescription(data.description || "");
      setWilaya(data.wilaya || "");
      setCity(data.city || "");
      setQuartier(data.quartier || "");
      setRooms(data.rooms?.toString() || "");
      setSize(data.size?.toString() || "");
      setFloor(data.floor != null ? data.floor.toString() : "");
      setHouseRules(data.house_rules || "");
      setAmenities(data.amenities || []);
      if (data.is_for_exchange && data.is_for_sale) setType("both");
      else if (data.is_for_sale) setType("sale");
      else setType("exchange");
      setPrice(data.price?.toString() || "");
      setAvailableFrom(data.available_from || "");
      setAvailableTo(data.available_to || "");
      setExistingImages(data.images || []);
      setPropertyType(data.property_type || "");
      if (data.latitude != null) setLatitude(Number(data.latitude));
      if (data.longitude != null) setLongitude(Number(data.longitude));
      const rawDest = data.destination_wilayas;
      setDestinationWilayas(
        typeof rawDest === "string"
          ? rawDest.split(",").map((w) => w.trim()).filter((w) => w && isNaN(w))
          : Array.isArray(rawDest) ? rawDest : []
      );
      setAnyWilaya(data.any_wilaya || false);
    });
  }, [id]);

  const handleFiles = (files) => {
    const slots = 5 - existingImages.length - photos.length;
    const accepted = Array.from(files).slice(0, slots);
    if (accepted.length === 0) return;
    const newPhotos = [...photos, ...accepted];
    setPhotos(newPhotos);
    setPreviews(newPhotos.map((f) => URL.createObjectURL(f)));
  };

  const removePhoto = (index) => {
    if (index < existingImages.length) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      const ni = index - existingImages.length;
      const updated = photos.filter((_, i) => i !== ni);
      setPhotos(updated);
      setPreviews(updated.map((f) => URL.createObjectURL(f)));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { navigate("/"); return; }

      const imageUrls = [];
      for (const photo of photos) {
        const ext = photo.name.split(".").pop();
        const path = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("listings").upload(path, photo, { contentType: photo.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("listings").getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      const allRules = [...selectedRules, ...(houseRules ? [houseRules] : [])].join("\n") || null;
      const payload = {
        title, description, wilaya, city, quartier,
        rooms: parseInt(rooms) || null,
        size: size ? parseInt(size) : null,
        floor: floor !== "" ? parseInt(floor) : null,
        property_type: propertyType || null,
        house_rules: type === "exchange" || type === "both" ? allRules : null,
        is_for_exchange: type === "exchange" || type === "both",
        is_for_sale: type === "sale" || type === "both",
        price: type === "sale" || type === "both" ? parseFloat(price) || null : null,
        available_from: availableFrom || null,
        available_to: availableTo || null,
        images: [...existingImages, ...imageUrls],
        amenities,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        destination_wilayas: anyWilaya ? [] : destinationWilayas,
        any_wilaya: anyWilaya,
        is_verified: false,
      };

      if (isEdit) {
        const { error: e } = await supabase.from("listings").update({ ...payload, status: "pending" }).eq("id", id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("listings").insert({ ...payload, user_id: currentUser.id });
        if (e) throw e;
      }

      setSuccess(true);
      setTimeout(() => navigate(isEdit ? "/profile" : "/dashboard"), 2000);
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = (r) => setSelectedRules((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r]);
  const toggleAmenity = (n) => setAmenities((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]);
  const toggleDestWilaya = (w) => setDestinationWilayas((p) => p.includes(w) ? p.filter((x) => x !== w) : [...p, w]);
  const destOptions = WILAYAS.filter((w) => w.toLowerCase().includes(wilayaSearch.toLowerCase()));
  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMapPin({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const showPrice = type === "sale" || type === "both";
  const today = new Date().toISOString().split("T")[0];

  function getStepError() {
    switch (step) {
      case 2:
        if (!title.trim()) return "Veuillez saisir un titre pour votre annonce.";
        break;
      case 3:
        if (!wilaya) return "Veuillez sélectionner une wilaya.";
        if (!city.trim()) return "Veuillez saisir le nom de la ville.";
        if (!quartier.trim()) return "Veuillez saisir le quartier / commune.";
        break;
      case 4:
        if (!propertyType) return "Veuillez choisir le type de logement.";
        if (!rooms) return "Veuillez indiquer le nombre de chambres.";
        if (propertyType === "appart" && floor === "") return "Veuillez indiquer l'étage (0 pour rez-de-chaussée).";
        if (type === "sale" && !size) return "Veuillez indiquer la superficie.";
        if (type === "sale" && !price) return "Veuillez indiquer le prix de vente.";
        break;
      case 5:
        if (amenities.length === 0) return "Veuillez sélectionner au moins un équipement.";
        break;
      case 7:
        if (!availableFrom && !availableTo)
          return "Veuillez indiquer au moins une date de disponibilité.";
        break;
      case 8:
        if (!anyWilaya && destinationWilayas.length === 0)
          return "Veuillez sélectionner au moins une wilaya, ou activer « Toutes les wilayas ».";
        break;
      case 9:
        if (existingImages.length + photos.length < 3)
          return "Veuillez ajouter au moins 3 photos avant de soumettre.";
        break;
      default:
        break;
    }
    return "";
  }

  function handleNext() {
    const err = getStepError();
    if (err) { setStepError(err); return; }
    setStepError("");
    setStep((s) => Math.min(TOTAL, s + 1));
  }

  function handleSubmitValidated() {
    const err = getStepError();
    if (err) { setStepError(err); return; }
    setStepError("");
    handleSubmit();
  }

  // ── Styles ──
  const tile = (on) => ({
    background: on ? "#005B5B" : "#FFFFFF", border: `1.5px solid ${on ? "#005B5B" : "#E5DFCE"}`,
    borderRadius: 18, padding: "22px 14px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 10, color: on ? "#ADEBB3" : "#005B5B", fontWeight: 600,
    fontSize: 14.5, cursor: "pointer", textAlign: "center", transition: "all 0.15s",
  });
  const chip = (on) => ({
    background: on ? "#005B5B" : "#FFFFFF", border: `1px solid ${on ? "#005B5B" : "#E5DFCE"}`,
    borderRadius: 14, padding: "14px 10px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8, color: on ? "#ADEBB3" : "#005B5B", fontSize: 13,
    fontWeight: 500, cursor: "pointer", textAlign: "center", transition: "all 0.15s",
  });
  const pill = (on) => ({
    padding: "9px 16px", borderRadius: 999, background: on ? "#005B5B" : "#FFFFFF",
    border: `1px solid ${on ? "#005B5B" : "#E5DFCE"}`, color: on ? "#ADEBB3" : "#005B5B",
    fontSize: 13.5, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F3EEE0", fontFamily: "'Geist Variable', ui-sans-serif, sans-serif" }}>
      {/* Top bar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: "1px solid #E5DFCE", background: "#F3EEE0" }}>
        <Link to="/dashboard" style={{ fontWeight: 700, letterSpacing: "-0.01em", fontSize: 19, color: "#005B5B", textDecoration: "none" }}>
          DarBelDar
        </Link>
        <Link to={isEdit ? "/profile" : "/dashboard"} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#005B5B", fontSize: 13.5, fontWeight: 500, padding: "8px 12px", borderRadius: 999, textDecoration: "none" }}>
          <X style={{ width: 14, height: 14 }} />
          Quitter
        </Link>
      </header>

      <div style={{ maxWidth: 1200, margin: "32px auto", padding: "0 24px" }}>
        {/* Success / Error banners */}
        {success && (
          <div style={{ background: "#D6EEDD", border: "1px solid #ADEBB3", borderRadius: 14, padding: "16px 20px", marginBottom: 24, color: "#1F7A4F", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}>
            <Check style={{ width: 18, height: 18 }} />
            {isEdit ? "Annonce mise à jour — en attente de re-vérification !" : "Annonce soumise — en attente de vérification !"}
          </div>
        )}
        {error && (
          <div style={{ background: "#F7DCD8", border: "1px solid #C0392B", borderRadius: 14, padding: "16px 20px", marginBottom: 24, color: "#C0392B", fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Wizard card */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 26, overflow: "hidden", display: "grid", gridTemplateColumns: "5fr 7fr", minHeight: 620 }}>

          {/* Left: illustration */}
          <aside style={{ background: "#EEF3DF", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 32, position: "relative" }}>
            <div style={{ fontSize: 14, color: "#005B5B", fontWeight: 600, letterSpacing: "0.02em" }}>
              DarBelDar{" "}
              <span style={{ background: "#ADEBB3", color: "#005B5B", padding: "2px 8px", borderRadius: 6, marginLeft: 6, fontSize: 11, letterSpacing: "0.04em" }}>
                Annonce
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 24, margin: "auto 0" }}>
              <div style={{ width: 160, height: 160, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#005B5B", border: "1px solid #E5DFCE" }}>
                <svg viewBox="0 0 24 24" style={{ width: 84, height: 84 }}>
                  {STEP_ILLOS[step - 1]}
                </svg>
              </div>
              <h2 style={{ fontSize: 30, lineHeight: 1.15, letterSpacing: "-0.02em", fontWeight: 700, color: "#0F2A2A", margin: 0, maxWidth: 320 }}>
                {STEP_TITLES[step - 1]}
              </h2>
              <div style={{ fontSize: 13, color: "#6E7B79", fontWeight: 500 }}>
                Étape {String(step).padStart(2, "0")} sur {String(TOTAL).padStart(2, "0")}
              </div>
              <div style={{ display: "flex", gap: 6, width: 280, maxWidth: "80%" }}>
                {Array.from({ length: TOTAL }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < step - 1 ? "#8FD89A" : i === step - 1 ? "#005B5B" : "#D6CDB4", transition: "background 0.3s" }} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "#6E7B79" }}>
              <span>© 2026 DarBelDar. Tous droits réservés.</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#005B5B", fontWeight: 500 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6C19 16.5 12 21 12 21z" /></svg>
                Made in Algeria
              </span>
            </div>
          </aside>

          {/* Right: form */}
          <section style={{ background: "#FAF6E9", padding: "40px 44px 28px", display: "flex", flexDirection: "column" }}>

            {/* Step 1 — Type d'annonce */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F2A2A" }}>Type d'annonce</h2>
                  <span style={{ fontSize: 12.5, color: "#6E7B79" }}>Choisissez une option</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    { val: "exchange", label: "Pour échange",  sub: "Troquez votre logement",  icon: <><path d="M7 7h11l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" /><path d="M17 17H6l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" /></> },
                    { val: "sale",     label: "Pour vente",    sub: "Cédez votre bien",         icon: <><path d="M3 10h18M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M5 10v9h14v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" /><circle cx="12" cy="15" r="2" stroke="currentColor" strokeWidth="1.8" fill="none" /></> },
                    { val: "both",     label: "Les deux",      sub: "Échange ou vente",         icon: <><path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" fill="none" /></> },
                  ].map(({ val, label, sub, icon }) => {
                    const on = type === val;
                    return (
                      <button key={val} type="button" onClick={() => setType(val)} style={tile(on)}>
                        <span style={{ width: 46, height: 46, borderRadius: 14, background: on ? "#ADEBB3" : "#E4F6E6", display: "flex", alignItems: "center", justifyContent: "center", color: "#005B5B", transition: "background 0.15s" }}>
                          <svg width="24" height="24" viewBox="0 0 24 24">{icon}</svg>
                        </span>
                        {label}
                        <span style={{ fontSize: 12, color: on ? "#8FD89A" : "#6E7B79", fontWeight: 500 }}>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2 — Titre + description */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F2A2A" }}>Présentez votre logement</h2>
                  <span style={{ fontSize: 12.5, color: "#6E7B79" }}>Soyez clair et accrocheur</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Titre de l'annonce <span style={{ color: "#004848" }}>*</span></label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Appartement moderne au centre-ville" style={inp}
                    onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre propriété : ambiance, voisinage, points forts…" rows={5}
                    style={{ ...inp, resize: "vertical", lineHeight: 1.5, minHeight: 108 }}
                    onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                  <p style={{ fontSize: 12, color: "#6E7B79", margin: 0 }}>Plus la description est détaillée, plus elle attire de candidats sérieux.</p>
                </div>
              </div>
            )}

            {/* Step 3 — Localisation */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F2A2A" }}>Localisation</h2>
                  <span style={{ fontSize: 12.5, color: "#6E7B79" }}>Placez un repère approximatif</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Wilaya <span style={{ color: "#004848" }}>*</span></label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button style={{ ...inp, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", color: wilaya ? "#0F2A2A" : "#B0B5B3", paddingRight: 38, position: "relative" }}>
                          {wilaya ? `${String(WILAYAS.indexOf(wilaya) + 1).padStart(2, "0")} — ${wilaya}` : "Sélectionnez…"}
                          <ChevronDown style={{ width: 14, height: 14, flexShrink: 0 }} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent style={{ backgroundColor: "#fff", border: "1px solid #E5DFCE", borderRadius: 12, padding: 6, minWidth: 240, maxHeight: 260, overflowY: "auto", scrollbarWidth: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 9999 }}>
                        <DropdownMenuRadioGroup value={wilaya} onValueChange={setWilaya}>
                          <DropdownMenuRadioItem value="" style={{ padding: "9px 36px 9px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#B0B5B3", fontFamily: "inherit" }}>Sélectionnez…</DropdownMenuRadioItem>
                          {WILAYAS.map((w, i) => (
                            <DropdownMenuRadioItem key={w} value={w} style={{ padding: "9px 36px 9px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#0F2A2A", backgroundColor: wilaya === w ? "#F3EEE0" : "transparent", fontFamily: "inherit" }}>
                              {String(i + 1).padStart(2, "0")} — {w}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Ville</label>
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Nom de la ville" style={inp}
                      onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Quartier / Commune</label>
                  <input value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="ex: Bir Mourad Raïs, Hydra, Bab Ezzouar…" style={inp}
                    onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                  <p style={{ fontSize: 12, color: "#6E7B79", margin: 0 }}>Visible publiquement — votre adresse exacte ne l'est jamais.</p>
                </div>
                {/* Map */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Emplacement approximatif sur la carte</label>
                  <LocationPicker
                    lat={latitude}
                    lng={longitude}
                    onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
                  />
                </div>
              </div>
            )}

            {/* Step 4 — Caractéristiques */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F2A2A" }}>Caractéristiques</h2>
                  <span style={{ fontSize: 12.5, color: "#6E7B79" }}>Type, chambres et superficie</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Type de logement <span style={{ color: "#004848" }}>*</span></label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    {PROPERTY_TYPES.map(({ value, label }) => {
                      const on = propertyType === value;
                      return (
                        <button key={value} type="button" onClick={() => setPropertyType(value)} style={tile(on)}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Nombre de chambres <span style={{ color: "#004848" }}>*</span></label>
                    <input type="number" min="0" value={rooms} onChange={(e) => setRooms(e.target.value)} placeholder="ex: 3" style={inp}
                      onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Superficie (m²)</label>
                    <input type="number" min="0" value={size} onChange={(e) => setSize(e.target.value)} placeholder="ex: 85" style={inp}
                      onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Étage</label>
                    <input type="number" min="0" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="0 = RDC" style={inp}
                      onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                  </div>
                </div>
                {showPrice && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Prix (DZD) <span style={{ color: "#004848" }}>*</span></label>
                    <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="ex: 15 000 000" style={inp}
                      onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                  </div>
                )}
              </div>
            )}

            {/* Step 5 — Équipements */}
            {step === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F2A2A" }}>Équipements</h2>
                  <span style={{ fontSize: 12.5, color: "#6E7B79" }}>Sélectionnez tout ce qui s'applique</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {AMENITIES.map(({ name, Icon }) => {
                    const on = amenities.includes(name);
                    return (
                      <button key={name} type="button" onClick={() => toggleAmenity(name)} style={chip(on)}>
                        <Icon style={{ width: 18, height: 18 }} />
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 6 — Règles */}
            {step === 6 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F2A2A" }}>Règles de la maison</h2>
                  <span style={{ fontSize: 12.5, color: "#6E7B79" }}>Plusieurs choix possibles</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {RULES_PILLS.map((r) => (
                    <button key={r} type="button" onClick={() => toggleRule(r)} style={pill(selectedRules.includes(r))}>{r}</button>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Règles supplémentaires</label>
                  <textarea value={houseRules} onChange={(e) => setHouseRules(e.target.value)} placeholder="Ajoutez vos propres règles, une par ligne…" rows={4}
                    style={{ ...inp, resize: "vertical", lineHeight: 1.5, minHeight: 96 }}
                    onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                  <p style={{ fontSize: 12, color: "#6E7B79", margin: 0 }}>Visible par les candidats à l'échange ou à la vente.</p>
                </div>
              </div>
            )}

            {/* Step 7 — Disponibilité */}
            {step === 7 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F2A2A" }}>Disponibilité</h2>
                  <span style={{ fontSize: 12.5, color: "#6E7B79" }}>Période d'échange ou de vente</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Disponible à partir du <span style={{ color: "#004848" }}>*</span></label>
                    <input type="date" value={availableFrom} min={today} onChange={(e) => setAvailableFrom(e.target.value)} style={inp}
                      onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>Jusqu'au</label>
                    <input type="date" value={availableTo} min={availableFrom || today} onChange={(e) => setAvailableTo(e.target.value)} style={inp}
                      onFocus={(e) => { e.target.style.borderColor = "#005B5B"; e.target.style.boxShadow = "0 0 0 3px rgba(0,91,91,0.12)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#E5DFCE"; e.target.style.boxShadow = "none"; }} />
                  </div>
                </div>
                <div style={{ background: "#E4F6E6", border: "1px solid #D5E9D8", borderRadius: 12, padding: "12px 14px", color: "#005B5B", fontSize: 13 }}>
                  Les dates passées sont désactivées. Laissez "Jusqu'au" vide si votre logement est disponible sans limite de date.
                </div>
              </div>
            )}

            {/* Step 8 — Destinations souhaitées */}
            {step === 8 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F2A2A" }}>Destinations souhaitées</h2>
                  <span style={{ fontSize: 12.5, color: "#6E7B79" }}>Où voulez-vous aller ?</span>
                </div>

                {/* "Open to all wilayas" toggle */}
                <div
                  onClick={() => { setAnyWilaya((v) => !v); setDestDropdownOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                    padding: "14px 18px", borderRadius: 14, cursor: "pointer",
                    background: anyWilaya ? "#E4F6E6" : "#FFFFFF",
                    border: `1px solid ${anyWilaya ? "#8FD89A" : "#E5DFCE"}`,
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "#0F2A2A" }}>Ouvert à toutes les wilayas</div>
                    <div style={{ fontSize: 12.5, color: "#6E7B79", marginTop: 2 }}>Recevez des propositions de partout en Algérie</div>
                  </div>
                  {/* Toggle switch */}
                  <div style={{ width: 46, height: 26, borderRadius: 999, flexShrink: 0, position: "relative", background: anyWilaya ? "#005B5B" : "#E5DFCE", transition: "background 0.2s" }}>
                    <div style={{
                      position: "absolute", top: 3, left: anyWilaya ? 23 : 3,
                      width: 20, height: 20, borderRadius: "50%",
                      background: anyWilaya ? "#ADEBB3" : "#FFFFFF",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                      transition: "left 0.2s, background 0.2s",
                    }} />
                  </div>
                </div>

                {/* Wilaya tag-input */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: anyWilaya ? 0.45 : 1, pointerEvents: anyWilaya ? "none" : "auto", filter: anyWilaya ? "saturate(0.7)" : "none", transition: "opacity 0.15s" }}>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: "#005B5B" }}>
                    Wilayas souhaitées <span style={{ color: "#004848" }}>*</span>
                  </label>
                  <div
                    onClick={() => wilayaInputRef.current?.focus()}
                    style={{
                      position: "relative", background: "#FFFFFF", borderRadius: 12,
                      border: `1px solid ${destDropdownOpen ? "#005B5B" : "#E5DFCE"}`,
                      boxShadow: destDropdownOpen ? "0 0 0 3px rgba(0,91,91,0.12)" : "none",
                      padding: "8px 10px", display: "flex", flexWrap: "wrap",
                      alignItems: "center", gap: 6, minHeight: 48, cursor: "text",
                      boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  >
                    {/* Selected tags */}
                    {(Array.isArray(destinationWilayas) ? destinationWilayas : []).map((w) => (
                      <span key={w} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#005B5B", color: "#ADEBB3", padding: "5px 6px 5px 11px", borderRadius: 999, fontSize: 13, fontWeight: 500 }}>
                        {w}
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => toggleDestWilaya(w)}
                          style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: "#ADEBB3", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                        >
                          <X style={{ width: 10, height: 10 }} />
                        </button>
                      </span>
                    ))}
                    {/* Search input */}
                    <input
                      ref={wilayaInputRef}
                      value={wilayaSearch}
                      onChange={(e) => { setWilayaSearch(e.target.value); setDestDropdownOpen(true); setDestKbIdx(-1); }}
                      onFocus={() => setDestDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setDestDropdownOpen(false), 150)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") { e.preventDefault(); setDestKbIdx((i) => Math.min(destOptions.length - 1, i + 1)); }
                        else if (e.key === "ArrowUp") { e.preventDefault(); setDestKbIdx((i) => Math.max(0, i - 1)); }
                        else if (e.key === "Enter") {
                          e.preventDefault();
                          const target = destOptions[destKbIdx] ?? destOptions[0];
                          if (target) { toggleDestWilaya(target); setWilayaSearch(""); setDestKbIdx(-1); }
                        } else if (e.key === "Backspace" && !wilayaSearch && Array.isArray(destinationWilayas) && destinationWilayas.length) {
                          setDestinationWilayas((p) => Array.isArray(p) ? p.slice(0, -1) : []);
                        } else if (e.key === "Escape") {
                          setDestDropdownOpen(false);
                        }
                      }}
                      placeholder={destinationWilayas.length === 0 ? "Tapez pour rechercher une wilaya…" : ""}
                      style={{ flex: 1, minWidth: 120, border: 0, outline: 0, background: "transparent", padding: "6px 4px", fontFamily: "inherit", color: "#0F2A2A", fontSize: 14 }}
                    />
                    {/* Dropdown */}
                    {destDropdownOpen && (
                      <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", background: "#FFFFFF", border: "1px solid #E5DFCE", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,91,91,0.08)", maxHeight: 220, overflowY: "auto", scrollbarWidth: "none", zIndex: 100 }}>
                        {destOptions.length === 0 ? (
                          <div style={{ padding: "14px", fontSize: 13, color: "#6E7B79", textAlign: "center" }}>Aucune wilaya trouvée</div>
                        ) : destOptions.slice(0, 60).map((w, i) => (
                          <button
                            key={w}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              toggleDestWilaya(w);
                              setWilayaSearch("");
                              setDestKbIdx(-1);
                              wilayaInputRef.current?.focus();
                            }}
                            onMouseEnter={() => setDestKbIdx(i)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              width: "100%", padding: "10px 14px", textAlign: "left",
                              border: "none", borderBottom: i < Math.min(destOptions.length - 1, 59) ? "1px solid #F3EFE0" : "none",
                              background: i === destKbIdx ? "#E4F6E6" : "none",
                              cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: "#0F2A2A",
                            }}
                          >
                            <span>{w}</span>
                            {destinationWilayas.includes(w) && <Check style={{ width: 13, height: 13, color: "#005B5B", flexShrink: 0 }} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "#6E7B79", margin: 0 }}>Sélectionnez une ou plusieurs wilayas où vous souhaitez échanger.</p>
                </div>
              </div>
            )}

            {/* Step 9 — Photos */}
            {step === 9 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F2A2A" }}>Photos du logement</h2>
                  <span style={{ fontSize: 12.5, color: "#6E7B79" }}>Minimum 3 photos</span>
                </div>
                {/* Drop zone */}
                <label
                  htmlFor="photoUpload"
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `1.5px dashed ${dragOver ? "#005B5B" : "#005B5B"}`,
                    borderRadius: 16, background: dragOver ? "#F4FBF1" : "#FFFFFF",
                    padding: "28px 20px", textAlign: "center", display: "flex",
                    flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer",
                    opacity: existingImages.length + photos.length >= 5 ? 0.5 : 1,
                  }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#E4F6E6", display: "flex", alignItems: "center", justifyContent: "center", color: "#005B5B" }}>
                    <Upload style={{ width: 20, height: 20 }} />
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "#005B5B" }}>Glissez-déposez ou cliquez pour parcourir</div>
                  <div style={{ fontSize: 12.5, color: "#6E7B79" }}>PNG, JPG jusqu'à 10MB — 5 photos max</div>
                  <input id="photoUpload" ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/jpg" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
                </label>
                {/* Photo grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[...existingImages, ...previews].map((src, i) => (
                    <div key={i} style={{ position: "relative", aspectRatio: 1, borderRadius: 14, overflow: "hidden", background: "#E5DFCE", border: "1px solid #D5E9D8" }}>
                      <img src={src} alt={`Photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: "#C0392B", color: "#fff", border: "2px solid #FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >
                        <X style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                  ))}
                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, 3 - (existingImages.length + previews.length)) }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ aspectRatio: 1, borderRadius: 14, background: "#E4F6E6", border: "1px solid #D5E9D8", display: "flex", alignItems: "center", justifyContent: "center", color: "#8FD89A" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 5v14M5 12h14" /></svg>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer nav */}
            <div style={{ paddingTop: 24, marginTop: "auto", borderTop: "1px dashed #E5DFCE", display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Inline validation error */}
              {stepError && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 10,
                  background: "#FDF1F0", border: "1px solid #EFC9C5",
                  color: "#C0392B", fontSize: 13, fontWeight: 500,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  {stepError}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={() => { setStepError(""); setStep((s) => Math.max(1, s - 1)); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 999, fontSize: 14, fontWeight: 600, background: "transparent", color: "#005B5B", border: "none", cursor: step === 1 ? "default" : "pointer", visibility: step === 1 ? "hidden" : "visible" }}
                >
                  <ChevronLeft style={{ width: 14, height: 14 }} />
                  Retour
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                  {step < TOTAL ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 999, fontSize: 14, fontWeight: 600, background: "#005B5B", color: "#ADEBB3", border: "none", cursor: "pointer" }}
                    >
                      Étape suivante
                      <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(isEdit ? "/profile" : "/dashboard")}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 999, fontSize: 14, fontWeight: 600, background: "#FFFFFF", border: "1px solid #E5DFCE", color: "#005B5B", cursor: "pointer" }}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitValidated}
                        disabled={loading || success}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 999, fontSize: 14, fontWeight: 600, background: loading || success ? "#6E7B79" : "#005B5B", color: "#ADEBB3", border: "none", cursor: loading || success ? "not-allowed" : "pointer" }}
                      >
                        <Check style={{ width: 14, height: 14 }} />
                        {loading ? "Envoi en cours…" : isEdit ? "Mettre à jour" : "Soumettre pour vérification"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <style>{`@keyframes fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
