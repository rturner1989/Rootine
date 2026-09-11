import { describe, expect, it } from 'vitest'
import { photoFeedResponseSchema } from '../../src/types/plantPhoto'
import photoFeedFixture from '../fixtures/api/photo-feed.json'

// Captured live from GET /api/v1/photos for a user with 6 photos (under the
// 30-item page limit), so next_cursor comes back null on a real, unforced
// last page — not fabricated to hit the falsy branch.
describe('photoFeedResponseSchema', () => {
  it('parses a real feed page with a null next_cursor', () => {
    expect(photoFeedFixture.next_cursor).toBeNull()
    expect(photoFeedResponseSchema.safeParse(photoFeedFixture).success).toBe(true)
  })

  it('rejects when a photo item has no plant — PhotoFeed#payload always nests one', () => {
    const broken = {
      ...photoFeedFixture,
      photos: photoFeedFixture.photos.map(({ plant: _plant, ...rest }) => rest),
    }
    expect(photoFeedResponseSchema.safeParse(broken).success).toBe(false)
  })
})
