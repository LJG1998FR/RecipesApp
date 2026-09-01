import { CATEGORIES, INGREDIENT_SUGGESTIONS, UNITS, RECIPE_CATEGORIES } from "../../types";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronLeft, ClockIcon, FlameIcon, BulbIcon, PlusIcon, ImageIcon, GripIcon, TrashIcon, SaveIcon } from "../icons";

// ── Styles partagés ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
  caretColor: "var(--color-primary)",
  outline: "none",
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  fontSize: 14,
  fontFamily: "inherit",
};

// ── FormSection ────────────────────────────────────────────────────────────────

function FormSection({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)" }}>
          {title}
        </p>
        {badge && (
          <span style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 99,
            backgroundColor: "var(--color-tag)", color: "var(--color-text-dim)",
            border: "1px solid var(--color-border)",
          }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Badge numéroté (étapes ingrédient) ────────────────────────────────────────

function StepBadge({ n }: { n: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: "50%",
      fontSize: 11, fontWeight: 700, marginRight: 6,
      backgroundColor: "rgba(224,154,90,0.2)", color: "var(--color-primary)",
    }}>
      {n}
    </span>
  );
}

// ── IngredientInput ────────────────────────────────────────────────────────────

type Ingredient = { name: string; qty: string; unit: string };

function IngredientInput({ onAdd }: { onAdd: (ing: Ingredient) => void }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (name.length < 2) { setSuggestions([]); setShowSugg(false); return; }
    const matches = INGREDIENT_SUGGESTIONS.filter((s) =>
      s.toLowerCase().includes(name.toLowerCase())
    ).slice(0, 6);
    setSuggestions(matches);
    setShowSugg(matches.length > 0);
  }, [name]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = () => {
    if (!name.trim() || !qty.trim()) return;
    onAdd({ name: name.trim(), qty: qty.trim(), unit });
    setName(""); setQty(""); setUnit("g");
  };

  const canAdd = name.trim() && qty.trim();

  return (
    <div ref={containerRef} style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "visible" }}>

      {/* ── Étape 1 : Nom ── */}
      <div style={{ padding: "16px 16px 14px", position: "relative" }}>
        <p style={{ fontSize: 12, color: "var(--color-text-dim)", marginBottom: 8 }}>
          <StepBadge n={1} />Nom de l'ingrédient
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => name.length >= 2 && setShowSugg(suggestions.length > 0)}
          placeholder="Tapez pour rechercher…"
          style={inputStyle}
        />
        {/* Autocomplete */}
        {showSugg && (
          <div style={{
            position: "absolute", left: 16, right: 16, top: "100%",
            backgroundColor: "#2a2420", border: "1px solid var(--color-border)",
            borderRadius: 12, overflow: "hidden", zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", marginTop: 4,
          }}>
            {suggestions.map((s) => {
              const idx = s.toLowerCase().indexOf(name.toLowerCase());
              return (
                <button
                  key={s}
                  onMouseDown={() => { setName(s); setShowSugg(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "11px 16px",
                    fontSize: 14, color: "var(--color-text)",
                    borderBottom: "1px solid var(--color-border)",
                    backgroundColor: "transparent", cursor: "pointer",
                  }}
                >
                  {s.slice(0, idx)}
                  <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{s.slice(idx, idx + name.length)}</span>
                  {s.slice(idx + name.length)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 1, margin: "0 16px", backgroundColor: "var(--color-border)" }} />

      {/* ── Étape 2 : Quantité ── */}
      <div style={{ padding: "14px 16px" }}>
        <p style={{ fontSize: 12, color: "var(--color-text-dim)", marginBottom: 8 }}>
          <StepBadge n={2} />Quantité
        </p>
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="ex. 250"
          min="0"
          style={inputStyle}
        />
      </div>

      <div style={{ height: 1, margin: "0 16px", backgroundColor: "var(--color-border)" }} />

      {/* ── Étape 3 : Unité ── */}
      <div style={{ padding: "14px 16px" }}>
        <p style={{ fontSize: 12, color: "var(--color-text-dim)", marginBottom: 10 }}>
          <StepBadge n={3} />Unité
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {UNITS.map((u) => {
            const isActive = unit === u;
            return (
              <button
                key={u}
                onClick={() => setUnit(u)}
                style={{
                  padding: "7px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", transition: "all 0.15s",
                  backgroundColor: isActive ? "var(--color-primary)" : "var(--color-surface)",
                  color: isActive ? "#171210" : "var(--color-text-muted)",
                  border: isActive ? "1px solid transparent" : "1px solid var(--color-border)",
                }}
              >
                {u}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bouton Ajouter ── */}
      <div style={{ padding: "0 16px 16px" }}>
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          style={{
            width: "100%", padding: "11px 0",
            borderRadius: 12, fontSize: 14, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            cursor: canAdd ? "pointer" : "not-allowed",
            backgroundColor: canAdd ? "var(--color-primary)" : "var(--color-surface)",
            color: canAdd ? "#171210" : "var(--color-text-dim)",
            opacity: canAdd ? 1 : 0.5,
            border: "1px solid transparent",
            transition: "all 0.15s",
          }}
        >
          <PlusIcon size={15} /> Ajouter l'ingrédient
        </button>
      </div>
    </div>
  );
}

// ── AddRecipePage ──────────────────────────────────────────────────────────────

type DraftStatus = "none" | "saved" | "submitted";

export default function AddRecipePage({ onCancel }: { onCancel: () => void }) {
  const [title,       setTitle]       = useState("");
  const [people,     setPeople]     = useState(2);
  const [category,    setCategory]    = useState<typeof CATEGORIES[number]>("Plats");
  const [prepTime,    setPrepTime]    = useState("");
  const [cookTime,    setCookTime]    = useState("");
  const [imageUrl,    setImageUrl]    = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps,       setSteps]       = useState<string[]>([""]);
  const [tips,        setTips]        = useState<string[]>([]);
  const [tipInput,    setTipInput]    = useState("");
  const [errors,      setErrors]      = useState<string[]>([]);
  const [status,      setStatus]      = useState<DraftStatus>("none");

  const removeIngredient = (i: number) => setIngredients((p) => p.filter((_, idx) => idx !== i));
  const updateStep = (i: number, v: string) => setSteps((p) => p.map((s, idx) => idx === i ? v : s));
  const addStep    = () => setSteps((p) => [...p, ""]);
  const removeStep = (i: number) => setSteps((p) => p.filter((_, idx) => idx !== i));
  const addTip     = () => { if (tipInput.trim()) { setTips((p) => [...p, tipInput.trim()]); setTipInput(""); } };
  const removeTip  = (i: number) => setTips((p) => p.filter((_, idx) => idx !== i));

  const validate = () => {
    const errs: string[] = [];
    if (!title.trim())                             errs.push("Le titre est requis.");
    if (!prepTime.trim())                          errs.push("Le temps de préparation est requis.");
    if (ingredients.length === 0)                  errs.push("Ajoutez au moins un ingrédient.");
    if (steps.filter((s) => s.trim()).length === 0) errs.push("Ajoutez au moins une étape.");
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]); setStatus("submitted");
  };

  const handleDraft = () => { setErrors([]); setStatus("saved"); };

  // ── Écran de confirmation ──────────────────────────────────────────────────
  if (status === "submitted") {
    return (
      <div style={{
        fontFamily: "var(--font-body)",
        minHeight: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 32px", textAlign: "center",
        backgroundColor: "var(--color-background)",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(224,154,90,0.15)",
        }}>
          <span style={{ color: "var(--color-primary)", transform: "scale(1.8)", display: "block" }}>
            <CheckIcon />
          </span>
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>
          Recette ajoutée !
        </h2>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 28 }}>
          "{title}" a été publiée avec succès.
        </p>
        <button
          onClick={onCancel}
          style={{
            padding: "14px 32px", borderRadius: 16,
            fontSize: 14, fontWeight: 700,
            backgroundColor: "var(--color-primary)", color: "#171210",
            cursor: "pointer",
          }}
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // ── Formulaire principal ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "var(--font-body)", backgroundColor: "var(--color-background)", minHeight: "100dvh", overflowY: "auto", paddingBottom: 40 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "52px 20px 20px" }}>
        <button
          onClick={onCancel}
          style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
            color: "var(--color-text)", cursor: "pointer",
          }}
        >
          <ChevronLeft />
        </button>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>
            Nouvelle recette
          </h1>
          {status === "saved" && (
            <p style={{ fontSize: 12, color: "#a8c87a", marginTop: 2 }}>Brouillon sauvegardé</p>
          )}
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* ── Titre ── */}
        <FormSection title="Titre">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex. Tarte Tatin aux pommes"
            style={{ ...inputStyle, fontSize: 15, fontFamily: "var(--font-display)", fontWeight: 500, padding: "14px 16px", borderRadius: 14 }}
          />
        </FormSection>

        {/* ── Personnes + Catégorie (2 colonnes) ── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {/* Personnes */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)", marginBottom: 10 }}>
              Personnes
            </p>
            <div style={{
              display: "flex", alignItems: "center",
              backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden",
            }}>
              <button
                onClick={() => setPeople((p) => Math.max(1, p - 1))}
                style={{ width: 44, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 300, color: "var(--color-primary)", flexShrink: 0, cursor: "pointer" }}
              >−</button>
              <span style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{people}</span>
              <button
                onClick={() => setPeople((p) => p + 1)}
                style={{ width: 44, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 300, color: "var(--color-primary)", flexShrink: 0, cursor: "pointer" }}
              >+</button>
            </div>
          </div>

          {/* Catégorie */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)", marginBottom: 10 }}>
              Catégorie
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {RECIPE_CATEGORIES.map((c) => {
                const isActive = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    style={{
                      padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.15s",
                      backgroundColor: isActive ? "var(--color-primary)" : "var(--color-card)",
                      color: isActive ? "#171210" : "var(--color-text-muted)",
                      border: isActive ? "1px solid transparent" : "1px solid var(--color-border)",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Préparation + Cuisson (2 colonnes) ── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Préparation", badge: undefined, icon: <ClockIcon size={15} />, value: prepTime, set: setPrepTime, placeholder: "15 min" },
            { label: "Cuisson",     badge: "optionnel", icon: <FlameIcon />,          value: cookTime, set: setCookTime, placeholder: "30 min" },
          ].map(({ label, badge, icon, value, set, placeholder }) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)" }}>
                  {label}
                </p>
                {badge && (
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, backgroundColor: "var(--color-tag)", color: "var(--color-text-dim)", border: "1px solid var(--color-border)" }}>
                    {badge}
                  </span>
                )}
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0 14px", height: 48, borderRadius: 14,
                backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
              }}>
                <span style={{ color: "var(--color-text-dim)", flexShrink: 0 }}>{icon}</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "var(--color-text)", caretColor: "var(--color-primary)", fontFamily: "inherit" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── Image ── */}
        <FormSection title="Image" badge="optionnel">
          {imageUrl ? (
            <div style={{ position: "relative", height: 160, borderRadius: 16, overflow: "hidden" }}>
              <img src={imageUrl} alt="aperçu" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImageUrl("")} />
              <button
                onClick={() => setImageUrl("")}
                style={{
                  position: "absolute", top: 10, right: 10,
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: "rgba(23,18,16,0.75)", color: "var(--color-text)", cursor: "pointer",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ) : (
            <>
              <label style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "32px 0", borderRadius: 16, cursor: "pointer",
                border: "2px dashed var(--color-border)", backgroundColor: "var(--color-card)",
              }}>
                <span style={{ color: "var(--color-text-dim)" }}><ImageIcon /></span>
                <span style={{ fontSize: 13, color: "var(--color-text-dim)" }}>Appuyer pour choisir une photo</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={() => {}} />
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
                <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
                <span style={{ fontSize: 12, color: "var(--color-text-dim)" }}>ou URL</span>
                <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
              </div>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                style={inputStyle}
              />
            </>
          )}
        </FormSection>

        {/* ── Ingrédients ── */}
        <FormSection title="Ingrédients">
          {ingredients.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {ingredients.map((ing, i) => (
                <li key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 12,
                  backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
                }}>
                  <span style={{ color: "var(--color-text-dim)", flexShrink: 0 }}><GripIcon /></span>
                  <span style={{ flex: 1, fontSize: 14, color: "var(--color-text)" }}>{ing.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>{ing.qty} {ing.unit}</span>
                  <button onClick={() => removeIngredient(i)} style={{ color: "var(--color-text-dim)", cursor: "pointer", marginLeft: 4 }}>
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <IngredientInput onAdd={(ing) => setIngredients((p) => [...p, ing])} />
        </FormSection>

        {/* ── Étapes ── */}
        <FormSection title="Étapes">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  backgroundColor: "var(--color-primary)", color: "#171210",
                }}>
                  {i + 1}
                </span>
                <textarea
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  placeholder={`Étape ${i + 1}…`}
                  rows={2}
                  style={{ ...inputStyle, width: undefined, flex: 1, resize: "none", lineHeight: 1.55, padding: "10px 14px" }}
                />
                {steps.length > 1 && (
                  <button onClick={() => removeStep(i)} style={{ color: "var(--color-text-dim)", marginTop: 12, flexShrink: 0, cursor: "pointer" }}>
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addStep}
            style={{
              marginTop: 12, width: "100%", padding: "11px 0",
              borderRadius: 12, fontSize: 14, fontWeight: 500,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              backgroundColor: "var(--color-card)",
              border: "1px dashed var(--color-border)",
              color: "var(--color-text-muted)", cursor: "pointer",
            }}
          >
            <PlusIcon size={15} /> Ajouter une étape
          </button>
        </FormSection>

        {/* ── Astuces ── */}
        <FormSection title="Astuces du chef" badge="optionnel">
          {tips.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {tips.map((tip, i) => (
                <li key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "10px 14px", borderRadius: 12,
                  backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
                }}>
                  <span style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 1 }}><BulbIcon /></span>
                  <p style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: "var(--color-text)", margin: 0 }}>{tip}</p>
                  <button onClick={() => removeTip(i)} style={{ color: "var(--color-text-dim)", flexShrink: 0, cursor: "pointer" }}><TrashIcon /></button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              value={tipInput}
              onChange={(e) => setTipInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTip()}
              placeholder="Partagez une astuce…"
              style={{ ...inputStyle, width: undefined, flex: 1 }}
            />
            <button
              onClick={addTip}
              disabled={!tipInput.trim()}
              style={{
                width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: tipInput.trim() ? "pointer" : "not-allowed",
                backgroundColor: tipInput.trim() ? "var(--color-primary)" : "var(--color-card)",
                color: tipInput.trim() ? "#171210" : "var(--color-text-dim)",
                border: "1px solid var(--color-border)",
              }}
            >
              <PlusIcon size={16} />
            </button>
          </div>
        </FormSection>

        {/* ── Erreurs de validation ── */}
        {errors.length > 0 && (
          <div style={{
            marginBottom: 20, padding: "12px 16px", borderRadius: 12,
            backgroundColor: "rgba(224,90,90,0.1)", border: "1px solid rgba(224,90,90,0.25)",
          }}>
            {errors.map((e, i) => (
              <p key={i} style={{ fontSize: 13, color: "#e07070" }}>• {e}</p>
            ))}
          </div>
        )}

        {/* ── Boutons d'action ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}>
          <button
            onClick={handleSubmit}
            style={{
              width: "100%", padding: "16px 0", borderRadius: 16,
              fontSize: 15, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              backgroundColor: "var(--color-primary)", color: "#171210", cursor: "pointer",
            }}
          >
            <CheckIcon /> Confirmer l'ajout
          </button>
          <button
            onClick={handleDraft}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 16,
              fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              backgroundColor: "var(--color-card)", color: "var(--color-text)",
              border: "1px solid var(--color-border)", cursor: "pointer",
            }}
          >
            <SaveIcon /> Sauvegarder le brouillon
          </button>
          <button
            onClick={onCancel}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 16,
              fontSize: 14, fontWeight: 500,
              backgroundColor: "transparent", color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)", cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </div>

      </div>
    </div>
  );
}