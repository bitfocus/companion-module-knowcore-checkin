const { InstanceBase, InstanceStatus, runEntrypoint, combineRgb, Regex } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')

const CHECKIN = 'checkin'

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
				default: 30,
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
		const interval = Math.min(300, Math.max(10, Number(this.config.pollInterval) || 30)) * 1000
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
					text: `Tags →\n${d.key}`,
					size: 'auto',
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
				text: 'Tags →\nCheck-In',
				size: 'auto',
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
