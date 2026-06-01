/**
 * @typedef {Object} JwtPayload
 * @property {string} id
 * @property {number} [iat]
 * @property {number} [exp]
 */

/**
 * @typedef {Object} SocketUser
 * @property {string} id
 * @property {"user"|"client"} role
 * @property {"User"|"Client"} model
 */

/**
 * @typedef {Object} NotificationPayload
 * @property {string} id
 * @property {string} type
 * @property {string} title
 * @property {string} message
 * @property {string|null|undefined} [targetId]
 * @property {string|null|undefined} [recipientProfileId]
 * @property {"read"|"unread"} status
 * @property {Object|null|undefined} [meta]
 * @property {string} createdAt
 */

export {};
