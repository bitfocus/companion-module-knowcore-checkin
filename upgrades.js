// Upgrade scripts run when a user updates the module, to migrate old config/actions/secrets.

/**
 * v1.0.6: the control token moved from a plain `textinput` config field to a `secret-text`
 * field, which Companion stores in the secrets store rather than the (exported, visible) config.
 * Move any token still sitting in config over to secrets and drop it from config.
 */
function moveTokenToSecrets(_context, props) {
	const result = { updatedConfig: null, updatedActions: [], updatedFeedbacks: [] }
	const config = props.config
	if (config && typeof config.token === 'string' && config.token.length > 0) {
		const secrets = { ...(props.secrets || {}) }
		if (!secrets.token) secrets.token = config.token
		const newConfig = { ...config }
		delete newConfig.token
		result.updatedConfig = newConfig
		result.updatedSecrets = secrets
	}
	return result
}

module.exports = [moveTokenToSecrets]
