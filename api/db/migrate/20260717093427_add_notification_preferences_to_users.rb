# frozen_string_literal: true

class AddNotificationPreferencesToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :notify_care_reminders, :boolean, default: true, null: false
    add_column :users, :notify_achievements, :boolean, default: true, null: false
  end
end
