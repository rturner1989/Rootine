# frozen_string_literal: true

require 'test_helper'

class PlantPhotoTest < ActiveSupport::TestCase
  include ActionDispatch::TestProcess::FixtureFile

  setup do
    @plant = plants(:sir_plantalot)
  end

  test 'valid photo with image attached' do
    photo = build_photo
    assert photo.valid?
  end

  test 'requires image' do
    photo = @plant.plant_photos.new
    assert_not photo.valid?
    assert_includes photo.errors[:image], "can't be blank"
  end

  test 'defaults taken_at to now when not specified' do
    photo = build_photo
    photo.save!

    assert_in_delta Time.current, photo.taken_at, 2.seconds
  end

  test 'accepts custom taken_at' do
    time = 1.week.ago
    photo = build_photo(taken_at: time)
    photo.save!

    assert_in_delta time, photo.taken_at, 2.seconds
  end

  test 'accepts caption' do
    photo = build_photo(caption: 'Looking good!')
    photo.save!

    assert_equal 'Looking good!', photo.caption
  end

  test 'chronological scope orders by taken_at descending' do
    @plant.plant_photos.create!(
      taken_at: 1.week.ago,
      image: fixture_image
    )
    @plant.plant_photos.create!(
      taken_at: 1.day.ago,
      image: fixture_image
    )

    photos = @plant.plant_photos.chronological
    assert photos.first.taken_at > photos.last.taken_at
  end

  test 'destroying plant destroys photos' do
    build_photo.save!

    assert_difference('PlantPhoto.count', -1) do
      @plant.destroy
    end
  end

  test 'accepts a real image' do
    assert build_photo.valid?
  end

  # The upload declares image/jpeg and is really a GIF. Active Storage
  # takes content_type from the declaration, so without an explicit
  # identify this would pass on the client's word alone.
  test 'image is judged on its bytes, not the content type it claims' do
    photo = @plant.plant_photos.new(image: fixture_file_upload('tiny.gif', 'image/jpeg'))

    assert_not photo.valid?
    assert_includes photo.errors[:image], 'must be a JPEG, PNG, WebP or HEIC image'
  end

  test 'rejects an image over the size cap' do
    oversized = StringIO.new(file_fixture('test_plant.jpg').binread + ('x' * PlantPhoto::IMAGE_MAX_BYTES))
    photo = @plant.plant_photos.new
    photo.image.attach(io: oversized, filename: 'huge.jpg', content_type: 'image/jpeg')

    assert_not photo.valid?
    assert_includes photo.errors[:image], "must be smaller than #{PlantPhoto::IMAGE_MAX_BYTES / 1.megabyte}MB"
  end

  # Photos predate this validation, so some already on disk would fail it.
  # Editing one for an unrelated reason must not re-judge bytes that
  # haven't moved, or captioning an old photo would become impossible.
  test 'editing a photo that predates the rules does not re-judge its image' do
    # A GIF — rejected on attach, per the test above. Saved unvalidated to
    # stand in for a row written before the rules existed. taken_at is
    # supplied because save(validate: false) skips its callback too.
    photo = @plant.plant_photos.new(image: fixture_file_upload('tiny.gif', 'image/jpeg'), taken_at: Time.current)
    photo.save!(validate: false)

    photo.reload.caption = 'Captioned years later'

    assert photo.valid?, 'an untouched attachment should not be re-judged'
    assert photo.save
  end

  private def build_photo(**attrs)
    @plant.plant_photos.new(image: fixture_image, **attrs)
  end

  private def fixture_image
    fixture_file_upload('test_plant.jpg', 'image/jpeg')
  end
end
