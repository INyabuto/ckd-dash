<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	// Svelte 5 children snippet handling standard page slot injections
	let { children }: { children: Snippet } = $props();

	// Computed state tracking the active route to handle high-contrast multi-sensory transitions
	let currentPath = $derived(page.url.pathname);

	// Navigation menu configuration schema matching your architectural taxonomy specification
	const navigationMenu = [
		{
			label: 'Dashboard',
			subLabel: 'Home Base & Lab Trends',
			href: '/patients/dashboard',
			iconSvg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />`
		},
		// {
		// 	label: 'Appointments & Labs',
		// 	subLabel: 'Schedule & Calendar Timeline',
		// 	href: '/patients/appointments',
		// 	badge: 1, // High-contrast dynamic counter badge flag
		// 	iconSvg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />`
		// },
		// {
		// 	label: 'Contact My Care Team',
		// 	subLabel: 'Secure Provider Communication',
		// 	href: '/patients/messages',
		// 	iconSvg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />`
		// }
	];
</script>

<!-- WCAG 2.1 Focus Skip Action Link -->
<a href="#main-content" class="skip-link">Skip to main contents</a>

<div class="viewport-root">
	<!-- Fixed Left Navigation Panel -->
	<nav class="sidebar-wrapper" aria-label="Main Application Navigation">
		
		<header class="app-header">
			<div class="brand-container">
				<span class="brand-logo" aria-hidden="true">🩸</span>
				<div>
					<h1 class="brand-title">CKD Dash</h1>
					<p class="brand-subtitle">Kidney Monitoring</p>
				</div>
			</div>
		</header>

		<!-- Main Interactive Entry Blocks -->
		<div class="nav-stack">
			{#each navigationMenu as item}
				{@const isActive = currentPath.startsWith(item.href)}
				<a 
					href={item.href} 
					class="nav-row-item" 
					class:active={isActive}
					aria-current={isActive ? 'page' : undefined}
				>
					<!-- Left Active Anchor Indicator Bar -->
					{#if isActive}
						<div class="active-indicator-bar"></div>
					{/if}

					<div class="nav-row-content">
						<!-- Icon container with thick 2.5px scale vector layouts -->
						<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
							{@html item.iconSvg}
						</svg>

						<div class="nav-text-block">
							<span class="nav-label">{item.label}</span>
							<span class="nav-sublabel">{item.subLabel}</span>
						</div>

						<!-- Dynamic Counter Badge Indicator -->
						{#if item.badge}
							<span class="alert-badge" aria-label="{item.badge} urgent update scheduled">{item.badge}</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>

		<!-- Footer Context Component: Identity Metadata Profile and Global Signout -->
		<footer class="patient-profile-footer">
			<div class="profile-card">
				<div class="avatar-capsule" aria-hidden="true">IN</div>
				<div class="profile-info">
					<p class="profile-name">Isaiah Nyambuka</p>
					<a href="/logout" class="signout-trigger">Sign Out of System</a>
				</div>
			</div>
		</footer>

	</nav>

	<!-- Independent Scrolling Content Column Container -->
	<main id="main-content" class="main-content-canvas" tabindex="-1">
		{@render children()}
	</main>
</div>

<style>
	/* --------------------------------------------------
	 * Core CSS Global Reset & Font Scaling Configurations
	 * -------------------------------------------------- */
	:global(html, body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
		background-color: #f8fafc;
		-webkit-font-smoothing: antialiased;
		height: 100%;
		overflow: hidden; /* Strict overall viewport block */
	}

	/* Focus Skip Link Layout (Hidden by default, renders prominently upon Keyboard Tab execution) */
	.skip-link {
		position: absolute;
		top: -100px;
		left: 1rem;
		background-color: #ea580c; /* High contrast amber orange */
		color: #ffffff;
		padding: 1rem 1.5rem;
		border-radius: 8px;
		font-weight: bold;
		font-size: 1.125rem;
		z-index: 99999;
		text-decoration: none;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
		transition: top 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.skip-link:focus {
		top: 1rem;
		outline: 4px solid #f97316;
	}

	/* --------------------------------------------------
	 * Primary Master Viewport Architecture
	 * -------------------------------------------------- */
	.viewport-root {
		display: flex;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		position: relative;
	}

	/* Permanently Locked Left Structural Navigation Navigation Sidebar Grid Column */
	.sidebar-wrapper {
		width: 280px;
		min-width: 280px;
		height: 100%;
		background-color: #0f172a; /* Deep charcoal slate foundation */
		border-right: 1px solid #1e293b;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		position: relative;
		z-index: 100;
	}

	/* Flexible Dynamic Right Main Panel Area Context Grid */
	.main-content-canvas {
		flex: 1;
		height: 100%;
		overflow-y: auto; /* Handles nested grid overflow scrolling configurations safely */
		background-color: #f1f5f9;
		padding: 2.5rem;
		box-sizing: border-box;
	}
	.main-content-canvas:focus {
		outline: none; /* Accessible main canvas target skips visual outline frames */
	}

	/* --------------------------------------------------
	 * Sidebar Typography & Visual Header Components
	 * -------------------------------------------------- */
	.app-header {
		padding: 1.75rem 1.5rem;
		border-bottom: 1px solid #1e293b;
	}
	.brand-container {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.brand-logo {
		font-size: 2rem;
	}
	.brand-title {
		color: #ffffff;
		font-size: 1.35rem;
		font-weight: 800;
		margin: 0;
		letter-spacing: -0.025em;
	}
	.brand-subtitle {
		color: #94a3b8;
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0;
	}

	/* --------------------------------------------------
	 * Navigational Taxonomy Stack Mechanics (Aged 55+ Focus Targets)
	 * -------------------------------------------------- */
	.nav-stack {
		flex: 1;
		padding: 1.25rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 1rem; /* Clear 16px row item isolation separations */
	}

	.nav-row-item {
		display: block;
		height: 64px; /* Hard target framework constraints */
		position: relative;
		text-decoration: none;
		background-color: transparent;
		border-radius: 8px;
		transition: background-color 0.15s ease;
		box-sizing: border-box;
	}

	.nav-row-content {
		height: 100%;
		display: flex;
		align-items: center;
		padding: 0 1rem; /* Generous 12px+ interior cushion pads */
		gap: 1rem;
	}

	.nav-icon {
		width: 28px;
		height: 28px;
		color: #94a3b8; /* Highly scannable visual anchors */
		flex-shrink: 0;
		transition: color 0.15s ease;
	}

	.nav-text-block {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.nav-label {
		color: #cbd5e1;
		font-size: 1.125rem; /* Strict 18px minimum structural rule text sizing scale */
		font-weight: 700;
		line-height: 1.2;
	}

	.nav-sublabel {
		color: #64748b;
		font-size: 0.8rem;
		font-weight: 500;
		margin-top: 0.1rem;
	}

	/* --------------------------------------------------
	 * Active / Focused State Architecture Changes
	 * -------------------------------------------------- */
	
	/* Multi-sensory Active State Transformations */
	.nav-row-item.active {
		background-color: #0d9488; /* High-contrast Primary Deep Teal Fill */
	}
	.nav-row-item.active .nav-label {
		color: #ffffff; /* Contrast text inversion */
	}
	.nav-row-item.active .nav-sublabel {
		color: #ccfbf1; /* Pastel contrast mix anchor text */
	}
	.nav-row-item.active .nav-icon {
		color: #ffffff;
	}

	/* Absolute Anchor Left Indicator Track Border Bar */
	.active-indicator-bar {
		position: absolute;
		left: 0;
		top: 12px;
		bottom: 12px;
		width: 4px;
		background-color: #f59e0b; /* High-visibility Amber Accent */
		border-radius: 0 4px 4px 0;
	}

	/* Accessible Keyboard Navigation Focusing Bounds Layer Override */
	.nav-row-item:focus-visible {
		outline: 3px solid #f97316; /* 3px Thick High Contrast Orange Frame */
		outline-offset: 4px;
		background-color: #1e293b;
	}

	/* High Contrast Numerical Alert Badge Marker */
	.alert-badge {
		background-color: #ef4444; /* Pure High Contrast Alert Crimson */
		color: #ffffff;
		font-size: 0.9rem;
		font-weight: 800;
		min-width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
		box-sizing: border-box;
		box-shadow: 0 2px 4px rgba(0,0,0,0.2);
	}

	/* --------------------------------------------------
	 * Identity Metadata Footer Section Profile Card
	 * -------------------------------------------------- */
	.patient-profile-footer {
		padding: 1.25rem 1rem;
		border-top: 1px solid #1e293b;
		background-color: #0b0f19;
	}
	.profile-card {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.avatar-capsule {
		width: 42px;
		height: 42px;
		background-color: #334155;
		color: #e2e8f0;
		border-radius: 50%;
		font-weight: 700;
		font-size: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border: 2px solid #475569;
	}
	.profile-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.profile-name {
		color: #f1f5f9;
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
	}
	.signout-trigger {
		color: #94a3b8;
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: underline;
		transition: color 0.1s ease;
	}
	.signout-trigger:hover, .signout-trigger:focus {
		color: #f43f5e; /* Prominent warning crimson tint */
		outline: none;
	}
	.signout-trigger:focus-visible {
		outline: 2px solid #f97316;
		outline-offset: 2px;
	}

	/* --------------------------------------------------
	 * Strict Responsive Safety Layout Adjustments
	 * -------------------------------------------------- */
	@media (max-width: 1024px) {
		/* Tablet & Smaller Layout Protection Viewport Bounds Safeguards */
		.viewport-root {
			flex-direction: column; /* Transitions cleanly to layered static stacks */
		}
		.sidebar-wrapper {
			width: 100%;
			height: auto;
			min-width: 100%;
			border-right: none;
			border-bottom: 2px solid #1e293b;
		}
		.nav-stack {
			flex-direction: row; /* Horizontal scannable strip arrays without disappearing controls */
			overflow-x: auto;
			padding: 0.75rem;
			gap: 0.5rem;
		}
		.nav-row-item {
			flex: 1;
			min-width: 200px;
			height: 56px;
		}
		.active-indicator-bar {
			left: 12px;
			right: 12px;
			top: auto;
			bottom: 0;
			width: auto;
			height: 3px;
			border-radius: 4px 4px 0 0;
		}
		.main-content-canvas {
			padding: 1.5rem;
		}
		.patient-profile-footer {
			display: none; /* Safely strips avatar footprint on mobile to keep action choices locked on page content layout views */
		}
	}
</style>