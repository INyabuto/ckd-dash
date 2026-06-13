<script lang="ts">
  import type { PageData } from './$types';

 // SVELTE 5 RUNES: Explicit props destructuring boundary
  let { data }: { data: PageData } = $props();

  // Turning these into strict derived expressions
  let patient = $derived(data.patient);
  let appointments = $derived(data.appointments);
  let telemetryKPIs = $derived(data.telemetryKPIs);
  
  // 🛠️ FIX: Add the explicit array type definition here!
  let localMedications = $state<typeof data.medications>([]);

  // Safely sync state using an explicit effect bound to the derived data stream
  $effect(() => {
    localMedications = [...data.medications];
  });

  // Maps telemetry metrics into visual needle rotation vectors
  const getAngle = (pct: number) => (pct / 100) * 180 - 90;

  // High-contrast accessibility color matrix
  function getThemeColors(type: string) {
    const themes: Record<string, { text: string; bg: string; border: string }> = {
      low:      { text: "#B7950B", bg: "#FEF9E7", border: "#F9E79F" },
      normal:   { text: "#2E7D32", bg: "#E8F5E9", border: "#A5D6A7" },
      elevated: { text: "#E65100", bg: "#FFF3E0", border: "#FFB74D" },
      high:     { text: "#D32F2F", bg: "#FFEBEE", border: "#EF9A9A" }
    };
    return themes[type] || themes.normal;
  }

  function toggleMedication(id: string | number) {
    localMedications = localMedications.map(med => 
      med.id === id ? { ...med, taken: !med.taken } : med
    );
  }
</script>

<main class="dashboard-container">
  <header class="main-header">
    <h1>CKD Dash</h1>
    <p class="patient-banner">Welcome back, <strong>{patient.name}</strong></p>
  </header>

  <section class="card-section" aria-labelledby="appointments-heading">
    <div class="appointments-header">
      <h2 id="appointments-heading">📅 Upcoming Appointments</h2>
      <span class="swipe-hint">Scroll or swipe left to view more →</span>
    </div>
    
    <!-- 🛠️ HORIZONTAL TIMELINE ROW -->
    <div class="appointments-timeline">
      {#each appointments as appt}
        {@const theme = getThemeColors(appt.statusStyle)}
        <div class="appointment-timeline-card" style="border-top-color: {theme.text};">
          <div class="appt-badge" style="background-color: {theme.bg}; color: {theme.text}; border-color: {theme.border}">
            {appt.date}
          </div>
          <div class="appt-details">
            <h3>{appt.specialty}</h3>
            <p class="provider-text">{appt.provider}</p>
            <p class="time-text">🕒 {appt.time}</p>
            {#if appt.instruction}
              <p class="instruction-text" title={appt.instruction}>{appt.instruction}</p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="card-section" aria-labelledby="vitals-heading">
    <h2 id="vitals-heading">📊 Daily Health KPIs</h2>
    <p class="section-instruction">Your readings fall into 4 zones: Yellow (Low), Green (Normal), Orange (Elevated), or Red (High).</p>
    
    <div class="gauge-grid">
      {#each Object.entries(telemetryKPIs) as [key, data]}
        {@const theme = getThemeColors(data.type)}
        <div class="gauge-card" style="border-color: {theme.border}; background-color: {theme.bg}">
          <span class="gauge-title">{data.label}</span>
          
         <div class="svg-container" aria-hidden="true" style="width: 100%; max-width: 160px; aspect-ratio: 100 / 55; margin: 0 auto;">
            <svg viewBox="0 0 100 55" width="100%" height="100%" style="overflow: visible; display: block;">
              <defs>
                <path id="gauge-track" d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke-width="10" stroke-linecap="butt"/>
              </defs>
              
              <use href="#gauge-track" stroke="#FBC02D" stroke-dasharray="110" stroke-dashoffset="0" />
              <use href="#gauge-track" stroke="#2E7D32" stroke-dasharray="110" stroke-dashoffset="-27.5" />
              <use href="#gauge-track" stroke="#FF9100" stroke-dasharray="110" stroke-dashoffset="-55" />
              <use href="#gauge-track" stroke="#D32F2F" stroke-dasharray="110" stroke-dashoffset="-82.5" />
              
              <use href="#gauge-track" stroke="#ffffff" stroke-width="11" stroke-dasharray="1 26.5 1 26.5 1 26.5 1 26.5" />

              <g transform="translate(50,50) rotate({getAngle(data.pct)})">
                <line x1="0" y1="0" x2="0" y2="-40" stroke="#111111" stroke-width="3.5" stroke-linecap="round" />
                <circle cx="0" cy="0" r="5" fill="#111111" />
                <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
              </g>
            </svg>
          </div>

          <div class="gauge-reading">
            <span class="numerical-value">{data.value}</span>
            <span class="unit-label">{data.unit}</span>
          </div>
          <span class="status-badge" style="border-color: {theme.text}; color: {theme.text}; background-color: #ffffff">
            {data.status}
          </span>
        </div>
      {/each}
    </div>
  </section>

<!-- 💊 MEDICATIONS CHECKLIST TRACKER -->
  <section class="card-section" aria-labelledby="meds-heading">
    <h2 id="meds-heading">💊 Daily Medications</h2>
    <p class="section-instruction">Tap the box next to the medication when you have taken it today.</p>
    
    <div class="meds-container">
      {#each localMedications as med}
        {@const theme = getThemeColors(med.urgency)}
        <div class="med-row" class:med-taken={med.taken} style="border-color: {med.taken ? '#a5d6a7' : theme.border}; background-color: {med.taken ? '#e8f5e9' : '#ffffff'}">
          <div class="med-details">
            <h3>{med.name}</h3>
            <p class="dosage-text">Dosage: <strong>{med.dose}</strong> — {med.purpose}</p>
          </div>
          
          <!-- 🛠️ FIXED: Transformed deprecated 'on:click' into modern Svelte 5 'onclick' attribute -->
          <button 
            type="button" 
            class="action-target-box" 
            class:checked={med.taken} 
            style={!med.taken ? `border-color: ${theme.text}; color: ${theme.text}; background-color: ${theme.bg}` : ''} 
            onclick={() => toggleMedication(med.id)} 
            aria-label="Mark {med.name} as {med.taken ? 'not taken' : 'taken'}"
          >
            {#if med.taken}
              <span class="check-icon">✓</span> Taken
            {:else}
              Not Taken
            {/if}
          </button>
        </div>
      {/each}
    </div>
  </section>
</main>



<style>
  :global(body) {
    background-color: #f8f9fa;
    color: #1a1a1a;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 0;
  }
  /* 🛠️ ADJUSTED VIEW STYLING FOR A PERFECT FIT */
  .dashboard-container {
    width: 100%;
    max-width: 100%; /* Expands to fill available workspace width */
    margin: 0;
    padding: 10px 0; /* Drastically stripped down outer padding boundaries */
    display: flex;
    flex-direction: column;
    gap: 16px; /* Reduced gap size between sections */
    box-sizing: border-box;
  }

  /* Header Branding Section */
  .main-header {
    background-color: #0d3b66;
    color: #ffffff;
    padding: 16px 20px; /* Reduced inner padding */
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .main-header h1 {
    font-size: 2rem; /* Scaled down headline footprint */
    margin: 0 0 4px 0;
    font-weight: 800;
  }

  .patient-banner {
    font-size: 1.1rem;
    margin: 0;
    color: #f4f4f9;
  }

  /* Structural Content Cards */
  .card-section {
    background: #ffffff;
    border: 1px solid #dbe2ef;
    border-radius: 12px;
    padding: 16px 20px; /* Tightened internal padding layouts */
    box-shadow: 0 1px 3px rgba(0,0,0,0.01);
  }

  .card-section h2 {
    font-size: 1.5rem;
    margin-top: 0;
    margin-bottom: 12px;
    color: #0d3b66;
    border-bottom: 2px solid #f4f4f9;
    padding-bottom: 6px;
  }

  .section-instruction {
    font-size: 1.05rem;
    color: #4f5d75;
    margin: 0 0 14px 0;
  }

  /* 🛠️ UPDATED RESPONSIVE GAUGE GRID CONTROLS */
  .gauge-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); /* Optimized responsive column footprints */
    gap: 16px;
  }

  .gauge-card {
    background-color: #ffffff;
    border: 1px solid #dbe2ef;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between; /* Keeps titles, needles, and badges separated evenly */
    min-height: 240px; /* Prevents compression on smaller layouts */
    box-sizing: border-box;
  }

  .gauge-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: #0d3b66;
    margin-bottom: 8px;
    text-align: center;
  }

  .gauge-reading {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
    margin-top: 4px;
  }

  .numerical-value {
    font-size: 2rem; /* Tightened scaling to maintain perfect visual proportions */
    font-weight: 800;
    color: #111111;
  }

  .unit-label {
    font-size: 1.05rem;
    color: #4f5d75;
    font-weight: 600;
  }

  .status-badge {
    margin-top: 8px;
    padding: 4px 14px;
    border: 2px solid;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  /* 🛠️ COMPACT HORIZONTAL TIMELINE STYLES */
  .appointments-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 2px solid #f4f4f9;
    margin-bottom: 12px;
    padding-bottom: 6px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .appointments-header h2 {
    margin: 0;
    border-bottom: none !important;
    padding-bottom: 0 !important;
  }

  .swipe-hint {
    font-size: 0.9rem;
    color: #8892b0;
    font-weight: 600;
  }

  .appointments-timeline {
    display: flex;
    gap: 16px;
    overflow-x: auto; /* Enables natural horizontal swiping */
    padding-bottom: 8px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }

  /* Custom subtle scrollbar styling to prevent UI clutter */
  .appointments-timeline::-webkit-scrollbar {
    height: 6px;
  }
  .appointments-timeline::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  .appointments-timeline::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }

  .appointment-timeline-card {
    flex: 0 0 280px; /* Forces cards to stay side-by-side without squishing */
    scroll-snap-align: start;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-top: 5px solid; /* Highlights priority color at the top of the card */
    border-radius: 8px;
    padding: 14px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }

  .appt-badge {
    align-self: flex-start;
    padding: 4px 10px;
    border: 1px solid;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .appt-details h3 {
    font-size: 1.15rem;
    margin: 0 0 4px 0;
    color: #0d3b66;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .provider-text {
    font-size: 0.95rem;
    margin: 0 0 6px 0;
    color: #4f5d75;
  }

  .time-text {
    font-size: 0.95rem;
    font-weight: bold;
    color: #1a1a1a;
    margin: 0;
  }

  .instruction-text {
    font-size: 0.85rem;
    margin: 6px 0 0 0;
    color: #64748b;
    font-style: italic;
    display: -webkit-box;
    -webkit-line-clamp: 2; /* Truncates multi-line directions cleanly */
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (max-width: 600px) {
    .appointment-timeline-card {
      flex: 0 0 85%; /* Shows a preview of the next slide on small touch-screens */
    }
  }
</style>