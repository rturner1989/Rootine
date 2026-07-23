class AddPoisonousToPetsToSpecies < ActiveRecord::Migration[8.1]
  def change
    add_column :species, :poisonous_to_pets, :boolean
  end
end
