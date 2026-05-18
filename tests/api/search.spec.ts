import { expect, test } from '@playwright/test';

test.describe('search api', () => {
  test('returns a fallback-friendly search response', async ({ request }) => {
    const response = await request.post('/api/search', {
      data: {
        query: 'VisionFlow',
      },
    });

    expect(response.ok()).toBe(true);

    const body = await response.json();

    expect(body).toEqual(
      expect.objectContaining({
        answer: expect.any(String),
        provider: expect.any(String),
        sources: expect.objectContaining({
          contacts: expect.any(Array),
          faqs: expect.any(Array),
          notices: expect.any(Array),
          qnas: expect.any(Array),
          works: expect.any(Array),
        }),
      }),
    );
  });

  test('rejects empty search requests', async ({ request }) => {
    const response = await request.post('/api/search', {
      data: {
        query: '',
      },
    });

    expect(response.status()).toBe(400);
  });
});
