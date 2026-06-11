<div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
    <h3 style="color: #166534; margin-top: 0; display: flex; align-items: center; gap: 0.5rem;">
        Connect to a Provider Network
    </h3>
    <p style="color: #1e293b; margin-bottom: 1rem;">
        Connect CKD Dash directly with your Provider (EHR) networks via SMART on FHIR to access your historical charts, laboratory labs, and clinical diagnostics.
    </p>
    
    <a href="/auth/launch?iss=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4" 
       rel="external"
       style="display: inline-block; background-color: #16a34a; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; font-weight: 600; text-decoration: none; transition: background 0.2s;"
       onmouseover={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
       onmouseleave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
       onfocus={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
       onblur={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}>
        Connect with Epic MyChart
    </a>
</div>