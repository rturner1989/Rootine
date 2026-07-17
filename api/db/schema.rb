# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_07_17_093427) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"

  create_table "achievements", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "earned_at", null: false
    t.string "kind", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "seen_at"
    t.bigint "source_id"
    t.string "source_type"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["earned_at"], name: "index_achievements_on_earned_at"
    t.index ["source_type", "source_id"], name: "index_achievements_on_source_type_and_source_id"
    t.index ["user_id", "kind", "source_type", "source_id"], name: "index_achievements_on_user_kind_source", unique: true, nulls_not_distinct: true
    t.index ["user_id", "seen_at"], name: "index_achievements_on_user_id_and_seen_at"
    t.index ["user_id"], name: "index_achievements_on_user_id"
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "care_logs", force: :cascade do |t|
    t.string "care_type", null: false
    t.datetime "created_at", null: false
    t.string "notes"
    t.datetime "performed_at", null: false
    t.bigint "plant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["plant_id", "performed_at"], name: "index_care_logs_on_plant_id_and_performed_at"
    t.index ["plant_id"], name: "index_care_logs_on_plant_id"
  end

  create_table "noticed_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "notifications_count"
    t.jsonb "params"
    t.bigint "record_id"
    t.string "record_type"
    t.string "type"
    t.datetime "updated_at", null: false
    t.index ["record_type", "record_id"], name: "index_noticed_events_on_record"
  end

  create_table "noticed_notifications", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "event_id", null: false
    t.datetime "read_at", precision: nil
    t.bigint "recipient_id", null: false
    t.string "recipient_type", null: false
    t.datetime "seen_at", precision: nil
    t.string "type"
    t.datetime "updated_at", null: false
    t.index ["event_id"], name: "index_noticed_notifications_on_event_id"
    t.index ["recipient_type", "recipient_id"], name: "index_noticed_notifications_on_recipient"
  end

  create_table "password_reset_tokens", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.datetime "used_at"
    t.bigint "user_id", null: false
    t.index ["token_digest"], name: "index_password_reset_tokens_on_token_digest", unique: true
    t.index ["user_id"], name: "index_password_reset_tokens_on_user_id"
  end

  create_table "plant_photos", force: :cascade do |t|
    t.string "caption"
    t.datetime "created_at", null: false
    t.bigint "plant_id", null: false
    t.datetime "taken_at", null: false
    t.datetime "updated_at", null: false
    t.index ["plant_id", "taken_at"], name: "index_plant_photos_on_plant_id_and_taken_at"
    t.index ["plant_id"], name: "index_plant_photos_on_plant_id"
  end

  create_table "plants", force: :cascade do |t|
    t.date "acquired_at"
    t.integer "calculated_feeding_days"
    t.integer "calculated_watering_days"
    t.datetime "created_at", null: false
    t.datetime "last_fed_at"
    t.datetime "last_watered_at"
    t.string "nickname", null: false
    t.text "notes"
    t.bigint "space_id", null: false
    t.bigint "species_id"
    t.datetime "updated_at", null: false
    t.index ["space_id"], name: "index_plants_on_space_id"
    t.index ["species_id"], name: "index_plants_on_species_id"
  end

  create_table "refresh_tokens", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.datetime "revoked_at"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["token_digest"], name: "index_refresh_tokens_on_token_digest", unique: true
    t.index ["user_id"], name: "index_refresh_tokens_on_user_id"
  end

  create_table "spaces", force: :cascade do |t|
    t.datetime "archived_at"
    t.string "category", default: "indoor", null: false
    t.datetime "created_at", null: false
    t.string "humidity_level", default: "average", null: false
    t.string "icon"
    t.string "light_level", default: "medium", null: false
    t.string "name", null: false
    t.integer "plants_count", default: 0, null: false
    t.string "temperature_level", default: "average", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index "user_id, lower((name)::text)", name: "index_spaces_on_user_id_and_lower_name", unique: true
    t.index ["user_id", "archived_at"], name: "index_spaces_on_user_id_and_archived_at"
    t.index ["user_id"], name: "index_spaces_on_user_id"
  end

  create_table "species", force: :cascade do |t|
    t.text "care_tips"
    t.string "common_name", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.datetime "details_synced_at"
    t.string "difficulty"
    t.string "external_id"
    t.integer "feeding_frequency_days"
    t.string "growth_rate"
    t.string "humidity_preference"
    t.string "image_url"
    t.string "light_requirement"
    t.string "personality", default: "chill", null: false
    t.boolean "popular", default: false, null: false
    t.string "scientific_name"
    t.string "source", default: "seed", null: false
    t.decimal "temperature_max", precision: 4, scale: 1
    t.decimal "temperature_min", precision: 4, scale: 1
    t.string "toxicity"
    t.datetime "updated_at", null: false
    t.integer "watering_frequency_days", null: false
    t.index ["common_name"], name: "index_species_on_common_name"
    t.index ["popular"], name: "index_species_on_popular", where: "(popular = true)"
    t.index ["scientific_name"], name: "index_species_on_scientific_name"
    t.index ["source", "external_id"], name: "index_species_on_source_and_external_id", unique: true, where: "(external_id IS NOT NULL)"
  end

  create_table "users", force: :cascade do |t|
    t.integer "care_logs_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.integer "current_care_streak_days", default: 0, null: false
    t.integer "current_login_streak_days", default: 0, null: false
    t.string "email", null: false
    t.date "last_care_logged_on"
    t.date "last_login_on"
    t.decimal "latitude", precision: 9, scale: 6
    t.string "location_label"
    t.integer "longest_care_streak_days", default: 0, null: false
    t.integer "longest_login_streak_days", default: 0, null: false
    t.decimal "longitude", precision: 9, scale: 6
    t.string "name", null: false
    t.boolean "notify_achievements", default: true, null: false
    t.boolean "notify_care_reminders", default: true, null: false
    t.datetime "onboarding_completed_at"
    t.string "onboarding_intent"
    t.integer "onboarding_step_reached", default: 0, null: false
    t.string "password_digest", null: false
    t.integer "plants_count", default: 0, null: false
    t.string "timezone", default: "UTC"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "achievements", "users"
  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "care_logs", "plants"
  add_foreign_key "password_reset_tokens", "users"
  add_foreign_key "plant_photos", "plants"
  add_foreign_key "plants", "spaces"
  add_foreign_key "plants", "species"
  add_foreign_key "refresh_tokens", "users"
  add_foreign_key "spaces", "users"
end
