/**
 * Payload TerraPay POSTs to the partner's status-notification callback
 * endpoint as a transaction's status changes.
 *
 * TerraPay does NOT sign these callbacks — there is no HMAC/signature header
 * to verify. Authenticity relies entirely on IP-allowlisting the partner
 * configures at their own edge (load balancer / firewall), not on anything
 * this SDK (or TerraPay) can verify from the payload itself.
 */
export interface WebhookStatusNotification {
  transactionId?: string;
  partnerTransId?: string;
  responseCode?: string;
  responseMsg?: string;
  status?: string;
}

/** Body TerraPay expects back from the partner's callback endpoint. */
export interface WebhookAcknowledgement {
  acknowledged: 'true' | 'false';
}

/**
 * Builds the acknowledgement TerraPay expects in response to a
 * {@link WebhookStatusNotification} — `{ acknowledged: "true" }`. Note
 * TerraPay's own example sends this as the string `"true"`, not a boolean.
 */
export function acknowledgeWebhook(): WebhookAcknowledgement {
  return { acknowledged: 'true' };
}
