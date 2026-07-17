# frozen_string_literal: true

# Validates an Active Storage image attachment.
#
#   validates :avatar, attached_image: { max_bytes: 5.megabytes }
#
# Judges the blob's identified type rather than the one the upload
# declares: Active Storage takes content_type straight from the client
# and only sniffs the bytes later, on analyze, so validating the
# declaration validates nothing.
#
# Defence in depth, not a guarantee — Marcel falls back to the declared
# type for bytes it can't fingerprint (plain text has no magic number),
# so this catches a wrong file far more reliably than a hostile one.
# What actually stops a disguised upload executing is Active Storage
# serving blobs with nosniff.
class AttachedImageValidator < ActiveModel::EachValidator
  # What a browser will render as an image, mapped to how we name it in
  # an error. One hash so the message can't drift from the allow-list.
  # SVG stays out — it can carry script, and these are served back to
  # whoever views the record.
  CONTENT_TYPES = {
    'image/jpeg' => 'JPEG',
    'image/png' => 'PNG',
    'image/webp' => 'WebP',
    'image/heic' => 'HEIC'
  }.freeze

  # Without a cap the validator would quietly accept any size, so a
  # caller that forgets one is a bug rather than a default.
  def check_validity!
    return if options[:max_bytes].is_a?(Integer)

    raise ArgumentError, 'attached_image requires a max_bytes: option'
  end

  # Keyed on attachment_changes, not attached?, so saving an unrelated
  # attribute doesn't drag the existing blob in to re-check bytes that
  # haven't moved.
  def validate_each(record, attribute, value)
    return if record.attachment_changes[attribute.to_s].nil?

    # A change with no blob is the attachment being cleared, not replaced.
    blob = value.blob
    return if blob.nil?

    blob.identify unless blob.identified?

    record.errors.add(attribute, "must be a #{readable_types} image") unless CONTENT_TYPES.key?(blob.content_type)

    return if blob.byte_size <= options[:max_bytes]

    record.errors.add(attribute, "must be smaller than #{options[:max_bytes] / 1.megabyte}MB")
  end

  private def readable_types
    CONTENT_TYPES.values.to_sentence(two_words_connector: ' or ', last_word_connector: ' or ')
  end
end
