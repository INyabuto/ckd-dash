<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	// Svelte 5 Rune: Captures action return data dynamically (errors, presets)
	let { form }: { form: ActionData } = $props();

	// Svelte 5 Runes for managing accessible UI configuration states
	let showPassword = $state(false);
	let isSubmitting = $state(false);
</script>

<div class="login-viewport">
	<main class="login-card">
		<header class="login-header">
			<h1>CKD Dash</h1>
			<p>Sign in to access your clinical dashboard</p>
		</header>

		<!-- ARIA Live region: Screen readers instantly broadcast changes here -->
		<div id="auth-alert" aria-live="assertive" role="alert" class="alert-container">
			{#if form?.error}
				<div class="error-banner">
					<span class="error-icon" aria-hidden="true">⚠️</span>
					<p>{form.error}</p>
				</div>
			{/if}
		</div>

		<!-- Semantic standard HTML form processing leveraging secure progressive enhancement -->
		<form 
			method="POST" 
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					isSubmitting = false;
					await update();
				};
			}}
			class="auth-form"
		>
			<!-- Username / Email Field Box Container -->
			<div class="input-group">
				<label for="username" class="permanent-label">Username or Email Address</label>
				<input
					type="text"
					id="username"
					name="username"
					autocomplete="username"
					value={form?.username ?? ''}
					aria-describedby="auth-alert"
					class="accessible-input"
					inputmode="email"
				/>
			</div>

			<!-- Password Field Box Container -->
			<div class="input-group">
				<label for="password" class="permanent-label">Password</label>
				<div class="password-wrapper">
					<input
						type={showPassword ? 'text' : 'password'}
						id="password"
						name="password"
						autocomplete="current-password"
						aria-describedby="auth-alert"
						class="accessible-input password-input"
					/>
					
					<!-- Literal Control Copy Button (No cryptic eye icons) -->
					<button
						type="button"
						onclick={() => showPassword = !showPassword}
						class="password-toggle-btn"
						aria-label={showPassword ? 'Hide password' : 'Show password as plain text'}
					>
						{showPassword ? 'Hide' : 'Show'}
					</button>
				</div>
			</div>

			<!-- Primary Submit Form Action Button -->
			<button 
				type="submit" 
				disabled={isSubmitting} 
				class="submit-button"
			>
				{isSubmitting ? 'Verifying Credentials...' : 'Sign In securely'}
			</button>
		</form>
	</main>
</div>

<style>
	/* --- Accessible Design System Core Style Injections --- */

	:global(body) {
		background-color: #f1f5f9;
		margin: 0;
		padding: 0;
	}

	.login-viewport {
		display: flex;
		min-height: 100vh;
		align-items: center;
		justify-content: center;
		padding: 1.5rem; /* 24px outer clearance safety wrapper */
	}

	/* Layout persistence: Max 480px fixed width to mitigate eye-tracking fatigue */
	.login-card {
		background-color: #ffffff;
		width: 100%;
		max-width: 30rem; /* Equivalent to 480px at standard 16px baseline */
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
		padding: 2.5rem; /* Generous internal padding */
		box-sizing: border-box;
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	/* All text units declared in rem relative values to facilitate user text size browser overrides */
	.login-header h1 {
		font-family: sans-serif;
		font-size: 2.25rem;
		font-weight: 800;
		color: #0f172a; /* Strict high contrast ratio */
		margin: 0 0 0.5rem 0;
	}

	.login-header p {
		font-family: sans-serif;
		font-size: 1.125rem;
		color: #475569;
		margin: 0;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem; /* 24px vertical separation spacing to shield against adjacent accidental clicks */
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem; /* 8px fixed visual gap */
	}

	/* Permanent Visible Labels outside input nodes */
	.permanent-label {
		font-family: sans-serif;
		font-size: 1.125rem; /* Large font weight standard */
		font-weight: 700;
		color: #1e293b;
	}

	.password-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	/* The 56pt Rule Core Engine Enforcements */
	.accessible-input {
		width: 100%;
		height: 3.5rem; /* Exactly 56px high physical vertical boundary */
		box-sizing: border-box;
		border: 2px solid #94a3b8; /* Enhanced, high-contrast borders */
		border-radius: 0.5rem;
		padding: 0 1rem;
		font-family: sans-serif;
		/* Automatic zoom defusal: Prevent standard iOS/Android page-snapping view shifts */
		font-size: 1.25rem; 
		color: #0f172a;
		background-color: #ffffff;
	}

	.password-input {
		padding-right: 5rem; /* Create text boundary buffer safety */
	}

	/* Oversized Keyboard/Mouse Selection Focus Indicators (3px with visible offsets) */
	.accessible-input:focus, .password-toggle-btn:focus, .submit-button:focus {
		outline: 3px solid #d97706; /* High-visibility amber accent ring */
		outline-offset: 3px;
	}

	/* Literal Show/Hide Control Button */
	.password-toggle-btn {
		position: absolute;
		right: 4px;
		height: 3rem; /* 48px interior height box */
		min-width: 4.5rem;
		background-color: #f8fafc;
		border: 2px solid #cbd5e1;
		border-radius: 0.375rem;
		font-family: sans-serif;
		font-size: 1.125rem;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.password-toggle-btn:hover {
		background-color: #f1f5f9;
		border-color: #94a3b8;
	}

	/* Primary Call to Action Button Enforcements */
	.submit-button {
		height: 3.5rem; /* Exactly 56px high touch target layout */
		width: 100%;
		background-color: #1e3a8a; /* Avoided pure blue—used a deep high-contrast navy */
		color: #ffffff;
		border: none;
		border-radius: 0.5rem;
		font-family: sans-serif;
		font-size: 1.25rem;
		font-weight: 700;
		cursor: pointer;
		transition: background-color 0.15s ease;
		margin-top: 0.5rem;
	}

	.submit-button:hover:not(:disabled) {
		background-color: #172554;
	}

	.submit-button:disabled {
		background-color: #cbd5e1;
		color: #64748b;
		cursor: not-allowed;
	}

	/* Screen Reader and Visual Warning Announcement Regions */
	.alert-container {
		min-height: 0;
	}

	.error-banner {
		background-color: #fef2f2;
		border: 2px solid #ef4444; /* High visibility border layout */
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1.5rem;
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.error-icon {
		font-size: 1.25rem;
	}

	.error-banner p {
		font-family: sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: #991b1b;
		margin: 0;
	}
</style>