<script lang="ts">
  import type { PageData } from './$types';

  // Svelte 5: Pull data properties from your server data-loader
  let { data }: { data: PageData } = $props();
  
  // Svelte 5 Rune: Pull the streaming arrays reactively
  const locations = $derived(data.fhirData?.locations || []);
  const practitionerRoles = $derived(data.fhirData?.practitionerRoles || []);
  const slots = $derived(data.fhirData?.slots || []);

  // Filter Input Bindings
  let specialtyFilter = $state('');
  let cityFilter = $state('');
  let currentWeekIndex = $state(0);

  // 1. REFACTORED LOOKUPS: Built reactively using Svelte 5 $derived.by 
  let lookups = $derived.by(() => {
    const locMap: Record<string, any> = {};
    locations.forEach((loc: any) => {
      if (loc.id) locMap[loc.id] = loc;
    });

    const cities = Array.from(new Set(locations.map((loc: any) => loc.address?.city).filter(Boolean))).sort();

    const roleMap: Record<string, any> = {};
    practitionerRoles.forEach((role: any) => {
      if (!role.id) return;
      const npiIdent = role.identifier?.find((id: any) => id.system?.includes('us-npi'));
      
      roleMap[role.id] = {
        ...role,
        extractedNPI: npiIdent ? npiIdent.value : 'N/A',
        providerName: role.practitioner?.display || 'Unknown Clinician',
        specialtyDisplay: role.specialty?.[0]?.coding?.[0]?.display || 'General Medicine',
        specialtyCode: role.specialty?.[0]?.coding?.[0]?.code || '',
        linkedLocationId: role.location?.[0]?.reference?.split('/').pop() || ''
      };
    });

    const specialtiesMap = new Map();
    Object.values(roleMap).forEach((role: any) => {
      if (role.specialtyCode) {
        specialtiesMap.set(role.specialtyCode, role.specialtyDisplay);
      }
    });
    const specialties = Array.from(specialtiesMap.entries()).map(([code, display]) => ({ code, display }));

    return {
      locationMap: locMap,
      uniqueCities: cities,
      practitionerRoleMap: roleMap,
      uniqueSpecialties: specialties
    };
  });

  // Reset pagination index securely whenever dropdown selectors change
  $effect(() => {
    specialtyFilter;
    cityFilter;
    currentWeekIndex = 0;
  });

  // 2. Main Scheduling Calculation Engine
  let filteredResults = $derived.by(() => {
    const { locationMap, practitionerRoleMap } = lookups;
    if (Object.keys(locationMap).length === 0 || Object.keys(practitionerRoleMap).length === 0) return [];

    let rawMatches: any[] = [];

    slots.forEach((slot: any) => {
      const scheduleId = slot.schedule?.reference?.split('/').pop();
      if (!scheduleId) return;

      let matchedRoleId = scheduleId;
      const parsedSchedNum = parseInt(scheduleId);
      
      if (parsedSchedNum >= 20) {
        matchedRoleId = String(Math.floor((parsedSchedNum - 20) / 2));
      } else if (parsedSchedNum >= 10 && parsedSchedNum <= 19) {
        matchedRoleId = String(parsedSchedNum - 10);
      }

      const role = practitionerRoleMap[matchedRoleId];
      if (!role) return;

      if (specialtyFilter && role.specialtyCode !== specialtyFilter) return;

      const location = locationMap[role.linkedLocationId];
      if (!location) return;
      if (cityFilter && location.address?.city !== cityFilter) return;

      rawMatches.push({
        ...role,
        locationName: location.name,
        fullAddress: `${location.address.line.join(' ')}, ${location.address.city}, ${location.address.state}`,
        slotStart: new Date(slot.start),
        bookingLink: slot.extension?.find((ext: any) => ext.url?.includes('booking-deep-link'))?.valueUrl || ''
      });
    });

    // Consolidate matching segments by clinic name
    const groupedCards: Record<string, any> = {};
    rawMatches.forEach(match => {
      const cardKey = `${match.providerName}|${match.locationName}`;
      if (!groupedCards[cardKey]) {
        groupedCards[cardKey] = {
          providerName: match.providerName,
          specialtyDisplay: match.specialtyDisplay,
          extractedNPI: match.extractedNPI,
          locationName: match.locationName,
          fullAddress: match.fullAddress,
          insuranceNetworks: match.extractedNPI !== 'N/A' ? ['UHC Choice Plus', 'Optum Choice PPO'] : ['Self-Pay Only'],
          slots: []
        };
      }
      groupedCards[cardKey].slots.push(match);
    });

    return Object.values(groupedCards).map(card => {
      card.slots.sort((a: any, b: any) => a.slotStart.getTime() - b.slotStart.getTime());
      
      const weeksMap: Record<string, any[]> = {};
      card.slots.forEach((s: any) => {
        // 🔑 THE FIX: Instantiate a temporary standalone copy to keep slot timestamps safe from mutation
        const targetDate = new Date(s.slotStart.getTime());
        const day = targetDate.getDay();
        const diff = targetDate.getDate() - day;
        targetDate.setDate(diff);
        const sundayDate = targetDate.toISOString().slice(0, 10);
        
        if (!weeksMap[sundayDate]) weeksMap[sundayDate] = [];
        weeksMap[sundayDate].push(s);
      });

      card.weeksList = Object.entries(weeksMap).sort((a, b) => a[0].localeCompare(b[0]));
      return card;
    });
  });

  let totalAvailableWeeks = $derived(
    Math.max(...filteredResults.map(p => p.weeksList.length), 0)
  );

  function groupSlotsByDay(slotsList: any[]) {
    const dailyMap: Record<string, any[]> = {};
    slotsList.forEach(s => {
      const dayLabel = s.slotStart.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      if (!dailyMap[dayLabel]) dailyMap[dayLabel] = [];
      dailyMap[dayLabel].push(s);
    });
    return Object.entries(dailyMap);
  }
</script>

<div class="scheduling-container">
  <aside class="filter-controls">
    <h3>Provider Search</h3>
    
    <div class="control-box">
      <label for="spec-select">Clinical Specialty</label>
      <select id="spec-select" bind:value={specialtyFilter}>
        <option value="">All Specialties</option>
        {#each lookups.uniqueSpecialties as spec}
          <option value={spec.code}>{spec.display}</option>
        {/each}
      </select>
    </div>

    <div class="control-box">
      <label for="city-select">Physical City Location</label>
      <select id="city-select" bind:value={cityFilter}>
        <option value="">All Cities</option>
        {#each lookups.uniqueCities as city}
          <option value={city}>{city}</option>
        {/each}
      </select>
    </div>

    {#if totalAvailableWeeks > 1}
      <div class="pagination-control-box">
        <label for="prev-week-btn">Schedule View Window</label>
        <div class="pagination-button-group">
          <button 
            id="prev-week-btn"
            class="pager-btn" 
            disabled={currentWeekIndex === 0} 
            onclick={() => currentWeekIndex--}
          >
            ◀ Previous
          </button>
          <button 
            class="pager-btn" 
            disabled={currentWeekIndex >= totalAvailableWeeks - 1} 
            onclick={() => currentWeekIndex++}
          >
            Next ▶
          </button>
        </div>
      </div>
    {/if}
  </aside>

  <main class="timeline-viewport">
    {#if filteredResults.length === 0}
      <div class="fallback-empty-state">
        <p>No active clinician availability blocks found matching current filter parameters.</p>
      </div>
    {:else}
      <div class="results-layout-list">
        {#each filteredResults as provider}
          <div class="provider-row-card">
            
            <div class="provider-bio">
              <h4>{provider.providerName}</h4>
              <span class="spec-tag">{provider.specialtyDisplay}</span>
              <p class="npi-text">NPI: {provider.extractedNPI}</p>
              <p class="loc-text">📍 <strong>{provider.locationName}</strong><br>{provider.fullAddress}</p>
              
              <div class="network-group">
                <strong>Accepted Insurance:</strong>
                <div class="badges-flex">
                  {#each provider.insuranceNetworks as network}
                    <span class="net-badge">{network}</span>
                  {/each}
                </div>
              </div>
            </div>

            <div class="timeline-scroller">
              {#if provider.weeksList && provider.weeksList[currentWeekIndex]}
                {#each groupSlotsByDay(provider.weeksList[currentWeekIndex][1]) as [day, daySlots]}
                  <div class="day-slot-card">
                    <div class="day-title">{day}</div>
                    <div class="pills-container">
                      {#each daySlots as slot}
                        {@const formattedTime = slot.slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        
                        {#if slot.bookingLink}
                          <a href={slot.bookingLink} target="_blank" rel="noopener noreferrer" class="booking-pill">
                            {formattedTime}
                          </a>
                        {:else}
                          <span class="booking-pill disabled">
                            {formattedTime}
                          </span>
                        {/if}
                      {/each}
                    </div>
                  </div>
                {/each}
              {:else}
                <div class="no-slots-this-week">No appointments available for this week window.</div>
              {/if}
            </div>

          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  /* Core Dashboard Workspace Constraints */
  .scheduling-container {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 24px;
    padding: 24px;
    background-color: #f8fafc;
    min-height: calc(100vh - 64px);
    box-sizing: border-box;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .filter-controls {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    height: fit-content;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .control-box {
    margin-bottom: 16px;
  }
  .control-box label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 6px;
  }
  .control-box select {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    font-size: 14px;
    color: #334155;
  }

  /* Structural Provider Matrix Rows */
  .provider-row-card {
    display: grid;
    grid-template-columns: 320px 1fr;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    margin-bottom: 20px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
  }
  .provider-bio {
    padding: 24px;
    background: #fafafa;
    border-right: 1px solid #e2e8f0;
  }
  .provider-bio h4 {
    margin: 0 0 6px 0;
    font-size: 18px;
    color: #0f172a;
  }
  .spec-tag {
    display: inline-block;
    background: #e0f2fe;
    color: #0369a1;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 600;
  }
  .npi-text { font-size: 11px; color: #94a3b8; margin: 6px 0 16px 0; }
  .loc-text { font-size: 13px; color: #334155; line-height: 1.5; }
  .network-group { margin-top: 16px; border-top: 1px dashed #e2e8f0; padding-top: 12px; }
  .badges-flex { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; }
  .net-badge { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }

  /* --------------------------------------------------
   * 🔑 THE FIX: Horizontal Weekly Timeline Styles
   * -------------------------------------------------- */
  .timeline-scroller {
    padding: 24px;
    display: flex;
    gap: 16px;
    overflow-x: auto; /* Enables horizontal swiping */
    background: #ffffff;
  }

  .day-slot-card {
    background: #f8fafc;
    padding: 12px;
    border-radius: 10px;
    min-width: 155px;
    border: 1px solid #e2e8f0;
    flex-shrink: 0; /* Prevents columns from shrinking */
  }

  .day-title { 
    font-size: 12px; 
    font-weight: bold; 
    text-align: center; 
    border-bottom: 2px solid #cbd5e1; 
    padding-bottom: 6px; 
    margin-bottom: 12px; 
    color: #475569;
    text-transform: uppercase;
  }

  .pills-container { 
    display: flex; 
    flex-direction: column; /* Stacks time pills vertically */
    gap: 6px; 
    max-height: 220px; 
    overflow-y: auto; /* Scroll individual days if slots overflow */
  }

  .booking-pill {
    display: block;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #2563eb;
    text-align: center;
    padding: 8px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .booking-pill:hover { 
    background: #2563eb; 
    color: #ffffff; 
    border-color: #2563eb; 
  }

  .booking-pill.disabled {
    background: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
  }
</style>