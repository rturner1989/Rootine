# frozen_string_literal: true

Rails.application.routes.draw do
  require 'sidekiq/web'

  Sidekiq::Web.use(ActionDispatch::Cookies)
  Sidekiq::Web.use(ActionDispatch::Session::CookieStore, key: '_sidekiq_session')
  mount Sidekiq::Web => '/sidekiq'

  # Dev-only: browse outbound email at /letter_opener. Production swaps the
  # delivery method to real SMTP, which means this mount never runs there.
  mount LetterOpenerWeb::Engine, at: '/letter_opener' if Rails.env.development?

  # Mounted under /api/v1 so the refresh_token cookie (path-scoped to
  # /api/v1) reaches the cable upgrade request. Default /cable would not
  # receive the cookie and the connection would reject every client.
  mount ActionCable.server => '/api/v1/cable'

  namespace :api do
    namespace :v1 do
      resource :registration, only: [:create]
      resource :session, only: [:create, :destroy]
      resource :token, only: [:create]

      resources :password_resets, only: [:create, :update]

      namespace :spaces do
        resources :presets, only: :index
      end
      resources :spaces, only: [:index, :show, :create, :update, :destroy] do
        scope module: :spaces do
          resource :archive, only: [:create, :destroy]
        end
      end
      resources :plants, only: [:index, :show, :create, :update, :destroy] do
        scope module: :plants do
          resources :care_logs, only: [:index, :create]
          resources :plant_photos, only: [:index, :create, :destroy]
        end
      end
      resources :species, only: [:index, :show]

      resource :dashboard, only: [:show], controller: 'dashboard'
      resource :weather, only: [:show], controller: 'weather'
      resources :achievements, only: [:index, :update]
      namespace :achievements do
        resource :unseen, only: [:show], controller: 'unseen'
      end

      resource :profile, only: [:show, :update], controller: 'profiles' do
        scope module: :profile do
          resource :password, only: [:update]
        end
      end

      namespace :onboarding do
        resource :completion, only: :create
      end

      resources :notifications, only: [:index, :update]
      resource :notifications_seen, only: [:create], controller: 'notifications_seen'

      get 'journal', to: 'journal#index'
      namespace :journal do
        resource :calendar, only: [:show], controller: 'calendar'
      end
      resources :photos, only: [:index]
    end
  end

  get 'up' => 'rails/health#show', as: :rails_health_check
end
