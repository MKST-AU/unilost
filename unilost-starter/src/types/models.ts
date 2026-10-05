export interface CategoryInput {
  name: string;
  description?: string;
}

export interface Category extends CategoryInput {
  _id: string;
}

export interface LocationInput {
  name: string;
  building: string;
  description?: string;
}

export interface Location extends LocationInput {
  _id: string;
}
