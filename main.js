const { InstanceBase, InstanceStatus, runEntrypoint, combineRgb, Regex } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')

const CHECKIN = 'checkin'

// 72x72 button image: the KnowCore mark top-centered, transparent lower half for the label text.
const LOGO_PNG64 =
	'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'

class KnowCoreInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.destinations = [] // [{ key }] from the server
		this.state = { target: CHECKIN, mode: null, churchName: null, expiresAt: null }
		this.pollTimer = null
	}

	async init(config) {
		this.config = config
		this.rebuildDefinitions()
		await this.startPolling()
	}

	async destroy() {
		this.stopPolling()
	}

	async configUpdated(config) {
		this.config = config
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
				type: 'textinput',
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
				default: 'https://checkin.knowcore.app',
				regex: Regex.SOMETHING,
			},
		]
	}

	// ── HTTP helpers ────────────────────────────────────────────────────────────

	baseUrl() {
		const server = (this.config.server || 'https://checkin.knowcore.app').trim().replace(/\/+$/, '')
		return `${server}/live/${encodeURIComponent((this.config.slug || '').trim())}/control`
	}

	async apiRequest(method, body) {
		const res = await fetch(this.baseUrl(), {
			method,
			headers: {
				Authorization: `Bearer ${(this.config.token || '').trim()}`,
				...(body ? { 'Content-Type': 'application/json' } : {}),
			},
			body: body ? JSON.stringify(body) : undefined,
			signal: AbortSignal.timeout(10000),
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

	// ── Polling ─────────────────────────────────────────────────────────────────

	async startPolling() {
		this.stopPolling()
		if (!this.config.slug || !this.config.token) {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter your church slug and control token')
			return
		}
		this.updateStatus(InstanceStatus.Connecting)
		await this.pollStatus()
		const interval = Math.min(300, Math.max(10, Number(this.config.pollInterval) || 10)) * 1000
		this.pollTimer = setInterval(() => {
			this.pollStatus().catch(() => {})
		}, interval)
	}

	stopPolling() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	async pollStatus() {
		try {
			const data = await this.apiRequest('GET')
			this.state = {
				target: data.target || CHECKIN,
				mode: data.mode || null,
				churchName: data.churchName || null,
				expiresAt: data.expiresAt || null,
			}
			const keys = (data.destinations || []).map((d) => d.key).filter(Boolean)
			if (JSON.stringify(keys) !== JSON.stringify(this.destinations.map((d) => d.key))) {
				this.destinations = keys.map((key) => ({ key }))
				this.rebuildDefinitions()
			}
			if (this.state.mode !== 'bitfocus') {
				this.updateStatus(
					InstanceStatus.UnknownWarning,
					`Connected, but NFC redirect mode is "${this.state.mode}" — set it to Bitfocus in Check-Ins → Tag Redirect`
				)
			} else {
				this.updateStatus(InstanceStatus.Ok)
			}
			this.refreshVariables()
			this.checkFeedbacks('target_active', 'redirect_live', 'checkin_active')
		} catch (err) {
			if (err.message === 'auth') {
				this.updateStatus(InstanceStatus.AuthenticationFailure, 'Invalid control token (or Bitfocus integration disabled)')
			} else if (err.message === 'notfound') {
				this.updateStatus(InstanceStatus.BadConfig, `No church found for slug "${this.config.slug}"`)
			} else {
				this.updateStatus(InstanceStatus.ConnectionFailure, String(err.message || err))
			}
		}
	}

	// ── Definitions (rebuilt when the destination list changes) ─────────────────

	destinationChoices() {
		return this.destinations.map((d) => ({ id: d.key, label: d.key }))
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
		const choices = this.destinationChoices()
		return {
			set_target: {
				name: 'Set tag destination',
				options: [
					{
						type: 'dropdown',
						id: 'target',
						label: 'Destination',
						choices: choices.length ? choices : [{ id: '', label: 'No destinations yet — add them in KnowCore (Check-Ins → Tag Redirect)' }],
						default: choices.length ? choices[0].id : '',
						allowCustom: true,
						tooltip: 'A destination name defined in KnowCore under Check-Ins → Tag Redirect',
					},
					{
						type: 'number',
						id: 'ttlMinutes',
						label: 'Auto-revert after (minutes)',
						default: 5,
						min: 1,
						max: 720,
						tooltip: 'Safety net: the redirect reverts to check-in on its own after this long',
					},
				],
				callback: async (event) => {
					const target = String(event.options.target || '').trim()
					if (!target) return
					const data = await this.apiRequest('POST', {
						target,
						ttlMinutes: Number(event.options.ttlMinutes) || 5,
					})
					this.state.target = data.target || target
					this.state.expiresAt = data.expiresAt || null
					this.refreshVariables()
					this.checkFeedbacks('target_active', 'redirect_live', 'checkin_active')
				},
			},
			toggle_target: {
				name: 'Toggle tag destination',
				description: 'Press to redirect taps to the destination; press again to revert to check-in',
				options: [
					{
						type: 'dropdown',
						id: 'target',
						label: 'Destination',
						choices: choices.length ? choices : [{ id: '', label: 'No destinations yet — add them in KnowCore (Check-Ins → Tag Redirect)' }],
						default: choices.length ? choices[0].id : '',
						allowCustom: true,
					},
					{
						type: 'number',
						id: 'ttlMinutes',
						label: 'Auto-revert after (minutes)',
						default: 5,
						min: 1,
						max: 720,
					},
				],
				callback: async (event) => {
					const target = String(event.options.target || '').trim()
					if (!target) return
					if (this.state.target === target) {
						await this.apiRequest('POST', { clear: true })
						this.state.target = CHECKIN
						this.state.expiresAt = null
					} else {
						const data = await this.apiRequest('POST', {
							target,
							ttlMinutes: Number(event.options.ttlMinutes) || 5,
						})
						this.state.target = data.target || target
						this.state.expiresAt = data.expiresAt || null
					}
					this.refreshVariables()
					this.checkFeedbacks('target_active', 'redirect_live', 'checkin_active')
				},
			},
			revert: {
				name: 'Revert to check-in',
				options: [],
				callback: async () => {
					await this.apiRequest('POST', { clear: true })
					this.state.target = CHECKIN
					this.state.expiresAt = null
					this.refreshVariables()
					this.checkFeedbacks('target_active', 'redirect_live', 'checkin_active')
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
