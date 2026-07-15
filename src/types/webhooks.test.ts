import { describe, expect, it } from 'bun:test';
import { acknowledgeWebhook } from './webhooks.js';
import type { WebhookStatusNotification } from './webhooks.js';

describe('webhooks', () => {
  it('acknowledgeWebhook returns the exact shape TerraPay expects', () => {
    expect(acknowledgeWebhook()).toEqual({ acknowledged: 'true' });
  });

  it("WebhookStatusNotification accepts TerraPay's documented callback payload", () => {
    const payload: WebhookStatusNotification = {
      transactionId: 'TP1W000001791452',
      partnerTransId: '8001491986040558681980929',
      responseCode: '3000',
      responseMsg: 'Remit Success',
      status: 'SUCCESS',
    };
    expect(payload.status).toBe('SUCCESS');
  });
});
