# frozen_string_literal: true

class ApplicationNotifier < Noticed::Event
  notification_methods do
    # Stable string the client switches on. `CareDue::WaterNotifier` →
    # `'care_due_water'`, `AchievementNotifier` → `'achievement'`. Keeps
    # client templates decoupled from Ruby class names + namespaces.
    def kind
      event.type.delete_suffix('Notifier').underscore.tr('/', '_')
    end

    # Subclasses override these. Defaults so `as_json` doesn't have to
    # care which subclass it's serializing.
    def title
      raise NotImplementedError, "#{self.class.name} must define title"
    end

    def meta = nil
    def url = nil

    def as_json(_options = {})
      {
        id: id,
        kind: kind,
        title: title,
        meta: meta,
        url: url,
        params: params,
        read_at: read_at,
        seen_at: seen_at,
        created_at: created_at
      }
    end
  end
end
