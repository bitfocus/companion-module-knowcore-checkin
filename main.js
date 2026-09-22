const { InstanceBase, InstanceStatus, runEntrypoint, combineRgb, Regex } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')

const CHECKIN = 'checkin'
const DEFAULT_SERVER = 'https://checkin.knowcore.app'
const REQUEST_TIMEOUT_MS = 10000
const ALL_FEEDBACKS = ['target_active', 'redirect_live', 'checkin_active']

// 72x72 button image: the KnowCore mark top-centered, transparent lower half for the label text.
const LOGO_PNG64 =
	'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'

class KnowCoreInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.config = {}
		this.secrets = {}
		this.destinations = [] // [{ key }] from the server
		this.state = { target: CHECKIN, mode: null, churchName: null, expiresAt: null }
		this.pollTimer = null
		this.pollGeneration = 0 // bumped on every (re)start so a stale poll chain stops itself
		this.pollInFlight = null // the Promise of the poll currently running, if any
	}

	async init(config, _isFirstInit, secrets) {
		this.config = config || {}
		this.secrets = secrets || {}
		this.rebuildDefinitions()
		await this.startPolling()
	}

	async destroy() {
		this.stopPolling()
	}

	async configUpdated(config, secrets) {
		this.config = config || {}
		this.secrets = secrets || {}
		this.rebuildDefinitions()
		await this.startPolling()
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Setup',
				value:
					'In the KnowCore admin, open <b>Settings → Bitfocus</b> and generate a control token, then set your NFC redirect mode to <b>Bitfocus</b> under <b>Check-Ins → Tag Redirect</b>. Your church slug is the first part of your church address, e.g. <b>mychurch</b>.knowcore.app.',
			},
			{
				type: 'textinput',
				id: 'slug',
				label: 'Church slug',
				width: 6,
				required: true,
			},
			{
				type: 'secret-text',
				id: 'token',
				label: 'Control token',
				width: 6,
				required: true,
			},
			{
				type: 'number',
				id: 'pollInterval',
				label: 'Status poll interval (seconds)',
				width: 4,
				default: 10,
				min: 10,
				max: 300,
			},
			{
				type: 'textinput',
				id: 'server',
				label: 'Server URL (leave default unless told otherwise)',
				width: 8,
				default: DEFAULT_SERVER,
				regex: Regex.SOMETHING,
			},
		]
	}

	// ── Config accessors ────────────────────────────────────────────────────────

	slug() {
		return String(this.config.slug || '').trim()
	}

	token() {
		return String(this.secrets.token || '').trim()
	}

	baseUrl() {
		const server = String(this.config.server || DEFAULT_SERVER)
			.trim()
			.replace(/\/+$/, '')
		return `${server}/live/${encodeURIComponent(this.slug())}/control`
	}

	// ── HTTP ────────────────────────────────────────────────────────────────────

	async apiRequest(method, body) {
		const res = await fetch(this.baseUrl(), {
			method,
			headers: {
				Authorization: `Bearer ${this.token()}`,
				...(body ? { 'Content-Type': 'application/json' } : {}),
			},
			body: body ? JSON.stringify(body) : undefined,
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		})
		let data = null
		try {
			data = await res.json()
		} catch (_e) {
			// non-JSON response handled below
		}
		if (res.status === 401) throw new Error('auth')
		if (res.status === 404) throw new Error('notfound')
		if (!res.ok || !data || data.success !== true) {
			throw new Error((data && data.message) || `HTTP ${res.status}`)
		}
		return data
	}

	/** Map an API failure onto the connection status indicator. */
	handleApiError(err) {
		const message = String((err && err.message) || err)
		if (message === 'auth') {
			this.updateStatus(
				InstanceStatus.AuthenticationFailure,
				'Invalid control token (or Bitfocus integration disabled)',
			)
		} else if (message === 'notfound') {
			this.updateStatus(InstanceStatus.BadConfig, `No church found for slug "${this.slug()}"`)
		} else if (/timeout|abort/i.test(message)) {
			this.updateStatus(InstanceStatus.ConnectionFailure, 'KnowCore did not respond in time')
		} else {
			this.updateStatus(InstanceStatus.ConnectionFailure, message)
		}
		this.log('error', `KnowCore request failed: ${message}`)
	}

	/** Reflect a healthy server response in the status indicator. */
	setHealthyStatus() {
		if (this.state.mode !== 'bitfocus') {
			this.updateStatus(
				InstanceStatus.UnknownWarning,
				`Connected, but NFC redirect mode is "${this.state.mode}" — set it to Bitfocus in Check-Ins → Tag Redirect`,
			)
		} else {
			this.updateStatus(InstanceStatus.Ok)
		}
	}

	// ── State ───────────────────────────────────────────────────────────────────

	/** Absorb a control-API response (GET status or POST result) into local state. */
	applyState(data) {
		if (!data) return
		this.state = {
			target: data.target || CHECKIN,
			mode: data.mode !== undefined ? data.mode || null : this.state.mode,
			churchName: data.churchName !== undefined ? data.churchName || null : this.state.churchName,
			expiresAt: data.expiresAt !== undefined ? data.expiresAt || null : this.state.expiresAt,
		}
		if (Array.isArray(data.destinations)) {
			const keys = data.destinations.map((d) => d && d.key).filter(Boolean)
			if (JSON.stringify(keys) !== JSON.stringify(this.destinations.map((d) => d.key))) {
				this.destinations = keys.map((key) => ({ key }))
				this.rebuildDefinitions()
			}
		}
		this.refreshVariables()
		this.checkFeedbacks(...ALL_FEEDBACKS)
	}

	/**
	 * Fetch the live status from KnowCore and apply it. Concurrent callers share one in-flight
	 * request, so an action re-poll can never overlap a scheduled poll.
	 */
	fetchState() {
		if (this.pollInFlight) return this.pollInFlight
		this.pollInFlight = (async () => {
			try {
				const data = await this.apiRequest('GET')
				this.applyState(data)
				this.setHealthyStatus()
				return this.state
			} finally {
				this.pollInFlight = null
			}
		})()
		return this.pollInFlight
	}

	// ── Polling ─────────────────────────────────────────────────────────────────

	async startPolling() {
		this.stopPolling()
		if (!this.slug() || !this.token()) {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter your church slug and control token')
			return
		}
		this.updateStatus(InstanceStatus.Connecting)
		const generation = ++this.pollGeneration
		await this.pollOnce(generation)
	}

	stopPolling() {
		this.pollGeneration++ // orphans any chain that is mid-request
		if (this.pollTimer) {
			clearTimeout(this.pollTimer)
			this.pollTimer = null
		}
	}

	pollIntervalMs() {
		return Math.min(300, Math.max(10, Number(this.config.pollInterval) || 10)) * 1000
	}

	/**
	 * One poll, then schedule the next only after this one has fully finished (success or
	 * failure). A slow or timing-out request therefore delays the next tick instead of
	 * overlapping it.
	 */
	async pollOnce(generation) {
		try {
			await this.fetchState()
		} catch (err) {
			if (generation === this.pollGeneration) this.handleApiError(err)
		}
		if (generation !== this.pollGeneration) return // polling was stopped/restarted meanwhile
		this.pollTimer = setTimeout(() => {
			this.pollTimer = null
			this.pollOnce(generation).catch(() => {})
		}, this.pollIntervalMs())
	}

	/** Re-sync soon after an action, without waiting for the next scheduled tick. */
	resyncSoon() {
		this.fetchState().catch((err) => this.handleApiError(err))
	}

	// ── Actions ─────────────────────────────────────────────────────────────────

	/**
	 * Run an action's API call with consistent error handling: a failure updates the status
	 * indicator immediately and triggers a re-poll, so the operator sees the problem now rather
	 * than at the next scheduled poll.
	 */
	async runAction(label, fn) {
		try {
			await fn()
			this.setHealthyStatus()
		} catch (err) {
			this.handleApiError(err)
			this.log('warn', `${label} failed; re-syncing status from KnowCore`)
			this.resyncSoon()
		}
	}

	async setTarget(target, ttlMinutes) {
		const data = await this.apiRequest('POST', { target, ttlMinutes })
		this.applyState({ ...data, target: data.target || target })
	}

	async clearTarget() {
		const data = await this.apiRequest('POST', { clear: true })
		this.applyState({ ...data, target: data.target || CHECKIN, expiresAt: data.expiresAt || null })
	}

	// ── Definitions (rebuilt when the destination list changes) ─────────────────

	destinationChoices() {
		return this.destinations.map((d) => ({ id: d.key, label: d.key }))
	}

	destinationDropdown() {
		const choices = this.destinationChoices()
		return {
			type: 'dropdown',
			id: 'target',
			label: 'Destination',
			choices: choices.length
				? choices
				: [{ id: '', label: 'No destinations yet — add them in KnowCore (Check-Ins → Tag Redirect)' }],
			default: choices.length ? choices[0].id : '',
			allowCustom: true,
			tooltip: 'A destination name defined in KnowCore under Check-Ins → Tag Redirect',
		}
	}

	ttlField() {
		return {
			type: 'number',
			id: 'ttlMinutes',
			label: 'Auto-revert after (minutes)',
			default: 5,
			min: 1,
			max: 720,
			tooltip: 'Safety net: the redirect reverts to check-in on its own after this long',
		}
	}

	rebuildDefinitions() {
		this.setActionDefinitions(this.buildActions())
		this.setFeedbackDefinitions(this.buildFeedbacks())
		this.setVariableDefinitions([
			{ variableId: 'target', name: 'Current tag destination (checkin = normal check-in)' },
			{ variableId: 'church', name: 'Church name' },
			{ variableId: 'mode', name: 'NFC redirect mode' },
			{ variableId: 'expires_at', name: 'When the current push auto-reverts (ISO time)' },
		])
		this.setPresetDefinitions(this.buildPresets())
		this.refreshVariables()
	}

	refreshVariables() {
		this.setVariableValues({
			target: this.state.target,
			church: this.state.churchName || '',
			mode: this.state.mode || '',
			expires_at: this.state.expiresAt || '',
		})
	}

	buildActions() {
		return {
			set_target: {
				name: 'Set tag destination',
				options: [this.destinationDropdown(), this.ttlField()],
				callback: async (event) => {
					const target = String(event.options.target || '').trim()
					if (!target) return
					await this.runAction('Set tag destination', () =>
						this.setTarget(target, Number(event.options.ttlMinutes) || 5),
					)
				},
			},
			toggle_target: {
				name: 'Toggle tag destination',
				description: 'Press to redirect taps to the destination; press again to revert to check-in',
				options: [this.destinationDropdown(), this.ttlField()],
				callback: async (event) => {
					const target = String(event.options.target || '').trim()
					if (!target) return
					await this.runAction('Toggle tag destination', async () => {
						// Decide from KnowCore's *current* target, not the last poll: the dashboard or
						// another operator may have changed it since, and toggling on stale state would
						// do the opposite of what the operator expects.
						const fresh = await this.fetchState()
						if (fresh.target === target) {
							await this.clearTarget()
						} else {
							await this.setTarget(target, Number(event.options.ttlMinutes) || 5)
						}
					})
				},
			},
			revert: {
				name: 'Revert to check-in',
				options: [],
				callback: async () => {
					await this.runAction('Revert to check-in', () => this.clearTarget())
				},
			},
		}
	}

	buildFeedbacks() {
		const choices = this.destinationChoices()
		return {
			target_active: {
				type: 'boolean',
				name: 'Destination is active',
				description: 'True while tag taps are being redirected to the chosen destination',
				defaultStyle: {
					bgcolor: combineRgb(0, 153, 68),
					color: combineRgb(255, 255, 255),
				},
				options: [
					{
						type: 'dropdown',
						id: 'target',
						label: 'Destination',
						choices: choices.length ? choices : [{ id: '', label: 'No destinations yet' }],
						default: choices.length ? choices[0].id : '',
						allowCustom: true,
					},
				],
				callback: (feedback) => this.state.target === String(feedback.options.target || '').trim(),
			},
			checkin_active: {
				type: 'boolean',
				name: 'Check-in is active (no redirect)',
				description: 'True while tag taps behave normally (no redirect is active)',
				defaultStyle: {
					bgcolor: combineRgb(0, 153, 68),
					color: combineRgb(255, 255, 255),
				},
				options: [],
				callback: () => this.state.target === CHECKIN,
			},
			redirect_live: {
				type: 'boolean',
				name: 'Any redirect is active',
				description: 'True while tag taps go anywhere other than normal check-in',
				defaultStyle: {
					bgcolor: combineRgb(153, 0, 0),
					color: combineRgb(255, 255, 255),
				},
				options: [],
				callback: () => this.state.target !== CHECKIN,
			},
		}
	}

	buildPresets() {
		const presets = {}
		for (const d of this.destinations) {
			presets[`goto_${d.key}`] = {
				type: 'button',
				category: 'Destinations',
				name: `Tags → ${d.key}`,
				style: {
					text: d.key,
					size: '14',
					alignment: 'center:bottom',
					png64: LOGO_PNG64,
					pngalignment: 'center:top',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [{ actionId: 'toggle_target', options: { target: d.key, ttlMinutes: 5 } }],
						up: [],
					},
				],
				feedbacks: [
					{
						feedbackId: 'target_active',
						options: { target: d.key },
						style: { bgcolor: combineRgb(0, 153, 68), color: combineRgb(255, 255, 255) },
					},
				],
			}
		}
		presets['revert_checkin'] = {
			type: 'button',
			category: 'Destinations',
			name: 'Tags → Check-In',
			style: {
				text: 'Check-In',
				size: '14',
				alignment: 'center:bottom',
				png64: LOGO_PNG64,
				pngalignment: 'center:top',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: 'revert', options: {} }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'checkin_active',
					options: {},
					style: { bgcolor: combineRgb(0, 153, 68), color: combineRgb(255, 255, 255) },
				},
			],
		}
		return presets
	}
}

runEntrypoint(KnowCoreInstance, UpgradeScripts)
